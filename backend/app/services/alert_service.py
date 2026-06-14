import uuid
import re
from datetime import datetime, timedelta, time
from boto3.dynamodb.conditions import Attr
from app.services import dynamodb_service
from app.config import settings

def clean_extracted_value(val: str) -> str:
    """Helper to clean extracted date/time strings from markdown."""
    val = re.sub(r"[*_#]", "", val)
    if "-" in val:
        val = val.split("-")[0]
    if "to" in val.lower():
        val = re.split(r"\bto\b", val, flags=re.IGNORECASE)[0]
    val = re.sub(r"\(.*?\)", "", val)
    return val.strip()

def extract_notice_datetime(summary: str) -> datetime:
    """Parses date and time from notice summary and combines them."""
    if not summary:
        return None
    date_str = None
    time_str = None
    for line in summary.split("\n"):
        line_stripped = line.strip()
        if not date_str:
            m = re.search(r"(?i)\bdate\b\s*:?\s*(.*)", line_stripped)
            if m:
                date_str = clean_extracted_value(m.group(1))
        if not time_str:
            m = re.search(r"(?i)\btime\b\s*:?\s*(.*)", line_stripped)
            if m:
                time_str = clean_extracted_value(m.group(1))

    if not date_str:
        return None

    parsed_date = None
    date_fmts = ["%d %B %Y", "%d %b %Y", "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"]
    for fmt in date_fmts:
        try:
            parsed_date = datetime.strptime(date_str, fmt).date()
            break
        except ValueError:
            continue
    if not parsed_date:
        return None

    parsed_time = None
    if time_str:
        try:
            parsed_time = parse_time_str(time_str)
        except Exception:
            pass
    if not parsed_time:
        # Default fallback: 09:00 AM
        parsed_time = datetime.strptime("09:00 AM", "%I:%M %p").time()

    return datetime.combine(parsed_date, parsed_time)

def extract_meal_food(summary: str, day: str, meal: str) -> str:
    """Extracts the food items for a specific day and meal from the mess menu."""
    if not summary:
        return ""
    lines = summary.split("\n")
    in_day_block = False
    target_day = day.strip().lower()
    
    for line in lines:
        line_stripped = line.strip()
        cleaned_line = re.sub(r"[^a-zA-Z]", "", line_stripped).lower()
        
        days_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        if cleaned_line in days_of_week:
            if cleaned_line == target_day:
                in_day_block = True
            else:
                in_day_block = False
                
        if in_day_block:
            m = re.search(r"(?i)\b" + re.escape(meal) + r"\b\s*:\s*(.*)", line_stripped)
            if m:
                food = m.group(1).strip()
                food = re.sub(r"[*_#]", "", food).strip()
                return food
    return ""

def parse_time_from_str(s: str) -> time:
    """Helper to parse raw time string like '8:00 AM', '13:00', '8 PM', '8' into a time object."""
    s = s.strip().upper()
    # Simple hour only with AM/PM like "8 AM" -> "8:00 AM"
    m_simple = re.match(r"^(\d{1,2})\s*(AM|PM)$", s)
    if m_simple:
        s = f"{m_simple.group(1)}:00 {m_simple.group(2)}"
    
    # Hour only without AM/PM like "8" -> "8:00"
    m_hour_only = re.match(r"^(\d{1,2})$", s)
    if m_hour_only:
        s = f"{m_hour_only.group(1)}:00"
        
    for fmt in ("%I:%M %p", "%H:%M", "%I %p", "%H"):
        try:
            return datetime.strptime(s, fmt).time()
        except Exception:
            continue
    return None

def extract_meal_timing(summary: str, meal: str) -> tuple[str, time]:
    """Extracts meal timing display string and parsed start time from the summary."""
    defaults = {
        "breakfast": ("08:00 AM - 09:30 AM", time(8, 0)),
        "lunch": ("01:00 PM - 02:30 PM", time(13, 0)),
        "dinner": ("08:00 PM - 09:30 PM", time(20, 0))
    }
    meal_lower = meal.lower()
    default_display, default_start = defaults.get(meal_lower, ("08:00 AM", time(8, 0)))
    
    if not summary:
        return default_display, default_start
        
    lines = summary.split("\n")
    for line in lines:
        if re.search(r"(?i)\b" + re.escape(meal) + r"\b", line):
            # Regex to match time range pattern like: 08:00 AM - 09:30 AM or 1:00 PM to 2:00 PM
            time_pat = r"\b\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b"
            range_match = re.search(r"(" + time_pat + r")\s*[-–to]+\s*(" + time_pat + r")", line)
            if range_match:
                start_str = range_match.group(1).strip()
                end_str = range_match.group(2).strip()
                # Propagate AM/PM if only one side has it
                if "am" in end_str.lower() and "am" not in start_str.lower() and "pm" not in start_str.lower():
                    start_str += " AM"
                elif "pm" in end_str.lower() and "am" not in start_str.lower() and "pm" not in start_str.lower():
                    start_str += " PM"
                
                parsed_start = parse_time_from_str(start_str)
                if parsed_start:
                    return f"{start_str} - {end_str}", parsed_start
            
            # Look for a single time
            single_match = re.search(r"(" + time_pat + r")", line)
            if single_match:
                start_str = single_match.group(1).strip()
                parsed_start = parse_time_from_str(start_str)
                if parsed_start:
                    return start_str, parsed_start
                    
    return default_display, default_start

