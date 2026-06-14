import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import boto3
from app.config import settings

db = boto3.client(
    'dynamodb',
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key
)

TABLES = ['students', 'schedules', 'deadlines']

# Delete existing tables
print("Deleting old tables...")
for name in TABLES:
    try:
        db.delete_table(TableName=name)
        print(f"  Deleted: {name}")
    except db.exceptions.ResourceNotFoundException:
        print(f"  Not found (skip): {name}")
    except Exception as e:
        print(f"  Error deleting {name}: {e}")

# Wait for deletion
print("Waiting for deletion to complete...")
time.sleep(8)

# Recreate with correct 'id' partition key
DEFINITIONS = [
    {
        "TableName": "students",
        "KeySchema": [{"AttributeName": "id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "schedules",
        "KeySchema": [{"AttributeName": "id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "deadlines",
        "KeySchema": [{"AttributeName": "id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
]

print("Creating tables with correct schema (partition key = 'id')...")
for defn in DEFINITIONS:
    try:
        db.create_table(**defn)
        print(f"  Created: {defn['TableName']}")
    except db.exceptions.ResourceInUseException:
        print(f"  Already exists: {defn['TableName']}")

# Wait for tables to become ACTIVE
print("Waiting for tables to become ACTIVE...")
waiter = db.get_waiter('table_exists')
for name in TABLES:
    waiter.wait(TableName=name)
    print(f"  ACTIVE: {name}")

print("\nAll tables recreated successfully with partition key = 'id'")
