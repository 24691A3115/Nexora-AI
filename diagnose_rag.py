import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

from rag.vector_store import vector_store
from rag.embeddings import generate_embeddings, get_sentence_transformer_model

print("=== FAISS INDEX DIAGNOSTIC ===")
print(f"Total chunks in metadata: {len(vector_store.chunks_metadata)}")
print(f"FAISS index vectors: {vector_store.index.ntotal if vector_store.index else 'NO FAISS'}")
model = get_sentence_transformer_model()
print(f"Embedding model: {'SentenceTransformer' if model else 'FALLBACK TF-IDF'}")

# Check unique docs
docs = set(m["filename"] for m in vector_store.chunks_metadata)
print(f"Unique documents indexed: {docs}")

# Test all 5 questions
questions = [
    "What are the rules regarding employee probation period?",
    "What is the employee probation period?",
    "Can the probation period be extended?",
    "What happens after successful completion of probation?",
    "How many casual leave days are allowed?",
    "What is the work from home policy?",
]

from rag.rag_pipeline import MIN_SIMILARITY_THRESHOLD

print(f"\nCurrent MIN_SIMILARITY_THRESHOLD: {MIN_SIMILARITY_THRESHOLD}")

for question in questions:
    print(f"\n--- QUERY: {question} ---")
    qvec = generate_embeddings([question])[0]
    results = vector_store.search(qvec, top_k=5)
    passing = [(m, s) for m, s in results if s >= MIN_SIMILARITY_THRESHOLD]
    print(f"  Results: {len(results)} total, {len(passing)} pass threshold")
    for meta, score in results[:3]:
        status = "PASS" if score >= MIN_SIMILARITY_THRESHOLD else "FAIL"
        print(f"  [{status}] score={score:.4f} | {meta['filename']} chunk {meta['chunk_id']}: {meta['text'][:100]}...")
