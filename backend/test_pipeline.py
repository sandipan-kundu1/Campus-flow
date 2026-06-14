import sys, os, io, traceback
sys.path.insert(0, os.path.dirname(__file__))

from PIL import Image
from app.utils.text_extractor import extract_timetable_from_image
from app.services import dynamodb_service
from app.config import settings

# Step 1: Test vision extraction
print("=== Step 1: Groq Vision extraction ===")
img = Image.new("RGB", (400, 200), color="white")
buf = io.BytesIO()
img.save(buf, format="JPEG")
img_bytes = buf.getvalue()

try:
    entries = extract_timetable_from_image(img_bytes, "timetable.jpg")
    print(f"Entries returned: {len(entries)}")
    if entries:
        print(f"Sample: {entries[0]}")
except Exception:
    traceback.print_exc()

# Step 2: Test DynamoDB put
print("\n=== Step 2: DynamoDB write ===")
import uuid
test_entry = {
    "id": str(uuid.uuid4()),
    "student_id": "default_student",
    "day": "Monday",
    "subject": "Test Subject",
    "time": "09:00 AM",
    "end_time": "10:00 AM",
    "room": "101",
    "instructor": "Dr. Test",
}
try:
    dynamodb_service.put_item(settings.dynamodb_schedules_table, test_entry)
    print("DynamoDB write OK")
except Exception:
    traceback.print_exc()

# Step 3: Test RAG add
print("\n=== Step 3: RAG / ChromaDB ===")
from app.services import rag_service
try:
    rag_service.add_document("test_timetable", "Monday 09:00: Test Subject Room 101", {"type": "timetable"})
    print("ChromaDB write OK")
except Exception:
    traceback.print_exc()

print("\nDone.")
