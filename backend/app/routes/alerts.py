import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from boto3.dynamodb.conditions import Attr
from app.services import dynamodb_service
from app.services.alert_service import generate_alerts, create_alert
from app.config import settings
from app.utils.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("")
def get_alerts(student_id: str = Depends(get_current_user)):
    """Fetch all alerts for a student, sorted by timestamp descending."""
    items = dynamodb_service.scan_items(
        settings.dynamodb_students_table,
        filter_expression=Attr("student_id").eq(student_id) & Attr("type").eq("alert")
    )
    
    mapped = []
    for item in items:
        mapped.append({
            "id": item["id"],
            "type": item.get("alert_type", "class"),
            "title": item.get("title", ""),
            "message": item.get("message", ""),
            "timestamp": item.get("timestamp", ""),
            "read": item.get("read", False)
        })
    
    # Sort by timestamp descending (newest notifications first)
    mapped.sort(key=lambda x: x["timestamp"], reverse=True)
    return mapped

@router.post("/generate")
def trigger_generation(student_id: str = Depends(get_current_user)):
    """Manually triggers generation of alerts from schedule/deadlines."""
    new_alerts = generate_alerts(student_id)
    return {
        "status": "success",
        "alerts_generated": len(new_alerts),
        "alerts": [
            {
                "id": a["id"],
                "type": a["alert_type"],
                "title": a["title"],
                "message": a["message"],
                "timestamp": a["timestamp"],
                "read": a["read"]
            } for a in new_alerts
        ]
    }

@router.post("/demo")
def generate_demo(student_id: str = Depends(get_current_user)):
    """Creates a fake DBMS class reminder alert in the database and returns it."""
    demo_id = str(uuid.uuid4())
    time_str = (datetime.now() + timedelta(minutes=30)).isoformat()
    
    alert = create_alert(
        student_id=student_id,
        alert_type="class",
        title="DBMS Class",
        message="DBMS class starts in 30 minutes.",
        timestamp=time_str,
        source_id=f"demo_{demo_id}"
    )
    
    return {
        "id": alert["id"],
        "type": alert["alert_type"],
        "title": alert["title"],
        "message": alert["message"],
        "timestamp": alert["timestamp"],
        "read": alert["read"]
    }

@router.put("/{alert_id}/read")
def mark_read(alert_id: str, student_id: str = Depends(get_current_user)):
    """Marks a single alert as read in DynamoDB."""
    # Verify ownership
    existing = dynamodb_service.get_item(settings.dynamodb_students_table, {"id": alert_id})
    if not existing or existing.get("student_id") != student_id or existing.get("type") != "alert":
        raise HTTPException(status_code=403, detail="Not authorized to edit this alert")
    try:
        updated = dynamodb_service.update_item(
            settings.dynamodb_students_table,
            {"id": alert_id},
            "SET #r = :val",
            {":val": True},
            {"#r": "read"}
        )
        return {"status": "success", "alert_id": alert_id, "read": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update alert: {str(e)}")

@router.put("/read/all")
def mark_all_read(student_id: str = Depends(get_current_user)):
    """Marks all unread alerts for a student as read in DynamoDB."""
    try:
        items = dynamodb_service.scan_items(
            settings.dynamodb_students_table,
            filter_expression=Attr("student_id").eq(student_id) & Attr("type").eq("alert") & Attr("read").eq(False)
        )
        
        count = 0
        for item in items:
            dynamodb_service.update_item(
                settings.dynamodb_students_table,
                {"id": item["id"]},
                "SET #r = :val",
                {":val": True},
                {"#r": "read"}
            )
            count += 1
            
        return {"status": "success", "message": f"Marked {count} alerts as read."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark all as read: {str(e)}")
