import re
import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from database import get_db
from models import User, EmailRecord
from auth import get_current_user
from rag.embeddings import generate_embeddings
from rag.vector_store import vector_store
from rag.rag_pipeline import check_ollama_status

router = APIRouter(prefix="/email", tags=["Email Assistant"])

# ─── Request Models ───────────────────────────────────────────────────────────

class GenerateEmailRequest(BaseModel):
    request_text: str
    recipient: Optional[str] = ""
    subject: Optional[str] = ""

class SendEmailRequest(BaseModel):
    recipient: str
    subject: str
    body: str

# ─── RAG Context Helper ───────────────────────────────────────────────────────

MIN_SIMILARITY = 0.25

def get_rag_context(query: str) -> str:
    """Retrieve relevant policy context from FAISS vector store."""
    try:
        if not vector_store.chunks_metadata:
            return ""
        query_vec = generate_embeddings([query])[0]
        results = vector_store.search(query_vec, top_k=3)
        relevant = [(m, s) for m, s in results if s >= MIN_SIMILARITY]
        if not relevant:
            return ""
        blocks = []
        for idx, (meta, _) in enumerate(relevant, 1):
            blocks.append(f"[Policy {idx} – {meta['filename']}]\n{meta['text'][:500]}")
        return "\n\n".join(blocks)
    except Exception:
        return ""


def parse_ollama_email(text: str, fallback_recipient: str, fallback_subject: str) -> dict:
    """Parse structured email from Ollama response text."""
    recipient = fallback_recipient or "HR Department"
    subject = fallback_subject or "Official Communication"
    body = text.strip()
    lines = text.split("\n")
    body_lines = []
    in_body = False
    for line in lines:
        ll = line.lower().strip()
        if ll.startswith("recipient:") or ll.startswith("to:"):
            recipient = line.split(":", 1)[1].strip()
        elif ll.startswith("subject:"):
            subject = line.split(":", 1)[1].strip()
        elif ll.startswith("body:"):
            in_body = True
        elif in_body:
            body_lines.append(line)
    if body_lines:
        body = "\n".join(body_lines).strip()
    return {"recipient": recipient, "subject": subject, "body": body}


def smart_subject(text: str) -> str:
    """Derive a subject line from the request text."""
    t = text.lower()
    nums = re.findall(r"\b(\d+)\b", t)
    duration = (nums[0] + " Day(s)") if nums else ""
    if "casual leave" in t:
        return f"Leave Request – {duration or 'Casual Leave'}"
    if "sick leave" in t or "medical leave" in t:
        return f"Sick Leave Application{' – ' + duration if duration else ''}"
    if "annual leave" in t or "earned leave" in t:
        return f"Annual Leave Request{' – ' + duration if duration else ''}"
    if "leave" in t:
        return f"Leave Application Request{' – ' + duration if duration else ''}"
    if "wfh" in t or "work from home" in t or "remote" in t:
        return "Work From Home Request"
    if "onboard" in t or "welcome" in t:
        return "Welcome Onboarding Notice"
    if "resign" in t:
        return "Resignation Letter"
    if "complaint" in t:
        return "Formal Complaint"
    if "meeting" in t:
        return "Meeting Request"
    if "appraisal" in t or "performance" in t:
        return "Performance Appraisal Discussion"
    words = re.sub(r"[^\w\s]", "", text)[:45].strip()
    return f"Notice: {words}{'…' if len(text) > 45 else ''}"


