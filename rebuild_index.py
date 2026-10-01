"""
Rebuild the NEXORA AI FAISS index from scratch.
- Clears stale/duplicate entries (HR_Leave_Policy.txt duplicates)
- Re-processes all sample documents with the updated chunker
- Regenerates embeddings and saves to disk
Run from the project root: python rebuild_index.py
"""
import sys
import os
import glob

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
sys.path.insert(0, BACKEND)
os.chdir(BACKEND)

from database import SessionLocal, engine, Base
from models import User, Document
from rag.document_processor import extract_text_from_file, chunk_text
from rag.embeddings import generate_embeddings
from rag.vector_store import vector_store

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    print("=" * 60)
    print("NEXORA AI — FAISS Index Full Rebuild")
    print("=" * 60)

    # 1. Clear the in-memory vector store
    vector_store.clear_all()
    print("[Step 1] Cleared existing FAISS index and metadata.")

    # 2. Wipe all document DB records so we can re-seed cleanly
    db.query(Document).delete()
    db.commit()
    print("[Step 2] Cleared Document records from SQLite.")

    # 3. Get admin user
    admin = db.query(User).filter(User.role == "admin").first()
    admin_id = admin.id if admin else 1
    admin_name = admin.full_name if admin else "System Admin"

    # 4. Process all sample documents
    sample_dir = os.path.join(ROOT, "sample_documents")
    sample_files = sorted(glob.glob(os.path.join(sample_dir, "*.*")))

    print(f"\n[Step 3] Processing {len(sample_files)} sample documents from: {sample_dir}")
    total_chunks = 0

    for file_path in sample_files:
        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".txt", ".pdf", ".docx"]:
            print(f"  [SKIP] {filename} — unsupported extension")
            continue

        try:
            raw_text = extract_text_from_file(file_path)
            if not raw_text.strip():
                print(f"  [SKIP] {filename} — empty content")
                continue

            chunks = chunk_text(raw_text, chunk_size=600, chunk_overlap=100)
            chunk_texts = [c["text"] for c in chunks]
            embeddings = generate_embeddings(chunk_texts)

            # Create DB record
            doc_rec = Document(
                title=os.path.splitext(filename)[0].replace("_", " ").title(),
                filename=filename,
                file_path=file_path,
                file_type=ext.replace(".", "").upper(),
                file_size=os.path.getsize(file_path),
                chunk_count=len(chunks),
                uploaded_by_id=admin_id,
                uploaded_by_name=admin_name,
                status="processed"
            )
            db.add(doc_rec)
            db.commit()
            db.refresh(doc_rec)

            # Add to vector store
            vector_store.add_document_chunks(
                document_id=doc_rec.id,
                filename=filename,
                chunks=chunks,
                embeddings=embeddings
            )
            total_chunks += len(chunks)
            print(f"  [OK] {filename} — {len(chunks)} chunks indexed (doc_id={doc_rec.id})")

        except Exception as e:
            print(f"  [ERROR] {filename}: {e}")

    print(f"\n[Step 4] Index rebuild complete.")
    print(f"  Total documents: {db.query(Document).count()}")
    print(f"  Total chunks in vector store: {len(vector_store.chunks_metadata)}")
    print(f"  FAISS vectors: {vector_store.index.ntotal if vector_store.index else 'N/A'}")

    # 5. Quick retrieval test
    print("\n[Step 5] Running retrieval self-test...")
    from rag.embeddings import generate_embeddings as ge
    from rag.rag_pipeline import MIN_SIMILARITY_THRESHOLD, synthesize_smart_answer

    test_questions = [
        "What is the employee probation period?",
        "Can the probation period be extended?",
        "What happens after successful completion of probation?",
        "How many casual leave days are allowed?",
        "What is the work from home policy?",
    ]

    for q in test_questions:
        qvec = ge([q])[0]
        results = vector_store.search(qvec, top_k=7)
        passing = [(m, s) for m, s in results if s >= MIN_SIMILARITY_THRESHOLD]
        top_file = results[0][0]["filename"] if results else "N/A"
        top_score = results[0][1] if results else 0
        print(f"  Q: {q[:60]}")
        print(f"     Top match: {top_file} (score={top_score:.4f}) | {len(passing)} chunks pass threshold")

        if passing:
            chunks_only = [m for m, _ in passing]
            answer = synthesize_smart_answer(q, chunks_only)
            print(f"     Answer preview: {answer[:200]}")
        else:
            print("     Answer: [No relevant chunks found]")
        print()

    print("=" * 60)
    print("Rebuild complete! Restart the backend server to apply changes.")
    print("=" * 60)

finally:
    db.close()
