import os
import re
from typing import List, Dict, Any

def extract_text_from_file(file_path: str) -> str:
    """Extract raw text from PDF, DOCX, or TXT file."""
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    
    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
            
    elif ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            pages_text = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            text = "\n".join(pages_text)
        except Exception as e:
            # Fallback for pdf reading if pypdf fails
            try:
                import PyPDF2
                reader = PyPDF2.PdfReader(file_path)
                pages_text = [p.extract_text() for p in reader.pages if p.extract_text()]
                text = "\n".join(pages_text)
            except Exception:
                raise ValueError(f"Could not parse PDF file: {str(e)}")
                
    elif ext in [".docx", ".doc"]:
        try:
            import docx
            doc = docx.Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            text = "\n".join(paragraphs)
        except Exception as e:
            raise ValueError(f"Could not parse DOCX file: {str(e)}")
            
    else:
        raise ValueError(f"Unsupported file format: {ext}")
        
    return clean_text(text)

def clean_text(text: str) -> str:
    """Clean extra spaces, formatting artifacts, and normalize linebreaks."""
    if not text:
        return ""
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

def chunk_text(text: str, chunk_size: int = 600, chunk_overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Split text into semantically coherent overlapping chunks.
    Always breaks on numbered section headers (e.g., "4. PROBATION PERIOD")
    to ensure each policy section starts a fresh chunk.
    """
    if not text or not text.strip():
        return []

    # Normalize lines
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return []

    # Group lines into logical segments — ALWAYS split on section headers
    segments = []
    current_segment = []

    for line in lines:
        # Major section header: "# Heading", "1. HEADING", "2. HEADING", etc.
        is_header = bool(
            line.startswith("#") or re.match(r"^\d+[\.\)]\s+[A-Z]", line)
        )
        if is_header and current_segment:
            segments.append("\n".join(current_segment))
            current_segment = [line]
        else:
            current_segment.append(line)

    if current_segment:
        segments.append("\n".join(current_segment))

    chunks = []
    current_chunk = ""
    chunk_id = 0

    for seg in segments:
        # If segment is too large on its own, split by sentences
        if len(seg) > chunk_size:
            sub_parts = re.split(r'(?<=[.!?])\s+', seg)
        else:
            sub_parts = [seg]

        for part in sub_parts:
            part = part.strip()
            if not part:
                continue

            if current_chunk and len(current_chunk) + len(part) + 1 > chunk_size:
                chunk_str = current_chunk.strip()
                chunks.append({
                    "chunk_id": chunk_id,
                    "text": chunk_str,
                    "char_length": len(chunk_str)
                })
                chunk_id += 1

                # Overlap: keep the last ~100 characters / sentences
                if chunk_overlap > 0:
                    words = chunk_str.split()
                    overlap_words = words[-12:] if len(words) > 12 else []
                    current_chunk = (" ".join(overlap_words) + "\n" + part) if overlap_words else part
                else:
                    current_chunk = part
            else:
                if current_chunk:
                    current_chunk += "\n" + part
                else:
                    current_chunk = part

    if current_chunk and current_chunk.strip():
        chunk_str = current_chunk.strip()
        chunks.append({
            "chunk_id": chunk_id,
            "text": chunk_str,
            "char_length": len(chunk_str)
        })

    return chunks
