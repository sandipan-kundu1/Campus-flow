from groq import Groq
from app.config import settings

client = Groq(api_key=settings.groq_api_key)
MODEL = "llama-3.3-70b-versatile"

def chat_completion(messages: list[dict], temperature: float = 0.7, max_tokens: int = 1024) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content

def summarize_text(text: str) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a campus notice summarizer. Extract and present only the essential information from the notice. "
                "Format the output cleanly with these fields if present (skip any that are missing):\n"
                "Event/Subject: <title>\n"
                "Date: <date>\n"
                "Time: <time>\n"
                "Venue: <location>\n"
                "Details: <2-3 sentence description>\n"
                "Deadline: <if any>\n"
                "Do NOT add bullet points with asterisks, do NOT add 'Action Items', do NOT add markdown headers. "
                "Keep it plain, short, and readable."
            ),
        },
        {"role": "user", "content": f"Summarize this notice:\n\n{text[:4000]}"},
    ]
    return chat_completion(messages, temperature=0.2, max_tokens=300)


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
                "Format example:\n"
                "Monday\n"
                "  Breakfast: Idli, Sambar, Chutney\n"
                "  Lunch: Rice, Dal, Paneer Curry, Chapati\n"
                "  Snacks: Tea, Biscuits\n"
                "  Dinner: Chapati, Sabzi, Curd\n"
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

def answer_question(question: str, context: str, current_datetime: str = "", schedule_context: str = "", student_id: str = "default_student", deadlines_context: str = "") -> str:
    from datetime import datetime
    dt = current_datetime or datetime.now().strftime("%A, %d %B %Y %I:%M %p")
    messages = [
        {
            "role": "system",
            "content": (
                f"You are Campus Flow, an AI assistant for students. "
                f"Current date and time: {dt}. "
                "IMPORTANT RULES for schedule/class questions:\n"
                "- Always state the FULL DATE (day name + DD Month YYYY) when mentioning any class or event, e.g. 'Monday, 14 July 2025'.\n"
                "- Calculate the exact calendar date from today's date when referring to upcoming days.\n"
                "- Always include the class time, subject name, and room number if available.\n"
                "- Never say just 'Monday' — always say 'Monday, 14 July 2025'.\n"
                "- When asked about deadlines, look at the provided 'Deadlines Data'. List and summarize them clearly.\n"
                "Answer all questions using the provided context. "
                "If the context doesn't have the answer, say so honestly."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Live Schedule Data:\n{schedule_context}\n\n" if schedule_context else ""
            ) + (
                f"Deadlines Data:\n{deadlines_context}\n\n" if deadlines_context else ""
            ) + f"Document Context:\n{context}\n\nQuestion: {question}",
        },
    ]
    return chat_completion(messages, temperature=0.4, max_tokens=1024)
