import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Conversation, User
from auth import get_current_user

router = APIRouter(prefix="/conversations", tags=["Conversation History"])

@router.get("")
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List chatbot conversation history. Admin sees all conversations, employees see their own."""
    if current_user.role == "admin":
        convs = db.query(Conversation).order_by(Conversation.created_at.desc()).all()
    else:
        convs = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.created_at.desc()).all()

    result = []
    for c in convs:
        try:
            sources_list = json.loads(c.sources) if c.sources else []
        except Exception:
            sources_list = []
            
        result.append({
            "id": c.id,
            "user_id": c.user_id,
            "user_name": c.user_name,
            "question": c.question,
            "answer": c.answer,
            "sources": sources_list,
            "mode": c.mode,
            "timestamp": c.created_at.isoformat()
        })
    return result
