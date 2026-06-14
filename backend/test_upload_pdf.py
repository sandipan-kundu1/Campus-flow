import requests

print("=== Testing POST /upload/timetable with PDF ===")
try:
    with open("test_timetable.pdf", "rb") as f:
        r = requests.post(
            "http://localhost:8000/upload/timetable",
            files={"file": ("test_timetable.pdf", f, "application/pdf")},
            data={"student_id": "default_student"},
            timeout=60,
        )
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Request error: {e}")
