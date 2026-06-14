"""
Run this script once to create all required DynamoDB tables.
Usage: python setup_dynamodb.py
"""
import boto3
import os
from dotenv import load_dotenv

load_dotenv()

dynamodb = boto3.client(
    "dynamodb",
    region_name=os.getenv("AWS_REGION", "ap-south-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

TABLES = [
    {
        "TableName": os.getenv("DYNAMODB_STUDENTS_TABLE", "students"),
        "KeySchema": [{"AttributeName": "id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": os.getenv("DYNAMODB_SCHEDULES_TABLE", "schedules"),
        "KeySchema": [{"AttributeName": "id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": os.getenv("DYNAMODB_DEADLINES_TABLE", "deadlines"),
        "KeySchema": [{"AttributeName": "id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
]


def create_tables():
    existing = [t["TableName"] for t in dynamodb.list_tables()["TableNames"]]
    for table_def in TABLES:
        name = table_def["TableName"]
        if name in existing:
            print(f"  ✓ Table '{name}' already exists — skipping.")
        else:
            dynamodb.create_table(**table_def)
            print(f"  ✓ Created table '{name}'.")
    print("\nAll tables ready!")


if __name__ == "__main__":
    print("Setting up DynamoDB tables...\n")
    create_tables()