def parse_time_str(time_str: str) -> datetime.time:

    """Helper to parse time in '09:00 AM' or '14:30' formats."""
    time_str = time_str.strip().upper()
    try:
        if "AM" in time_str or "PM" in time_str:
            t = datetime.strptime(time_str, "%I:%M %p")
        else:
            t = datetime.strptime(time_str, "%H:%M")
        return t.time()
    except Exception:
        # Fallback to midnight
        return datetime.strptime("00:00", "%H:%M").time()

def parse_due_date(due_date_str: str) -> datetime:
    """Parses due date strings from deadlines."""
    due_date_str = due_date_str.strip()
    # If contains T or space, parse fully
    if "T" in due_date_str:
        try:
            return datetime.fromisoformat(due_date_str.replace("Z", ""))
        except ValueError:
            pass
    if " " in due_date_str:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
            try:
                return datetime.strptime(due_date_str, fmt)
            except ValueError:
                pass
    # Date only, assume 23:59:00 of that day
    try:
        dt = datetime.strptime(due_date_str[:10], "%Y-%m-%d")
        return dt.replace(hour=23, minute=59, second=0)
    except ValueError:
        # Fallback to today 23:59
        return datetime.now().replace(hour=23, minute=59, second=0)

def alert_exists(student_id: str, source_id: str) -> bool:
    """Check if an alert with this source_id has already been created."""
    items = dynamodb_service.scan_items(
        settings.dynamodb_students_table,
        filter_expression=Attr("student_id").eq(student_id) & Attr("type").eq("alert") & Attr("source_id").eq(source_id)
    )
    return len(items) > 0

def create_alert(student_id: str, alert_type: str, title: str, message: str, timestamp: str, source_id: str):
    """Inserts a new alert record into the students DynamoDB table."""
    item = {
        "id": str(uuid.uuid4()),
        "student_id": student_id,
        "type": "alert",
        "alert_type": alert_type,  # "class", "event", "assignment", "project", "exam"
        "title": title,
        "message": message,
        "timestamp": timestamp,  # ISO format
        "read": False,
        "source_id": source_id,
        "created_at": datetime.utcnow().isoformat(),
    }
    dynamodb_service.put_item(settings.dynamodb_students_table, item)
    return item

