import uuid
import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.utils.auth import get_current_user
from app.services import s3_service, dynamodb_service, rag_service
from app.services.gemini_service import summarize_text, extract_mess_menu
from app.utils.text_extractor import (
    extract_text,
    parse_timetable_json,
    extract_timetable_from_image,
    extract_timetable_from_pdf,
)
from app.config import settings

router = APIRouter(prefix="/upload", tags=["upload"])

IMAGE_EXTS = {"jpg", "jpeg", "png"}


def _try_s3(file_bytes: bytes, s3_key: str, content_type: str):
    """Upload to S3, silently skip if not configured."""
    try:
        s3_service.upload_file(file_bytes, s3_key, content_type)
    except Exception:
        pass  # S3 is optional for MVP — don't block upload


def _build_entry(student_id: str, e: dict) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "student_id": student_id,
        "day": e.get("day", ""),
        "subject": e.get("subject", ""),
        "time": e.get("time", ""),
        "end_time": e.get("end_time", ""),
        "room": e.get("room", ""),
        "instructor": e.get("instructor", ""),
    }


def _parse_timetable_text_with_llm(text: str) -> list[dict]:
    from app.services.gemini_service import chat_completion
    messages = [
        {
            "role": "system",
            "content": (
                "Extract timetable entries from the text. "
                "Return a JSON array only, no explanation. "
                "Each entry: {day, subject, time, end_time, room, instructor}. "
                "day must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday."
            ),
        },
        {"role": "user", "content": f"Extract timetable:\n{text[:4000]}"},
    ]
    raw = chat_completion(messages, temperature=0.1, max_tokens=4096)
    try:
        start = raw.find("[")
        end = raw.rfind("]") + 1
        return json.loads(raw[start:end])
    except Exception:
        return []


@router.post("/timetable")
async def upload_timetable(
    file: UploadFile = File(...),
    student_id: str = Depends(get_current_user),
):
    file_bytes = await file.read()
    filename = file.filename or "timetable"
    ext = filename.lower().rsplit(".", 1)[-1]

    # S3 upload (non-fatal)
    _try_s3(file_bytes, f"timetables/{student_id}/{filename}", file.content_type or "application/octet-stream")

    # --- Parse entries based on file type ---
    raw_entries = []

    try:
        if ext == "json":
            data = parse_timetable_json(file_bytes)
            raw_entries = data.get("schedule", data) if isinstance(data, dict) else data

        elif ext in IMAGE_EXTS:
            # Direct vision extraction — best for complex grid timetables
            raw_entries = extract_timetable_from_image(file_bytes, filename)

        elif ext == "pdf":
            # Convert PDF → image → vision extraction for grid-style timetables
            raw_entries = extract_timetable_from_pdf(file_bytes)
            if not raw_entries:
                # Fallback: extract PDF text and parse with LLM
                text = extract_text(file_bytes, filename)
                raw_entries = _parse_timetable_text_with_llm(text)

        elif ext in ("xlsx", "xls", "docx", "doc"):
            # Extract text from spreadsheet/document tables and parse with LLM
            text = extract_text(file_bytes, filename)
            raw_entries = _parse_timetable_text_with_llm(text)

        else:
            text = extract_text(file_bytes, filename)
            raw_entries = _parse_timetable_text_with_llm(text)
    except Exception as e:
        err_msg = str(e)
        if "quota" in err_msg.lower() or "resourceexhausted" in err_msg.lower() or "429" in err_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="The Gemini AI API quota limit has been exceeded. Please try uploading a JSON format timetable (which is parsed locally without AI) or retry later."
            )
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse timetable: {err_msg}"
        )

    if not raw_entries:
        raise HTTPException(
            status_code=422,
            detail="Could not extract timetable entries from this file. Please check if the file format is valid, try a clearer image/PDF, or upload a JSON format timetable instead."
        )

    # Build and store entries
    entries = [_build_entry(student_id, e) for e in raw_entries if e.get("day") and e.get("subject")]

    for entry in entries:
        dynamodb_service.put_item(settings.dynamodb_schedules_table, entry)

    # Index in RAG for chat queries
    timetable_text = "\n".join(
        [f"{e['day']} {e['time']}-{e['end_time']}: {e['subject']} Room:{e['room']} ({e['instructor']})"
         for e in entries]
    )
    if timetable_text.strip():
        rag_service.add_document(
            f"timetable_{student_id}",
            timetable_text,
            {"type": "timetable", "student_id": student_id},
        )

    return {"message": "Timetable uploaded successfully", "entries_stored": len(entries)}


@router.post("/notice")
async def upload_notice(
    file: UploadFile = File(...),
    title: str = Form(default=""),
    student_id: str = Depends(get_current_user),
):
    file_bytes = await file.read()
    filename = file.filename or "notice"

    doc_id = str(uuid.uuid4())
    _try_s3(file_bytes, f"notices/{student_id}/{doc_id}_{filename}", file.content_type or "application/octet-stream")

    try:
        text = extract_text(file_bytes, filename)
        is_mess = "mess" in (title or filename).lower()
        summary = extract_mess_menu(text) if is_mess else summarize_text(text[:4000])
    except Exception as e:
        err_msg = str(e)
        if "quota" in err_msg.lower() or "resourceexhausted" in err_msg.lower() or "429" in err_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="The Gemini AI API quota limit has been exceeded. Please retry notice upload later when quota refreshes."
            )
        raise HTTPException(
            status_code=422,
            detail=f"Failed to process and summarize notice: {err_msg}"
        )

    record = {
        "id": doc_id,
        "student_id": student_id,
        "title": title or filename,
        "filename": filename,
        "s3_key": f"notices/{student_id}/{doc_id}_{filename}",
        "summary": summary,
        "uploaded_at": datetime.utcnow().isoformat(),
        "type": "notice",
        "is_mess": is_mess,
    }
    dynamodb_service.put_item(settings.dynamodb_students_table, record)
    rag_service.add_document(
        doc_id, 
        text, 
        {"type": "notice", "title": title or filename, "student_id": student_id, "is_mess": is_mess}
    )

    return {"message": "Notice uploaded and summarized", "id": doc_id, "summary": summary}
