import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))

from app.services import dynamodb_service, rag_service
from app.services.groq_service import extract_mess_menu
from app.config import settings

# Find mess menu records
items = dynamodb_service.scan_items(settings.dynamodb_students_table)
mess_items = [i for i in items if "mess" in i.get("title", "").lower()]
print(f"Found {len(mess_items)} mess menu record(s)\n")

for item in mess_items:
    doc_id = item["id"]
    title = item["title"]
    print(f"Reprocessing: {title} (id={doc_id})")

    # Get raw text chunks from ChromaDB
    try:
        collection = rag_service.get_collection()
        results = collection.get(where={"doc_id": doc_id}, include=["documents"])
        chunks = results.get("documents", [])
        raw_text = "\n".join(chunks)
        print(f"  Raw text from ChromaDB ({len(raw_text)} chars): {raw_text[:300]}...")
    except Exception as e:
        print(f"  ChromaDB fetch failed: {e}")
        raw_text = ""

    if not raw_text.strip():
        print("  No raw text found — cannot reprocess. Please re-upload the file.")
        continue

    # Re-extract with proper mess menu prompt
    print("  Running extract_mess_menu()...")
    new_summary = extract_mess_menu(raw_text)
    print(f"  New content ({len(new_summary)} chars):\n{new_summary[:500]}")

    # Update DynamoDB record
    dynamodb_service.update_item(
        settings.dynamodb_students_table,
        {"id": doc_id},
        "SET #s = :s",
        {":s": new_summary},
        {"#s": "summary"},
    )
    print(f"  Updated DynamoDB record for {doc_id}\n")

print("Done.")
