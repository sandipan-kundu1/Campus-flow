import google.generativeai as genai
from app.config import settings

genai.configure(api_key=settings.gemini_api_key)
MODEL = "gemini-2.5-flash"

def chat_completion(messages: list[dict], temperature: float = 0.7, max_tokens: int = 1024) -> str:
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
                "Format it clearly day by day with all meals (Breakfast, Lunch, Snacks, Dinner). "
                "Do NOT summarize, do NOT add action items, do NOT add any commentary. "
                "Just show the actual menu items exactly as listed. "
                "Use **bold** for the day names and ALWAYS include a blank empty line between each day's entry so there is a clear gap.\n"
                "Format example:\n\n"
                "**Monday**\n"
                "  Breakfast: Idli, Sambar, Chutney\n"
                "  Lunch: Rice, Dal, Paneer Curry, Chapati\n"
                "  Snacks: Tea, Biscuits\n"
                "  Dinner: Chapati, Sabzi, Curd\n\n"
                "**Tuesday**\n"
                "  Breakfast: Dosa...\n"
            ),
        },
        {"role": "user", "content": f"Extract the mess menu:\n\n{text[:5000]}"},
    ]
    return chat_completion(messages, temperature=0.1, max_tokens=2000)

def generate_study_suggestions(deadlines: list[dict], schedule: list[dict]) -> str:
    deadlines_text = "\n".join(
        [f"- {d.get('title')} ({d.get('type')}) due {d.get('due_date')}" for d in deadlines]
    )
    schedule_text = "\n".join(
        [f"- {s.get('subject')} at {s.get('time')} on {s.get('day')}" for s in schedule]
    )
    messages = [
        {
            "role": "system",
            "content": "You are a smart academic planner. Generate practical study suggestions based on the student's schedule and deadlines.",
        },
        {
            "role": "user",
            "content": f"My upcoming deadlines:\n{deadlines_text}\n\nMy weekly schedule:\n{schedule_text}\n\nGive me study suggestions and a plan.",
        },
    ]
    return chat_completion(messages, temperature=0.5, max_tokens=800)

def answer_question(question: str, context: str, current_datetime: str = "", schedule_context: str = "", student_id: str = "default_student") -> str:
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

    dt = current_datetime or datetime.now().strftime("%A, %d %B %Y %I:%M %p")
    system_instruction = (
        f"You are Campus Flow, a helpful Jarvis-like personal AI assistant and college planner. "
        f"Current date and time: {dt}. "
        "IMPORTANT RULES:\n"
        "- Always state the FULL DATE (day name + DD Month YYYY) when mentioning any class or event, e.g. 'Monday, 14 July 2025'.\n"
        "- Calculate the exact calendar date from today's date when referring to upcoming days.\n"
        "- Always include the class or event time, name, and room/location if available.\n"
        "- Never say just 'Monday' — always say 'Monday, 14 July 2025'.\n"
        "- You have the capability to schedule events (classes, exams, study sessions, personal time) using the `schedule_event` tool. If the user asks to schedule something, check if it's a one-time event (default for events, meetings, gym sessions, exams) or a weekly recurring class. For one-time events, calculate the exact date in 'YYYY-MM-DD' format using today's date and call the tool with `is_one_time=True` and the computed `date`.\n"
        "- When finding free time, scan the 'Live Schedule Data' for that day. Find gaps of the requested duration (assume standard campus/waking hours are 08:00 AM to 08:00 PM if unspecified) and suggest them to the user. "
        "If there are no classes/events scheduled on that day, then the entire day is free.\n"
        "- Be friendly, organized, helpful, and concise.\n"
        "Answer all questions using the provided context. If the context doesn't have the answer, answer based on your capabilities and tools."
    )

    model = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=system_instruction,
        tools=[schedule_event]
    )

    chat = model.start_chat(enable_automatic_function_calling=True)

    user_prompt = (
        f"Live Schedule Data:\n{schedule_context}\n\n" if schedule_context else ""
    ) + f"Document Context:\n{context}\n\nQuestion: {question}"

    response = chat.send_message(user_prompt)
    return response.text
