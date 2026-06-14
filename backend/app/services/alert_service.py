import uuid
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Attr
from app.services import dynamodb_service
from app.config import settings

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

    return generated_alerts
