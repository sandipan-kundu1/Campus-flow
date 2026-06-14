from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ScheduleEntry(BaseModel):
    id: str
    student_id: str
    day: str
    subject: str
    time: str
    end_time: Optional[str] = None
    room: Optional[str] = None
    instructor: Optional[str] = None


class TimetableUploadResponse(BaseModel):
    message: str
    entries_stored: int


class DeadlineCreate(BaseModel):
    student_id: str = "default_student"
    title: str
    type: str  # assignment | project | exam | submission
    subject: Optional[str] = None
    due_date: str  # ISO format: YYYY-MM-DD
    description: Optional[str] = None
    priority: Optional[str] = "medium"  # low | medium | high


class DeadlineUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None


class DeadlineResponse(BaseModel):
    id: str
    student_id: str
    title: str
    type: str
    subject: Optional[str] = None
    due_date: str
    description: Optional[str] = None
    priority: str = "medium"
    completed: bool = False
    created_at: str


class SummarizeRequest(BaseModel):
    text: str


class ChatQuery(BaseModel):
    question: str
    student_id: str = "default_student"
    current_datetime: str = ""  # sent from frontend, e.g. "Monday, 14 July 2025 03:45 PM"


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict] = []


class StudySuggestionsRequest(BaseModel):
    student_id: str = "default_student"