def generate_fallback_email(request_text: str, user: User, recipient_hint: str, subject_hint: str, rag_context: str) -> dict:
    """Generate professional email using smart templates + RAG context."""
    t = request_text.lower()
    name = user.full_name
    role = user.role.capitalize()

    # Determine recipient
    if recipient_hint:
        recipient = recipient_hint
    elif "manager" in t or "reporting" in t:
        recipient = "Reporting Manager"
    elif "team" in t:
        recipient = "Team"
    else:
        recipient = "HR Department <hr@nexora.local>"

    subject = subject_hint if subject_hint else smart_subject(request_text)

    rag_note = f"\n\nAs per company policy:\n{rag_context[:300].strip()}" if rag_context else ""

    nums = re.findall(r"\b(\d+)\b", request_text)
    days = nums[0] if nums else "a few"

    if "casual leave" in t or ("leave" in t and "casual" in t):
        body = f"""Dear HR Team,

I am writing to formally request {days} day(s) of casual leave.

{request_text.strip()}

I will ensure all pending tasks are addressed before my absence, and I remain reachable for any critical matters.{rag_note}

Kindly review and approve my leave at your earliest convenience.

Regards,
{name}
{role} – Nexora Technologies"""

    elif "sick leave" in t or "medical" in t:
        body = f"""Dear HR Team,

I am writing to inform you that I am unwell and need to take {days} day(s) of sick leave.

{request_text.strip()}

I will submit the required medical certificate upon my return as per company policy.{rag_note}

I apologize for any inconvenience caused and look forward to resuming my duties at the earliest.

Warm regards,
{name}
{role} – Nexora Technologies"""

    elif "leave" in t or "vacation" in t:
        body = f"""Dear HR Team & Manager,

I am writing to formally request {days} day(s) of leave as per my below request:

{request_text.strip()}

I will ensure that all my key responsibilities and ongoing tasks are handed over or completed prior to my leave period. I will remain accessible via email for any urgent matters.{rag_note}

Thank you for your consideration. Please acknowledge this request at your earliest convenience.

Sincerely,
{name}
{role} – Nexora Technologies"""

    elif "wfh" in t or "work from home" in t or "remote" in t:
        body = f"""Dear Manager,

I would like to request permission to Work From Home for the following reason:

{request_text.strip()}

During this period, I will be fully reachable via company email, Slack, and video conferencing platforms. I will strictly adhere to the Nexora WFH & Security guidelines.{rag_note}

Please let me know if you require any additional information.

Thank you for your support.

Best regards,
{name}
{role} – Nexora Technologies"""

    elif "onboard" in t or "welcome" in t or "join" in t:
        body = f"""Dear Team Member,

Welcome aboard Nexora Technologies!

We are thrilled to have you join us. As part of your onboarding process:

{request_text.strip()}

Please review the Employee Onboarding Guide and complete your document verification with HR on Day 1. Your workstation and system credentials will be ready upon arrival.{rag_note}

Do not hesitate to reach out if you have any questions before your start date.

Warm regards,
{name}
Nexora HR / Management"""

    elif "resign" in t:
        body = f"""Dear HR Team & Manager,

I am writing to formally submit my resignation from my position as {role} at Nexora Technologies, effective two weeks from today.

{request_text.strip()}

I am committed to completing all pending responsibilities and ensuring a smooth transition of my duties during the notice period.{rag_note}

Thank you for the valuable opportunities and experiences during my tenure at Nexora.

Sincerely,
{name}
{role} – Nexora Technologies"""

    else:
        body = f"""Dear {recipient.split('<')[0].strip() or 'Team'},

I am writing regarding the following matter:

{request_text.strip()}

Please consider this communication and respond at your earliest convenience.{rag_note}

I appreciate your time and look forward to your response.

Regards,
{name}
{role} – Nexora Technologies"""

    return {
        "recipient": recipient,
        "subject": subject,
        "body": body,
        "sender": f"{name} <{user.email}>",
        "rag_context_used": bool(rag_context),
    }


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/generate")
def generate_email(
    req: GenerateEmailRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a professional email using RAG context + Ollama or smart template fallback."""
    request_text = req.request_text.strip()
    if not request_text:
        raise HTTPException(status_code=400, detail="request_text cannot be empty.")

    # 1. Retrieve RAG policy context
    rag_context = get_rag_context(request_text)

    # 2. Try Ollama LLM if available
    ollama_info = check_ollama_status()
    if ollama_info["connected"]:
        try:
            rag_section = f"\n\nRelevant Company Policy Context:\n{rag_context}\n" if rag_context else ""
            recipient_hint = f" Address it to: {req.recipient}." if req.recipient else ""
            subject_hint = f" Use this subject: {req.subject}." if req.subject else ""

            sys_prompt = f"""You are an AI Email Assistant for NEXORA Technologies. Generate a professional email based on this employee request: "{request_text}".{recipient_hint}{subject_hint}{rag_section}
Return the output in EXACTLY this format (no extra text before or after):
Recipient: [Recipient name or email]
Subject: [Clear Subject Line]
Body:
[Full professional email body, signed by {current_user.full_name}, {current_user.role.capitalize()} – Nexora Technologies]"""

            model = ollama_info["models"][0] if ollama_info["models"] else "llama3"
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": model, "prompt": sys_prompt, "stream": False},
                timeout=12.0,
            )
            if response.status_code == 200:
                text = response.json().get("response", "")
                parsed = parse_ollama_email(text, req.recipient or "", req.subject or "")
                parsed["sender"] = f"{current_user.full_name} <{current_user.email}>"
                parsed["rag_context_used"] = bool(rag_context)
                return parsed
        except Exception:
            pass

    # 3. Smart template fallback
    return generate_fallback_email(
        request_text=request_text,
        user=current_user,
        recipient_hint=req.recipient or "",
        subject_hint=req.subject or "",
        rag_context=rag_context,
    )


@router.post("/demo-send")
def demo_send_email(
    req: SendEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Simulate email sending: save to SQLite email_records, no real SMTP required."""
    if not req.recipient.strip():
        raise HTTPException(status_code=400, detail="Recipient is required.")
    if not req.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required.")
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="Email body is required.")

    record = EmailRecord(
        user_id=current_user.id,
        user_name=current_user.full_name,
        recipient=req.recipient,
        subject=req.subject,
        body=req.body,
        status="sent",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Demo email sent successfully.",
        "email_id": record.id,
        "status": "sent",
        "recipient": record.recipient,
        "subject": record.subject,
        "sent_at": record.sent_at.isoformat(),
    }


@router.get("/history")
def get_email_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all emails generated/sent by the current user (newest first)."""
    records = (
        db.query(EmailRecord)
        .filter(EmailRecord.user_id == current_user.id)
        .order_by(EmailRecord.sent_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "sender": r.user_name,
            "recipient": r.recipient,
            "subject": r.subject,
            "body": r.body,
            "status": r.status,
            "sent_at": r.sent_at.isoformat(),
        }
        for r in records
    ]


@router.get("")
def get_emails_alias(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Alias: GET /email — returns same as /email/history."""
    return get_email_history(db=db, current_user=current_user)
