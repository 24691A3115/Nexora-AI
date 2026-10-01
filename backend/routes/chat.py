import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Conversation
from auth import get_current_user
from rag.rag_pipeline import run_rag_pipeline, check_ollama_status

router = APIRouter(prefix="/chat", tags=["RAG Chat"])

class ChatRequest(BaseModel):
    question: str

@router.post("")
def chat(req: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Execute RAG question answering and save conversation history."""
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    rag_result = run_rag_pipeline(question)

    # Record conversation in SQLite
    conv = Conversation(
        user_id=current_user.id,
        user_name=current_user.full_name,
        question=question,
        answer=rag_result["answer"],
        sources=json.dumps(rag_result["sources"]),
        mode=rag_result["mode"]
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return {
        "id": conv.id,
        "question": conv.question,
        "answer": conv.answer,
        "sources": rag_result["sources"],
        "mode": conv.mode,
        "timestamp": conv.created_at.isoformat(),
        "raw_chunks": rag_result.get("raw_chunks", []),
        "rag_details": rag_result.get("rag_details", {})
    }

@router.get("/status")
def get_ai_status():
    """Get Ollama connection status and available models."""
    status_info = check_ollama_status()
    return status_info
