from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Document, Conversation, EmailRecord, User
from auth import get_current_user
from rag.rag_pipeline import check_ollama_status

router = APIRouter(prefix="/dashboard", tags=["Dashboard Metrics"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get enterprise dashboard cards, metrics, system status, and recent activity."""
    total_docs = db.query(Document).count()
    total_questions = db.query(Conversation).count()
    total_emails = db.query(EmailRecord).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    # Recent activity stream
    recent_convs = db.query(Conversation).order_by(Conversation.created_at.desc()).limit(5).all()
    recent_docs = db.query(Document).order_by(Document.created_at.desc()).limit(5).all()

    activity = []
    for c in recent_convs:
        activity.append({
            "id": f"conv-{c.id}",
            "type": "question",
            "title": f"Question by {c.user_name}",
            "description": c.question,
            "timestamp": c.created_at.isoformat()
        })
    for d in recent_docs:
        activity.append({
            "id": f"doc-{d.id}",
            "type": "document",
            "title": f"Document uploaded by {d.uploaded_by_name}",
            "description": f"{d.filename} ({d.chunk_count} chunks indexed)",
            "timestamp": d.created_at.isoformat()
        })

    # Sort combined activity by timestamp
    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_activity = activity[:7]

    system_status = check_ollama_status()

    return {
        "metrics": {
            "total_documents": total_docs,
            "total_questions": total_questions,
            "generated_emails": total_emails,
            "active_users": active_users
        },
        "system_status": {
            "ollama_connected": system_status["connected"],
            "models": system_status["models"],
            "active_mode": "Ollama Connected" if system_status["connected"] else "Demo Mode"
        },
        "user_role": current_user.role,
        "recent_activity": recent_activity
    }
