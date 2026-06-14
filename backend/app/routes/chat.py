import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from boto3.dynamodb.conditions import Attr
from app.services import s3_service, rag_service, dynamodb_service
from app.services.gemini_service import answer_question
from app.schemas.schemas import ChatQuery
from app.utils.text_extractor import extract_text
from app.config import settings
from app.utils.auth import get_current_user

router = APIRouter(tags=["chat"])

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _parse_time_minutes(time_str: str) -> int:
    try:
        time_str = time_str.strip().upper()
        fmt = "%I:%M %p" if ("AM" in time_str or "PM" in time_str) else "%H:%M"
        t = datetime.strptime(time_str, fmt)
        return t.hour * 60 + t.minute
    except Exception:
        return 0


def _build_schedule_context(student_id: str, current_datetime: str) -> str:
    """Build a rich text block of live schedule data for the AI to reason over."""
    now = datetime.now()
    today_name = now.strftime("%A")
    today_idx = DAYS.index(today_name) if today_name in DAYS else 0
    current_mins = now.hour * 60 + now.minute
    today_date_str = now.strftime("%Y-%m-%d")

    # Get all schedule entries
    all_entries = dynamodb_service.scan_items(
        settings.dynamodb_schedules_table,
        filter_expression=Attr("student_id").eq(student_id),
    )

    # Build day-name → calendar-date mapping for the next 7 days
    day_to_date = {}
    for i in range(7):
        d = now + timedelta(days=i)
        day_to_date[d.strftime("%A")] = d.strftime("%A, %d %B %Y")

    lines = [f"Today is {now.strftime('%A, %d %B %Y')} and the current time is {now.strftime('%I:%M %p')}.", ""]

    # Today's classes / events (recurring classes on this day name, OR one-time events matching today's date)
    today_entries = []
    for e in all_entries:
        is_today = False
        if e.get("day", "").lower() == today_name.lower():
            if not e.get("is_one_time", False):
                is_today = True
            elif e.get("date") == today_date_str:
                is_today = True
        if is_today:
            today_entries.append(e)

    today_entries.sort(key=lambda x: _parse_time_minutes(x.get("time", "0")))

    if today_entries:
        lines.append(f"TODAY'S SCHEDULE ({day_to_date.get(today_name, today_name)}):")
        for e in today_entries:
            status = "[UPCOMING]" if _parse_time_minutes(e.get("time", "0")) > current_mins else "[PAST]"
            lines.append(f"  {status} {e.get('time','')} - {e.get('end_time','')} | {e.get('subject','')} | Room: {e.get('room','')} | {e.get('instructor','')}")
        lines.append("")

    # Next upcoming class / event (today or future days)
    next_class = None
    next_class_date = None
    for e in today_entries:
        if _parse_time_minutes(e.get("time", "0")) > current_mins:
            next_class = e
            next_class_date = day_to_date.get(today_name, today_name)
            break

    if not next_class:
        for i in range(1, 7):
            d = now + timedelta(days=i)
            day_name = d.strftime("%A")
            day_date_str = d.strftime("%Y-%m-%d")
            
            day_entries = []
            for e in all_entries:
                is_match = False
                if e.get("day", "").lower() == day_name.lower():
                    if not e.get("is_one_time", False):
                        is_match = True
                    elif e.get("date") == day_date_str:
                        is_match = True
                if is_match:
                    day_entries.append(e)
                    
            day_entries.sort(key=lambda x: _parse_time_minutes(x.get("time", "0")))
            if day_entries:
                next_class = day_entries[0]
                next_class_date = day_to_date.get(day_name, day_name)
                break

    if next_class:
        lines.append("NEXT CLASS / EVENT:")
        lines.append(
            f"  {next_class_date} at {next_class.get('time','')} - {next_class.get('end_time','')} | "
            f"{next_class.get('subject','')} | Room: {next_class.get('room','')} | {next_class.get('instructor','')}"
        )
        lines.append("")

    # Upcoming classes / events for next 7 days
    lines.append("UPCOMING WEEK SCHEDULE:")
    for i in range(1, 7):
        d = now + timedelta(days=i)
        day_name = d.strftime("%A")
        day_date = day_to_date.get(day_name, day_name)
        day_date_str = d.strftime("%Y-%m-%d")
        
        day_entries = []
        for e in all_entries:
            is_match = False
            if e.get("day", "").lower() == day_name.lower():
                if not e.get("is_one_time", False):
                    is_match = True
                elif e.get("date") == day_date_str:
                    is_match = True
            if is_match:
                day_entries.append(e)
                
        day_entries.sort(key=lambda x: _parse_time_minutes(x.get("time", "0")))
        if day_entries:
            lines.append(f"  {day_date}:")
            for e in day_entries:
                lines.append(f"    {e.get('time','')} - {e.get('end_time','')} | {e.get('subject','')} | Room: {e.get('room','')}")

    return "\n".join(lines)


def _build_deadlines_context(student_id: str) -> str:
    """Build a rich text block of active deadlines for the AI to reason over."""
    deadlines = dynamodb_service.scan_items(
        settings.dynamodb_deadlines_table,
        filter_expression=Attr("student_id").eq(student_id) & Attr("completed").eq(False),
    )
    # Sort by due_date ascending
    deadlines.sort(key=lambda x: x.get("due_date", ""))

    lines = ["UPCOMING DEADLINES:"]
    if not deadlines:
        lines.append("  No upcoming deadlines scheduled.")
    else:
        for d in deadlines:
            lines.append(
                f"  - ID: {d.get('id')} | Title: {d.get('title')} | Type: {d.get('type','')} | "
                f"Subject: {d.get('subject','N/A')} | Due Date: {d.get('due_date')} | "
                f"Priority: {d.get('priority','medium')} | Description: {d.get('description','')}"
            )
    return "\n".join(lines)


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(default="general"),
    student_id: str = Depends(get_current_user),
):
    file_bytes = await file.read()
    filename = file.filename or "document"

    # Upload to S3 (non-fatal)
    doc_id = str(uuid.uuid4())
    s3_key = f"documents/{student_id}/{doc_id}_{filename}"
    try:
        s3_service.upload_file(file_bytes, s3_key, file.content_type or "application/octet-stream")
    except Exception:
        pass

    # Extract and embed
    text = extract_text(file_bytes, filename)
    rag_service.add_document(
        doc_id,
        text,
        {"type": doc_type, "filename": filename, "student_id": student_id, "s3_key": s3_key},
    )

    return {
        "message": "Document uploaded and indexed",
        "id": doc_id,
        "filename": filename,
        "chunks": len(rag_service.chunk_text(text)),
    }


@router.post("/chat/query")
def chat_query(query: ChatQuery, student_id: str = Depends(get_current_user)):
    # Live schedule context with exact calendar dates
    schedule_context = _build_schedule_context(student_id, query.current_datetime)

    # Live deadlines context
    deadlines_context = _build_deadlines_context(student_id)

    # RAG context from uploaded documents
    docs = rag_service.query_documents(query.question, n_results=4, where={"student_id": student_id})
    context = "\n\n".join([d["text"] for d in docs]) if docs else "No additional documents found."

    answer = answer_question(
        question=query.question,
        context=context,
        current_datetime=query.current_datetime,
        schedule_context=schedule_context,
        student_id=student_id,
        deadlines_context=deadlines_context
    )

    sources = [
        {
            "filename": d["metadata"].get("filename", ""),
            "type": d["metadata"].get("type", ""),
            "score": round(d["score"], 3),
        }
        for d in docs
    ]
    return {"answer": answer, "sources": sources}
