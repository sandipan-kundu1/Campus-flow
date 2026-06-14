import google.generativeai as genai
from app.config import settings

MODEL = "gemini-2.5-flash"
active_key_index = 0

def get_api_keys() -> list[str]:
    """Retrieves all non-empty API keys configured by the user."""
    keys = [
        settings.gemini_api_key_1,
        settings.gemini_api_key_2,
        settings.gemini_api_key_3
    ]
    keys = [k.strip() for k in keys if k and k.strip()]
    if not keys and settings.gemini_api_key:
        keys = [settings.gemini_api_key.strip()]
    return keys

def chat_completion(messages: list[dict], temperature: float = 0.7, max_tokens: int = 1024) -> str:
    global active_key_index
    keys = get_api_keys()
    if not keys:
        raise ValueError("No Gemini API keys configured.")
        
    system_instruction = None
    history = []
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        elif msg["role"] == "user":
            history.append({"role": "user", "parts": [msg["content"]]})
        elif msg["role"] == "assistant":
            history.append({"role": "model", "parts": [msg["content"]]})
    
    model_args = {}
    if system_instruction:
        model_args["system_instruction"] = system_instruction
        
    last_exception = None
    for _ in range(len(keys)):
        if active_key_index >= len(keys):
            active_key_index = 0
            
        current_key = keys[active_key_index]
        genai.configure(api_key=current_key)
        
        try:
            model = genai.GenerativeModel(model_name=MODEL, **model_args)
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            response = model.generate_content(
                contents=history,
                generation_config=generation_config
            )
            return response.text
        except Exception as e:
            last_exception = e
            print(f"Gemini API Error with key index {active_key_index}: {e}")
            active_key_index = (active_key_index + 1) % len(keys)
            print(f"Rotating to Gemini API key index {active_key_index}...")
            
    raise last_exception

def summarize_text(text: str) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a smart campus notice and circular summarizer. Provide a detailed, clarified, and highly readable summary of the notice.\n\n"
                "Format the output cleanly using bold labels and spacing:\n"
                "**Topic:** <title>\n\n"
                "**Date:** <date>\n"
                "**Time:** <time>\n"
                "**Venue:** <location>\n"
                "**Deadline:** <if any>\n\n"
                "**Details:**\n"
                "- Provide a detailed and clarified bullet-point list of all key announcements, instructions, or rules.\n"
                "- Ensure every major point is highlighted on its own line using standard bullet points.\n\n"
                "**Structured Tables / Schedules:**\n"
                "- If the document contains any tables (such as exam schedules, dates, subjects, times, or list of slots), extract and present them clearly using Markdown table syntax (`| Column 1 | Column 2 |`) so they are easily recognizable.\n"
                "- If no tables/schedules are present, skip this section entirely.\n\n"
                "Do NOT use markdown headers (like # or ##). Just use bold labels."
            ),
        },
        {"role": "user", "content": f"Summarize this notice:\n\n{text[:4000]}"},
    ]
    return chat_completion(messages, temperature=0.2, max_tokens=1000)


def extract_mess_menu(text: str) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a campus mess menu formatter. "
                "Extract and display the EXACT mess menu from the document. "
                "Format it clearly day by day with the meals (Breakfast, Lunch, Dinner). "
                "Include the meal times or ranges (e.g. Breakfast (08:00 AM - 09:30 AM) or Lunch: 1:00 PM - 2:00 PM) if they are present or mentioned anywhere in the document. If no meal timings are found, just show the meal name.\n"
                "Do NOT summarize, do NOT add action items, do NOT add any commentary. "
                "Just show the actual menu items exactly as listed. "
                "Use **bold** for the day names and ALWAYS include a blank empty line between each day's entry so there is a clear gap.\n"
                "Format example:\n\n"
                "**Monday**\n"
                "  Breakfast (08:00 AM - 09:30 AM): Idli, Sambar, Chutney\n"
                "  Lunch (01:00 PM - 02:30 PM): Rice, Dal, Paneer Curry, Chapati\n"
                "  Dinner (08:00 PM - 09:30 PM): Chapati, Sabzi, Curd\n\n"
                "**Tuesday**\n"
                "  Breakfast (08:00 AM - 09:30 AM): Dosa...\n"
            ),
        },
        {"role": "user", "content": f"Extract the mess menu:\n\n{text[:5000]}"},
    ]
    return chat_completion(messages, temperature=0.1, max_tokens=2000)

