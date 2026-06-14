from fastapi import APIRouter, Depends, HTTPException
from boto3.dynamodb.conditions import Attr
from app.services import dynamodb_service
from app.services.gemini_service import summarize_text, generate_study_suggestions
from app.schemas.schemas import SummarizeRequest, StudySuggestionsRequest
from app.config import settings
from app.utils.auth import get_current_user

router = APIRouter(tags=["summarize"])


@router.get("/summaries")
def get_summaries(student_id: str = Depends(get_current_user)):
    items = dynamodb_service.scan_items(
        settings.dynamodb_students_table,
        filter_expression=Attr("student_id").eq(student_id) & Attr("type").eq("notice"),
    )
    items.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
    return {"summaries": items}


@router.delete("/summaries/{doc_id}")
def delete_summary(doc_id: str, student_id: str = Depends(get_current_user)):
    # Verify ownership
    existing = dynamodb_service.get_item(settings.dynamodb_students_table, {"id": doc_id})
    if not existing or existing.get("student_id") != student_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this summary")
        
    dynamodb_service.delete_item(settings.dynamodb_students_table, {"id": doc_id})
    from app.services import rag_service
    try:
        rag_service.delete_document(doc_id)
    except Exception:
        pass
    return {"message": "Deleted"}


def summarize_document(req: SummarizeRequest):
    summary = summarize_text(req.text[:4000])
    return {"summary": summary}


@router.post("/schedule/suggestions")
def get_study_suggestions(req: StudySuggestionsRequest, student_id: str = Depends(get_current_user)):
    # Override req.student_id with the authenticated user's email
    deadlines = dynamodb_service.scan_items(
        settings.dynamodb_deadlines_table,
        filter_expression=Attr("student_id").eq(student_id) & Attr("completed").eq(False),
    )
    schedule = dynamodb_service.scan_items(
        settings.dynamodb_schedules_table,
        filter_expression=Attr("student_id").eq(student_id),
    )
    from datetime import datetime
    current_dt = datetime.now().strftime("%A, %d %B %Y %I:%M %p")
    suggestions = generate_study_suggestions(deadlines, schedule, current_dt)
    return {"suggestions": suggestions}
