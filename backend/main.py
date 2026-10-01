import os
import sys
import glob

# Ensure backend directory is in sys.path when running from root directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
from models import User, Document
from auth import hash_password

from routes.auth import router as auth_router
from routes.documents import router as doc_router
from routes.chat import router as chat_router
from routes.email import router as email_router
from routes.users import router as user_router
from routes.conversations import router as conv_router
from routes.dashboard import router as dash_router

from rag.document_processor import extract_text_from_file, chunk_text
from rag.embeddings import generate_embeddings
from rag.vector_store import vector_store

def seed_demo_users_and_documents():
    """Auto-seed demo accounts and sample policy documents on startup."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # 1. Seed demo users
        if db.query(User).count() == 0:
            print("[Startup] Seeding initial demo accounts...")
            demo_accounts = [
                {
                    "full_name": "Demo Admin",
                    "email": "admin@nexora.local",
                    "password": "admin123",
                    "role": "admin"
                },
                {
                    "full_name": "Demo HR",
                    "email": "hr@nexora.local",
                    "password": "hr123",
                    "role": "hr"
                },
                {
                    "full_name": "Demo Employee",
                    "email": "employee@nexora.local",
                    "password": "employee123",
                    "role": "employee"
                }
            ]
            for acc in demo_accounts:
                u = User(
                    full_name=acc["full_name"],
                    email=acc["email"],
                    password_hash=hash_password(acc["password"]),
                    role=acc["role"],
                    is_active=True
                )
                db.add(u)
            db.commit()
            print("[Startup] Demo accounts created successfully!")

        # 2. Auto-process sample documents
        sample_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_documents")
        if os.path.exists(sample_dir):
            sample_files = glob.glob(os.path.join(sample_dir, "*.*"))
            existing_filenames = [d.filename for d in db.query(Document).all()]

            admin_user = db.query(User).filter(User.role == "admin").first()
            admin_id = admin_user.id if admin_user else 1
            admin_name = admin_user.full_name if admin_user else "System Admin"

            print(f"[Startup] Checking {len(sample_files)} sample documents from sample_documents/...")

            indexed_files_in_store = set(m.get("filename") for m in vector_store.chunks_metadata)

            for file_path in sample_files:
                filename = os.path.basename(file_path)
                ext = os.path.splitext(filename)[1].lower()
                if ext not in [".txt", ".pdf", ".docx"]:
                    continue

                # Ensure DB record exists
                doc_rec = db.query(Document).filter(Document.filename == filename).first()
                try:
                    raw_text = extract_text_from_file(file_path)
                    if not raw_text.strip():
                        continue
                    chunks = chunk_text(raw_text)

                    if not doc_rec:
                        doc_rec = Document(
                            title=os.path.splitext(filename)[0].title(),
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

                    # Ensure vector store has chunks
                    if filename not in indexed_files_in_store:
                        chunk_texts = [c["text"] for c in chunks]
                        embeddings = generate_embeddings(chunk_texts)
                        vector_store.add_document_chunks(
                            document_id=doc_rec.id,
                            filename=filename,
                            chunks=chunks,
                            embeddings=embeddings
                        )
                        indexed_files_in_store.add(filename)
                        print(f"  [+] Indexed: {filename} ({len(chunks)} chunks)")
                except Exception as e:
                    print(f"  [!] Error indexing {filename}: {e}")
            print(f"[Startup] Documents ready ({len(vector_store.chunks_metadata)} total chunks in vector store).")

    except Exception as e:
        print(f"[Startup Error]: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_demo_users_and_documents()
    yield

app = FastAPI(
    title="NEXORA AI - Enterprise Knowledge Assistant API",
    description="Full-stack FastAPI backend with RAG, FAISS local vector DB, and Email Automation.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(doc_router)
app.include_router(chat_router)
app.include_router(email_router)
app.include_router(user_router)
app.include_router(conv_router)
app.include_router(dash_router)

@app.get("/")
def root():
    return {
        "app": "NEXORA AI",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8008, reload=True)