def generate_alerts(student_id: str = "default_student") -> list:
    """Scans all schedules, events, and deadlines to generate alerts.
    
    Generates alerts when an item is exactly 30 minutes (29-31 min) away.
    """
    now = datetime.now()
    generated_alerts = []

    # 1. Check Weekly Classes and Events (Schedules Table)
    schedules = dynamodb_service.scan_items(
        settings.dynamodb_schedules_table,
        filter_expression=Attr("student_id").eq(student_id)
    )

    for s in schedules:
        is_one_time = s.get("is_one_time", False)
        day = s.get("day", "").strip()
        time_str = s.get("time", "").strip()
        if not time_str:
            continue

        item_time = parse_time_str(time_str)

        if is_one_time:
            # Event: specific date
            date_str = s.get("date", "").strip()
            if not date_str:
                continue
            try:
                event_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                event_dt = datetime.combine(event_date, item_time)
                diff = (event_dt - now).total_seconds() / 60.0
                
                if 29.0 <= diff <= 31.0:
                    source_id = f"event_{s['id']}"
                    if not alert_exists(student_id, source_id):
                        alert = create_alert(
                            student_id=student_id,
                            alert_type="event",
                            title=s.get("subject", "Upcoming Event"),
                            message=f"{s.get('subject')} starts in 30 minutes.",
                            timestamp=event_dt.isoformat(),
                            source_id=source_id
                        )
                        generated_alerts.append(alert)
            except Exception:
                pass
        else:
            # Recurring Class: matches day of the week
            if day.lower() == now.strftime("%A").lower():
                class_dt = datetime.combine(now.date(), item_time)
                diff = (class_dt - now).total_seconds() / 60.0

                if 29.0 <= diff <= 31.0:
                    source_id = f"class_{s['id']}_{now.strftime('%Y-%m-%d')}"
                    if not alert_exists(student_id, source_id):
                        alert = create_alert(
                            student_id=student_id,
                            alert_type="class",
                            title=f"{s.get('subject', 'Class')}",
                            message=f"{s.get('subject')} class starts in 30 minutes.",
                            timestamp=class_dt.isoformat(),
                            source_id=source_id
                        )
                        generated_alerts.append(alert)

    # 2. Check Deadlines (Deadlines Table)
    deadlines = dynamodb_service.scan_items(
        settings.dynamodb_deadlines_table,
        filter_expression=Attr("student_id").eq(student_id) & Attr("completed").eq(False)
    )

    for d in deadlines:
        due_date_str = d.get("due_date", "").strip()
        if not due_date_str:
            continue

        due_dt = parse_due_date(due_date_str)
        diff = (due_dt - now).total_seconds() / 60.0

        if 29.0 <= diff <= 31.0:
            source_id = f"deadline_{d['id']}"
            if not alert_exists(student_id, source_id):
                dtype = d.get("type", "assignment").lower()
                
                # Determine title, alert_type, message
                if dtype == "assignment":
                    alert_type = "assignment"
                    title = "Assignment Deadline"
                    message = f"{d.get('title')} deadline is in 30 minutes."
                elif dtype == "project":
                    alert_type = "project"
                    title = "Project Deadline"
                    message = f"{d.get('title')} deadline is in 30 minutes."
                elif dtype == "exam":
                    alert_type = "exam"
                    title = "Exam Reminder"
                    message = f"{d.get('title')} is in 30 minutes."
                else:
                    alert_type = "assignment"
                    title = "Deadline Reminder"
                    message = f"{d.get('title')} is in 30 minutes."

                alert = create_alert(
                    student_id=student_id,
                    alert_type=alert_type,
                    title=title,
                    message=message,
                    timestamp=due_dt.isoformat(),
                    source_id=source_id
                )
                generated_alerts.append(alert)

    # 3. Check Notices (type = "notice") for 24h Alerts and Mess Menu Alerts
    try:
        notices = dynamodb_service.scan_items(
            settings.dynamodb_students_table,
            filter_expression=Attr("student_id").eq(student_id) & Attr("type").eq("notice")
        )
    except Exception as e:
        print(f"Error scanning notices in generate_alerts: {e}")
        notices = []

    for item in notices:
        is_mess = item.get("is_mess") or "mess" in item.get("title", "").lower()
        if is_mess:
            # Handle Mess Menu meal reminders
            try:
                summary = item.get("summary", "")
                day_str = now.strftime("%A")
                
                meal_names = ["Breakfast", "Lunch", "Dinner"]
                
                for meal_name in meal_names:
                    display_range, t_val = extract_meal_timing(summary, meal_name)
                    meal_dt = datetime.combine(now.date(), t_val)
                    diff = (meal_dt - now).total_seconds() / 60.0
                    
                    # Alert if within a 5-minute window around the meal time
                    if -5.0 <= diff <= 5.0:
                        source_id = f"mess_{meal_name}_{now.strftime('%Y-%m-%d')}"
                        if not alert_exists(student_id, source_id):
                            food = extract_meal_food(summary, day_str, meal_name)
                            if food:
                                title = f"Meal Time: {meal_name}"
                                message = f"It's time for {meal_name}! Today's menu: {food}."
                                alert = create_alert(
                                    student_id=student_id,
                                    alert_type="event",
                                    title=title,
                                    message=message,
                                    timestamp=meal_dt.isoformat(),
                                    source_id=source_id
                                )
                                generated_alerts.append(alert)
            except Exception as ex:
                print(f"Error processing mess menu {item.get('id')} for alert: {ex}")
        else:
            # Handle Standard Notice 24h reminders
            try:
                summary = item.get("summary", "")
                event_dt = extract_notice_datetime(summary)
                if event_dt:
                    diff = (event_dt - now).total_seconds() / 60.0
                    # Alert if event starts in approx 24 hours (1435 to 1445 minutes)
                    if 1435.0 <= diff <= 1445.0:
                        source_id = f"notice_24h_{item['id']}"
                        if not alert_exists(student_id, source_id):
                            title = f"Upcoming Event: {item.get('title', 'Notice')}"
                            message = f"The event \"{item.get('title', 'Notice')}\" starts in 24 hours (at {event_dt.strftime('%I:%M %p')})."
                            alert = create_alert(
                                student_id=student_id,
                                alert_type="event",
                                title=title,
                                message=message,
                                timestamp=event_dt.isoformat(),
                                source_id=source_id
                            )
                            generated_alerts.append(alert)
            except Exception as ex:
                print(f"Error processing notice {item.get('id')} for alert: {ex}")

    return generated_alerts

