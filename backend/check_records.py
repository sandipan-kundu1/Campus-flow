import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))

from app.services import dynamodb_service
from app.config import settings

items = dynamodb_service.scan_items(settings.dynamodb_students_table)
print(f"Total records: {len(items)}\n")
for item in items:
    print(f"ID: {item.get('id')}")
    print(f"  title: {item.get('title')}")
    print(f"  type:  {item.get('type')}")
    print(f"  summary (first 200): {str(item.get('summary',''))[:200]}")
    print()
