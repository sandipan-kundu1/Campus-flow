import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app.services import dynamodb_service
from app.config import settings

dynamodb_service.delete_item(settings.dynamodb_students_table, {"id": "f6c29e08-225f-4519-beeb-b2c343a3ecf7"})
print("Deleted test record")
items = dynamodb_service.scan_items(settings.dynamodb_students_table)
print("Remaining records:", [(i.get("id"), i.get("title")) for i in items])
