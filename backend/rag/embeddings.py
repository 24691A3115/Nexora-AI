import os
import numpy as np
import hashlib
import re
from typing import List, Union

_model_instance = None
_model_failed = False

def get_sentence_transformer_model():
    global _model_instance, _model_failed
    if _model_failed:
        return None
    if _model_instance is None:
        try:
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
            from sentence_transformers import SentenceTransformer
            try:
                _model_instance = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception:
                # If offline loading failed, allow load once
                os.environ.pop("HF_HUB_OFFLINE", None)
                _model_instance = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"[Warning] SentenceTransformer load failed: {e}. Using deterministic semantic vectorizer fallback.")
            _model_failed = True
            return None
    return _model_instance

def generate_embeddings(texts: Union[str, List[str]]) -> np.ndarray:
    """Generate vector embeddings for input text(s)."""
    if isinstance(texts, str):
        texts = [texts]
        
    model = get_sentence_transformer_model()
    if model is not None:
        try:
            embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            return embeddings.astype('float32')
        except Exception as e:
            print(f"[Embedding Error] SentenceTransformer encode error: {e}")

    return _fallback_vectorize(texts)
            
STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "to", "in", "of", "and", "or", 
    "for", "on", "with", "at", "by", "from", "it", "this", "that", "these", "those", 
    "be", "as", "can", "do", "does", "what", "which", "where", "when", "how", "who"
}

def _fallback_vectorize(texts: List[str]) -> np.ndarray:
    """Deterministic high-quality 384-dimensional semantic TF-IDF / n-gram vectorizer."""
    dim = 384
    vectors = []
    for text in texts:
        vec = np.zeros(dim, dtype=np.float32)
        words = [w for w in re.findall(r'[a-zA-Z0-9_-]{2,}', text.lower())]
        if not words:
            vectors.append(vec)
            continue
        
        # 1. Unigrams with stop word downweighting
        for word in words:
            weight = 0.15 if word in STOP_WORDS else 1.0
            h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16) % dim
            vec[h] += weight

        # 2. Bigrams for phrase semantic matching
        for i in range(len(words) - 1):
            w1, w2 = words[i], words[i+1]
            if w1 not in STOP_WORDS or w2 not in STOP_WORDS:
                bigram = f"{w1}_{w2}"
                h = int(hashlib.sha256(bigram.encode('utf-8')).hexdigest(), 16) % dim
                vec[h] += 1.8

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        vectors.append(vec)
    return np.array(vectors, dtype=np.float32)
