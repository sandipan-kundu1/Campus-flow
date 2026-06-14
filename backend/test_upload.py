import sys, os, io, requests
sys.path.insert(0, os.path.dirname(__file__))

from PIL import Image

# Create a simple test image that looks like a timetable
img = Image.new("RGB", (400, 200), color="white")
buf = io.BytesIO()
img.save(buf, format="JPEG")
buf.seek(0)

print("=== Testing POST /upload/timetable with JPEG ===")
try:
    r = requests.post(
        "http://localhost:8000/upload/timetable",
        files={"file": ("timetable.jpg", buf, "image/jpeg")},
        data={"student_id": "default_student"},
        timeout=60,
    )
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Request error: {e}")
