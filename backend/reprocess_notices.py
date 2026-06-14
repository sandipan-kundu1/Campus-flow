import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app.services import dynamodb_service, rag_service
from app.services.groq_service import summarize_text
from app.config import settings

items = dynamodb_service.scan_items(settings.dynamodb_students_table)
notices = [i for i in items if i.get("type") == "notice" and "mess" not in i.get("title", "").lower()]

print(f"Reprocessing {len(notices)} notice(s)...\n")
for item in notices:
    doc_id = item["id"]
    title = item["title"]
    print(f"Processing: {title}")
    try:
        collection = rag_service.get_collection()
        results = collection.get(where={"doc_id": doc_id}, include=["documents"])
        chunks = results.get("documents", [])
        raw_text = "\n".join(chunks)
    except Exception as e:
        print(f"  ChromaDB error: {e}")
        raw_text = item.get("summary", "")

    if not raw_text.strip():
        print("  No text found, skipping")
        continue

    new_summary = summarize_text(raw_text[:4000])
    print(f"  New summary:\n{new_summary}\n")
    dynamodb_service.update_item(
        settings.dynamodb_students_table,
        {"id": doc_id},
        "SET #s = :s",
        {":s": new_summary},
        {"#s": "summary"},
    )
    print(f"  Updated.\n")

print("Done.")
