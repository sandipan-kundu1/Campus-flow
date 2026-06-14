import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))

from app.routes.schedule import clear_timetable, _get_all_schedule

print("Entries before clear:", len(_get_all_schedule("default_student")))
try:
    result = clear_timetable("default_student")
    print("Clear result:", result)
except Exception:
    traceback.print_exc()
print("Entries after clear:", len(_get_all_schedule("default_student")))
