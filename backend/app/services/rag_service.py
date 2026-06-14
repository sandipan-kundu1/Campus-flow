import chromadb
from app.config import settings
from app.services.embedding_service import embed_texts, embed_query

_client = None
_collection = None

def get_collection():
    global _client, _collection
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_db_path)
    if _collection is None:
        _collection = _client.get_or_create_collection(
            name="campus_documents",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

def add_document(doc_id: str, text: str, metadata: dict = None):
    collection = get_collection()
    chunks = chunk_text(text)
    if not chunks:
        return
    embeddings = embed_texts(chunks)
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{**(metadata or {}), "doc_id": doc_id, "chunk_index": i} for i in range(len(chunks))]
    collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)

def query_documents(query: str, n_results: int = 5, where: dict = None) -> list[dict]:
    collection = get_collection()
    embedding = embed_query(query)
    
    kwargs = {
        "query_embeddings": [embedding],
        "n_results": min(n_results, collection.count() or 1),
        "include": ["documents", "metadatas", "distances"],
    }
    if where and collection.count() > 0:
        kwargs["where"] = where
        
    results = collection.query(**kwargs)
    docs = []
    if not results or not results.get("documents"):
        return docs
    for i, doc in enumerate(results["documents"][0]):
        docs.append({
            "text": doc,
            "metadata": results["metadatas"][0][i],
            "score": 1 - results["distances"][0][i],
        })
    return docs

def delete_document(doc_id: str):
    collection = get_collection()
    results = collection.get(where={"doc_id": doc_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