def generate_study_suggestions(deadlines: list[dict], schedule: list[dict], current_dt: str = "") -> str:
    deadlines_text = "\n".join(
        [
            f"- {d.get('title')} ({d.get('type')}) - Subject: {d.get('subject', 'N/A')} - Due: {d.get('due_date')} - Priority: {d.get('priority', 'medium')} - Desc: {d.get('description', '')}"
            for d in deadlines
        ]
    )
    schedule_text = "\n".join(
        [f"- {s.get('subject')} at {s.get('time')} on {s.get('day')}" for s in schedule]
    )
    
    dt_str = current_dt or datetime.now().strftime("%A, %d %B %Y %I:%M %p")
    
    messages = [
        {
            "role": "system",
            "content": (
                f"You are an expert academic planner and study coach. Current date and time: {dt_str}.\n"
                "Your task is to analyze the student's upcoming deadlines and weekly schedule, "
                "and generate a highly detailed, realistic, and actionable priority-based study plan.\n\n"
                "Follow these strict rules to design the plan:\n"
                "1. **Priority & Urgency Sorting**:\n"
                "   - Sort all upcoming deadlines strictly by priority level: High Priority first, then Medium Priority, then Low Priority.\n"
                "   - Within each priority group, order the tasks by their due date (closest due date first).\n"
                "   - For each deadline, calculate and state the exact remaining days/hours from the current datetime to the due date.\n\n"
                "2. **Milestone-Based Scheduling**:\n"
                "   - For each deadline, do NOT just schedule a single study block. Instead, break down the work into 2-3 distinct milestones or phases (e.g., Phase 1: Research & Outline, Phase 2: Core Drafting & Implementation, Phase 3: Review & Final Polish).\n"
                "   - Assign a specific estimated duration (in hours) required for each phase.\n"
                "   - For every single phase/milestone, schedule a concrete **Time Range** (must specify the day, date, start time, and end time, e.g., 'Tuesday, 16 June 2026 from 03:00 PM to 05:00 PM').\n\n"
                "3. **Gap Mapping & Timetable Alignment**:\n"
                "   - Carefully examine the student's weekly schedule (which lists days and times they have classes).\n"
                "   - Map all study slots directly into the gaps of their schedule, ensuring zero overlap with their existing classes.\n"
                "   - Avoid scheduling during unrealistic hours (e.g., late night/early morning unless requested, or standard sleep hours like 11:00 PM - 07:00 AM).\n"
                "   - Ensure the study slots finish the work at least 1-2 days before the actual deadline to serve as a buffer.\n\n"
                "4. **Format & Visual Layout**:\n"
                "   - Organize the plan under clear Markdown headers:\n"
                "     - **# Priority-Based Study Plan**\n"
                "     - **## Upcoming Deadlines & Priority Sequence** (A quick list showing the order in which to tackle tasks)\n"
                "     - **## Action Plan for High Priority Tasks**\n"
                "     - **## Action Plan for Medium Priority Tasks**\n"
                "     - **## Action Plan for Low Priority Tasks**\n"
                "   - For each task under these sections, use bullet points, bold labels, and Markdown tables/lists to represent the milestone schedule clearly.\n"
                "   - Make the recommendations look premium, readable, and highly professional."
            ),
        },
        {
            "role": "user",
            "content": (
                f"My upcoming deadlines:\n{deadlines_text}\n\n"
                f"My weekly schedule:\n{schedule_text}\n\n"
                "Please generate a detailed study plan and suggestions, with a comprehensive, step-by-step breakdown of specific time ranges to work on and complete each deadline."
            ),
        },
    ]
    return chat_completion(messages, temperature=0.5, max_tokens=1500)

