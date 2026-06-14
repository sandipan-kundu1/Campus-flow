import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))

from app.schemas.schemas import ChatQuery
from app.routes.chat import chat_query, _build_schedule_context

print("=== Testing _build_schedule_context ===")
try:
    ctx = _build_schedule_context("default_student", "")
    print("OK, length:", len(ctx))
    print(ctx[:300])
except Exception:
    traceback.print_exc()

print("\n=== Testing chat_query ===")
try:
    q = ChatQuery(question="what classes do I have today", student_id="default_student", current_datetime="")
    result = chat_query(q)
    print("OK:", result)
except Exception:
    traceback.print_exc()
