import os
import shutil
import glob
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from database import get_db
from models import Document, User
from auth import get_current_user, require_role
from rag.document_processor import extract_text_from_file, chunk_text
from rag.embeddings import generate_embeddings
from rag.vector_store import vector_store

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sample_documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "hr"]))
):
    """Upload and process PDF, TXT, or DOCX document (HR & Admin only)."""
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()

    if ext not in [".txt", ".pdf", ".docx", ".doc"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload PDF, TXT, or DOCX files."
        )

    saved_path = os.path.join(UPLOAD_DIR, filename)
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Extract text & chunk
        raw_text = extract_text_from_file(saved_path)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Document appears to be empty or unreadable.")

        chunks = chunk_text(raw_text)
        chunk_texts = [c["text"] for c in chunks]

        # Generate embeddings
        embeddings = generate_embeddings(chunk_texts)

        # Create database record
        doc_record = Document(
            title=os.path.splitext(filename)[0].replace("_", " ").title(),
            filename=filename,
            file_path=saved_path,
            file_type=ext.replace(".", "").upper(),
            file_size=os.path.getsize(saved_path),
            chunk_count=len(chunks),
            uploaded_by_id=current_user.id,
            uploaded_by_name=current_user.full_name,
            status="processed"
        )
        db.add(doc_record)
        db.commit()
        db.refresh(doc_record)

        # Add to FAISS vector store index
        vector_store.add_document_chunks(
            document_id=doc_record.id,
            filename=filename,
            chunks=chunks,
            embeddings=embeddings
        )

        return {
            "message": "Document uploaded and indexed successfully.",
            "document": {
                "id": doc_record.id,
                "title": doc_record.title,
                "filename": doc_record.filename,
                "chunk_count": doc_record.chunk_count,
                "uploaded_by": doc_record.uploaded_by_name,
                "created_at": doc_record.created_at.isoformat()
            }
        }
    except Exception as e:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@router.get("")
def list_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all indexed documents."""
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "filename": d.filename,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "chunk_count": d.chunk_count,
            "uploaded_by": d.uploaded_by_name,
            "status": d.status,
            "created_at": d.created_at.isoformat()
        } for d in docs
    ]


@router.post("/rebuild-index", status_code=status.HTTP_200_OK)
def rebuild_rag_index(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "hr"]))
):
    """
    Rebuild the entire FAISS RAG index from scratch using all documents in the DB.
    Re-reads every document file, re-extracts text, re-chunks, and re-embeds.
    This fixes stale index issues caused by model upgrades or corruption.
    Admin & HR only.
    """
    docs = db.query(Document).all()
    if not docs:
        raise HTTPException(status_code=404, detail="No documents found to index.")

    all_chunks_data = []
    all_embeddings_list = []
    processed = []
    errors = []

    for doc in docs:
        file_path = doc.file_path

        # Try sample_documents fallback if uploads path is missing
        if not os.path.exists(file_path):
            sample_path = os.path.join(SAMPLE_DIR, doc.filename)
            if os.path.exists(sample_path):
                file_path = sample_path
            else:
                errors.append(f"File not found: {doc.filename}")
                continue

        try:
            raw_text = extract_text_from_file(file_path)
            if not raw_text.strip():
                errors.append(f"Empty content: {doc.filename}")
                continue

            chunks = chunk_text(raw_text)
            chunk_texts = [c["text"] for c in chunks]
            embeddings = generate_embeddings(chunk_texts)

            # Update chunk_count in DB
            doc.chunk_count = len(chunks)
            db.commit()

            for chunk in chunks:
                all_chunks_data.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "chunk_id": chunk["chunk_id"],
                    "text": chunk["text"],
                })

            all_embeddings_list.append(embeddings)
            processed.append(doc.filename)
            print(f"[RebuildIndex] Processed: {doc.filename} ({len(chunks)} chunks)")

        except Exception as e:
            errors.append(f"{doc.filename}: {str(e)}")
            print(f"[RebuildIndex] Error processing {doc.filename}: {e}")

    if not all_chunks_data:
        raise HTTPException(
            status_code=500,
            detail=f"Could not process any documents. Errors: {errors}"
        )

    import numpy as np
    all_embeddings = np.vstack(all_embeddings_list).astype("float32")

    # Completely rebuild the vector store
    vector_store.rebuild_from_scratch(all_chunks_data, all_embeddings)

    return {
        "message": "RAG index rebuilt successfully.",
        "documents_processed": len(processed),
        "total_chunks": len(all_chunks_data),
        "processed_files": processed,
        "errors": errors,
    }


@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "hr"]))
):
    """Delete a document from DB and vector index (HR & Admin only)."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove from FAISS vector store
    vector_store.remove_document_chunks(doc.id)

    # Remove file from disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully."}
