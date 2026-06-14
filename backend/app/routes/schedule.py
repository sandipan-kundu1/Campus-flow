from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from boto3.dynamodb.conditions import Attr
from app.services import dynamodb_service
from app.config import settings
from app.utils.auth import get_current_user

router = APIRouter(prefix="/schedule", tags=["schedule"])

DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _get_today_name() -> str:
    return datetime.now().strftime("%A")


def _get_current_time() -> str:
    return datetime.now().strftime("%H:%M")


def _parse_time(time_str: str) -> int:
    """Convert time string like '9:00 AM' or '09:00' to minutes since midnight."""
    try:
        time_str = time_str.strip()
        if "AM" in time_str.upper() or "PM" in time_str.upper():
            t = datetime.strptime(time_str.upper(), "%I:%M %p")
        else:
            t = datetime.strptime(time_str, "%H:%M")
        return t.hour * 60 + t.minute
    except Exception:
        return 0


def _get_all_schedule(student_id: str) -> list[dict]:
    return dynamodb_service.scan_items(
        settings.dynamodb_schedules_table,
        filter_expression=Attr("student_id").eq(student_id),
    )


@router.get("/today")
def get_today_schedule(student_id: str = Depends(get_current_user)):
    today = _get_today_name()
    today_date_str = datetime.now().strftime("%Y-%m-%d")
    all_entries = _get_all_schedule(student_id)
    
    today_entries = []
    for e in all_entries:
        is_today = False
        if e.get("day", "").lower() == today.lower():
            if not e.get("is_one_time", False):
                is_today = True
            elif e.get("date") == today_date_str:
                is_today = True
        if is_today:
            today_entries.append(e)
            
    today_entries.sort(key=lambda x: _parse_time(x.get("time", "0:00")))
    return {"day": today, "schedule": today_entries}


@router.get("/weekly")
def get_weekly_schedule(student_id: str = Depends(get_current_user)):
    all_entries = _get_all_schedule(student_id)
    weekly = {}
    for day in DAYS_ORDER:
        day_entries = [
            e for e in all_entries 
            if e.get("day", "").lower() == day.lower() and not e.get("is_one_time", False)
        ]
        day_entries.sort(key=lambda x: _parse_time(x.get("time", "0:00")))
        weekly[day] = day_entries
    return {"weekly_schedule": weekly}


@router.get("/upcoming")
def get_upcoming_events(student_id: str = Depends(get_current_user)):
    today_date_str = datetime.now().strftime("%Y-%m-%d")
    all_entries = _get_all_schedule(student_id)
    upcoming = [
        e for e in all_entries 
        if e.get("is_one_time", False) and e.get("date", "") >= today_date_str
    ]
    upcoming.sort(key=lambda x: (x.get("date", ""), _parse_time(x.get("time", "0:00"))))
    return {"upcoming_events": upcoming}


@router.get("/next-class")
def get_next_class(student_id: str = Depends(get_current_user)):
    today = _get_today_name()
    today_date_str = datetime.now().strftime("%Y-%m-%d")
    current_minutes = _parse_time(_get_current_time())
    all_entries = _get_all_schedule(student_id)

    # Check today first
    today_entries = []
    for e in all_entries:
        is_today = False
        if e.get("day", "").lower() == today.lower():
            if not e.get("is_one_time", False):
                is_today = True
            elif e.get("date") == today_date_str:
                is_today = True
        if is_today:
            today_entries.append(e)

    today_entries.sort(key=lambda x: _parse_time(x.get("time", "0:00")))
    for entry in today_entries:
        if _parse_time(entry.get("time", "0:00")) > current_minutes:
            return {"next_class": entry, "today": True}

    # Check upcoming days this week
    today_idx = DAYS_ORDER.index(today) if today in DAYS_ORDER else 0
    for i in range(1, 7):
        target_date = datetime.now() + timedelta(days=i)
        target_day = target_date.strftime("%A")
        target_date_str = target_date.strftime("%Y-%m-%d")
        
        day_entries = []
        for e in all_entries:
            is_match = False
            if e.get("day", "").lower() == target_day.lower():
                if not e.get("is_one_time", False):
                    is_match = True
                elif e.get("date") == target_date_str:
                    is_match = True
            if is_match:
                day_entries.append(e)
                
        day_entries.sort(key=lambda x: _parse_time(x.get("time", "0:00")))
        if day_entries:
            return {"next_class": day_entries[0], "today": False}

    return {"next_class": None, "message": "No upcoming classes found"}


@router.delete("/clear")
def clear_timetable(student_id: str = Depends(get_current_user)):
    entries = _get_all_schedule(student_id)
    if entries:
        # Batch delete using DynamoDB resource for speed
        import boto3
        from app.config import settings as cfg
        table = boto3.resource(
            "dynamodb",
            region_name=cfg.aws_region,
            aws_access_key_id=cfg.aws_access_key_id,
            aws_secret_access_key=cfg.aws_secret_access_key,
        ).Table(cfg.dynamodb_schedules_table)
        with table.batch_writer() as batch:
            for entry in entries:
                batch.delete_item(Key={"id": entry["id"]})
    # Clear from ChromaDB
    from app.services import rag_service
    try:
        rag_service.delete_document(f"timetable_{student_id}")
    except Exception:
        pass
    return {"message": f"Cleared {len(entries)} schedule entries"}
