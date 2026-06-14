import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from boto3.dynamodb.conditions import Attr
from app.services import dynamodb_service
from app.services.gemini_service import generate_study_suggestions
from app.schemas.schemas import DeadlineCreate, DeadlineUpdate, StudySuggestionsRequest
from app.config import settings
from app.utils.auth import get_current_user

router = APIRouter(prefix="/deadlines", tags=["deadlines"])


@router.post("")
def create_deadline(deadline: DeadlineCreate, student_id: str = Depends(get_current_user)):
    item = {
        "id": str(uuid.uuid4()),
        "student_id": student_id,
        "title": deadline.title,
        "type": deadline.type,
        "subject": deadline.subject or "",
        "due_date": deadline.due_date,
        "description": deadline.description or "",
        "priority": deadline.priority or "medium",
        "completed": False,
        "created_at": datetime.utcnow().isoformat(),
    }
    dynamodb_service.put_item(settings.dynamodb_deadlines_table, item)
    return item


@router.get("")
def get_deadlines(student_id: str = Depends(get_current_user)):
    items = dynamodb_service.scan_items(
        settings.dynamodb_deadlines_table,
        filter_expression=Attr("student_id").eq(student_id),
    )
    # Sort by due_date ascending
    items.sort(key=lambda x: x.get("due_date", ""))
    return {"deadlines": items}


@router.put("/{deadline_id}")
def update_deadline(deadline_id: str, update: DeadlineUpdate, student_id: str = Depends(get_current_user)):
    # Verify ownership
    existing = dynamodb_service.get_item(settings.dynamodb_deadlines_table, {"id": deadline_id})
    if not existing or existing.get("student_id") != student_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this deadline")
        
    updates = {k: v for k, v in update.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_parts = []
    expr_values = {}
    expr_names = {}
    for field, value in updates.items():
        safe_key = f"#f_{field}"
        val_key = f":v_{field}"
        set_parts.append(f"{safe_key} = {val_key}")
        expr_names[safe_key] = field
        expr_values[val_key] = value

    update_expr = "SET " + ", ".join(set_parts)
    updated = dynamodb_service.update_item(
        settings.dynamodb_deadlines_table,
        {"id": deadline_id},
        update_expr,
        expr_values,
        expr_names,
    )
    return updated


@router.delete("/{deadline_id}")
def delete_deadline(deadline_id: str, student_id: str = Depends(get_current_user)):
    # Verify ownership
    existing = dynamodb_service.get_item(settings.dynamodb_deadlines_table, {"id": deadline_id})
    if not existing or existing.get("student_id") != student_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this deadline")
        
    dynamodb_service.delete_item(settings.dynamodb_deadlines_table, {"id": deadline_id})
    return {"message": "Deadline deleted"}