def answer_question(question: str, context: str, current_datetime: str = "", schedule_context: str = "", student_id: str = "default_student", deadlines_context: str = "") -> str:
    import google.generativeai as genai
    from datetime import datetime
    import uuid
    from app.services import dynamodb_service, rag_service
    from boto3.dynamodb.conditions import Attr

    def schedule_event(day: str, subject: str, start_time: str, end_time: str, room: str = "", instructor: str = "", is_one_time: bool = True, date: str = "") -> str:
        """Schedules a new class, exam, study session, or personal event in the student's timetable.

        Args:
            day: The day of the week (e.g. 'Monday', 'Sunday').
            subject: The name of the event or subject.
            start_time: Start time, e.g. '09:00 AM' or '14:00'.
            end_time: End time, e.g. '11:00 AM' or '17:00'.
            room: Optional room or location.
            instructor: Optional instructor or person.
            is_one_time: True if this is a one-time event (default for custom/personal events). False for recurring weekly classes.
            date: The specific date (YYYY-MM-DD) for one-time events. Required if is_one_time is True.
        """
        entry = {
            "id": str(uuid.uuid4()),
            "student_id": student_id,
            "day": day.strip().capitalize(),
            "subject": subject.strip(),
            "time": start_time.strip(),
            "end_time": end_time.strip(),
            "room": room.strip(),
            "instructor": instructor.strip(),
            "is_one_time": is_one_time,
            "date": date.strip() if is_one_time else "",
        }
        dynamodb_service.put_item(settings.dynamodb_schedules_table, entry)

        # Update RAG
        try:
            all_entries = dynamodb_service.scan_items(
                settings.dynamodb_schedules_table,
                filter_expression=Attr("student_id").eq(student_id),
            )
            timetable_text = "\n".join(
                [f"{e['day']} {e['time']}-{e['end_time']}: {e['subject']} Room:{e['room']} ({e['instructor']})" + (f" Date:{e['date']}" if e.get("is_one_time") else " (Weekly)")
                 for e in all_entries]
            )
            if timetable_text.strip():
                rag_service.add_document(
                    f"timetable_{student_id}",
                    timetable_text,
                    {"type": "timetable", "student_id": student_id},
                )
        except Exception:
            pass

        time_desc = f"from {start_time} to {end_time}"
        date_desc = f" on {date} ({day})" if (is_one_time and date) else f" every {day}"
        return f"Successfully scheduled '{subject}'{date_desc} {time_desc}."

    def add_deadline(title: str, due_date: str, type: str = "assignment", subject: str = "", description: str = "", priority: str = "medium") -> str:
        """Adds a new deadline/assignment/exam/project/submission for the student.

        Args:
            title: The title/name of the deadline (e.g. 'Math Assignment 1').
            due_date: The due date in YYYY-MM-DD format.
            type: The type of deadline (e.g. 'assignment', 'project', 'exam', 'submission').
            subject: Optional subject or course name (e.g. 'Math', 'Physics').
            description: Optional details/instructions for the deadline.
            priority: The priority level ('low', 'medium', 'high').
        """
        import uuid
        from datetime import datetime
        item = {
            "id": str(uuid.uuid4()),
            "student_id": student_id,
            "title": title.strip(),
            "type": type.strip().lower(),
            "subject": subject.strip(),
            "due_date": due_date.strip(),
            "description": description.strip(),
            "priority": priority.strip().lower(),
            "completed": False,
            "created_at": datetime.utcnow().isoformat(),
        }
        dynamodb_service.put_item(settings.dynamodb_deadlines_table, item)
        return f"Successfully added deadline '{title}' due on {due_date}."

    def mark_deadline_completed(title_or_id: str) -> str:
        """Marks a deadline as completed by its title or ID.

        Args:
            title_or_id: The title of the deadline or its exact ID.
        """
        from boto3.dynamodb.conditions import Attr
        # Try to find by ID
        existing = dynamodb_service.get_item(settings.dynamodb_deadlines_table, {"id": title_or_id})
        if not existing or existing.get("student_id") != student_id:
            # Try to scan and find by title
            deadlines = dynamodb_service.scan_items(
                settings.dynamodb_deadlines_table,
                filter_expression=Attr("student_id").eq(student_id)
            )
            matches = [d for d in deadlines if d.get("title", "").lower() == title_or_id.lower()]
            if not matches:
                # partial match
                matches = [d for d in deadlines if title_or_id.lower() in d.get("title", "").lower()]
            if not matches:
                return f"Could not find any deadline matching '{title_or_id}'."
            # Prefer uncompleted matches
            uncompleted = [m for m in matches if not m.get("completed", False)]
            existing = uncompleted[0] if uncompleted else matches[0]

        deadline_id = existing["id"]
        title = existing.get("title", "Unknown")
        dynamodb_service.update_item(
            settings.dynamodb_deadlines_table,
            {"id": deadline_id},
            "SET #f_completed = :v_completed",
            {":v_completed": True},
            {"#f_completed": "completed"}
        )
        return f"Successfully marked deadline '{title}' as completed."

    dt = current_datetime or datetime.now().strftime("%A, %d %B %Y %I:%M %p")
    system_instruction = (
        f"You are Campus Flow, a helpful Jarvis-like personal AI assistant and college planner. "
        f"Current date and time: {dt}. "
        "IMPORTANT RULES:\n"
        "- Always state the FULL DATE (day name + DD Month YYYY) when mentioning any class, event, or deadline, e.g. 'Monday, 14 July 2025'.\n"
        "- Calculate the exact calendar date from today's date when referring to upcoming days.\n"
        "- Always include the class, event, or deadline details like due dates, time, name, and room/location if available.\n"
        "- Never say just 'Monday' — always say 'Monday, 14 July 2025'.\n"
        "- You have the capability to schedule events (classes, exams, study sessions, personal time) using the `schedule_event` tool. If the user asks to schedule something, check if it's a one-time event (default for events, meetings, gym sessions, exams) or a weekly recurring class. For one-time events, calculate the exact date in 'YYYY-MM-DD' format using today's date and call the tool with `is_one_time=True` and the computed `date`.\n"
        "- You have the capability to manage deadlines using the `add_deadline` and `mark_deadline_completed` tools. You can add new assignments, projects, exams, or submissions, and mark them as completed when requested.\n"
        "- When finding free time, scan the 'Live Schedule Data' for that day. Find gaps of the requested duration (assume standard campus/waking hours are 06:00 AM to 12:00 PM if unspecified) and suggest them to the user. "
        "If there are no classes/events scheduled on that day, then the entire day is free.\n"
        "- When asked about deadlines, upcoming tasks, assignments, projects, or exams, look at the provided 'Deadlines Data'. You should list, describe, or summarize them clearly and help the user prioritize them.\n"
        "- Be friendly, organized, helpful, and concise.\n"
        "Answer all questions using the provided context. If the context doesn't have the answer, answer based on your capabilities and tools."
    )

    keys = get_api_keys()
    if not keys:
        raise ValueError("No Gemini API keys configured.")

    user_prompt = (
        f"Live Schedule Data:\n{schedule_context}\n\n" if schedule_context else ""
    ) + (
        f"Deadlines Data:\n{deadlines_context}\n\n" if deadlines_context else ""
    ) + f"Document Context:\n{context}\n\nQuestion: {question}"

    last_exception = None
    for _ in range(len(keys)):
        global active_key_index
        if active_key_index >= len(keys):
            active_key_index = 0
            
        current_key = keys[active_key_index]
        genai.configure(api_key=current_key)
        
        try:
            model = genai.GenerativeModel(
                model_name=MODEL,
                system_instruction=system_instruction,
                tools=[schedule_event, add_deadline, mark_deadline_completed]
            )
            chat = model.start_chat(enable_automatic_function_calling=True)
            response = chat.send_message(user_prompt)
            return response.text
        except Exception as e:
            last_exception = e
            print(f"Gemini API Error with key index {active_key_index} in answer_question: {e}")
            active_key_index = (active_key_index + 1) % len(keys)
            print(f"Rotating to Gemini API key index {active_key_index}...")
            
    raise last_exception

