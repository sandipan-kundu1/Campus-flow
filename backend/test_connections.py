import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings
import boto3
from groq import Groq

print("=== Testing Campus Flow Configuration ===\n")

# DynamoDB
try:
    db = boto3.client(
        "dynamodb",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    tables = db.list_tables()["TableNames"]
    print(f"✓ DynamoDB connected | Existing tables: {tables if tables else 'none yet'}")
except Exception as e:
    print(f"✗ DynamoDB failed: {e}")

# S3
try:
    s3 = boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    buckets = [b["Name"] for b in s3.list_buckets()["Buckets"]]
    print(f"✓ S3 connected | Buckets: {buckets}")
except Exception as e:
    print(f"✗ S3 failed: {e}")

# Groq
try:
    client = Groq(api_key=settings.groq_api_key)
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Say 'Groq OK' only."}],
        max_tokens=10,
    )
    print(f"✓ Groq API connected | Response: {resp.choices[0].message.content.strip()}")
except Exception as e:
    print(f"✗ Groq failed: {e}")

# ChromaDB
try:
    import chromadb
    c = chromadb.PersistentClient(path=settings.chroma_db_path)
    col = c.get_or_create_collection("campus_documents")
    print(f"✓ ChromaDB ready | Collection: campus_documents | Count: {col.count()}")
except Exception as e:
    print(f"✗ ChromaDB failed: {e}")

print("\n=== Done ===")
