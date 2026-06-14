from sentence_transformers import SentenceTransformer
from app.config import settings

_model = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.hf_model_name)
    return _model

def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.tolist()

def embed_query(query: str) -> list[float]:
    return embed_texts([query])[0]
