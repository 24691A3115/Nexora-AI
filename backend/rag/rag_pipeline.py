import re
import requests
from typing import Dict, Any, List
from rag.embeddings import generate_embeddings, get_sentence_transformer_model
from rag.vector_store import vector_store

OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_TAGS_URL = "http://localhost:11434/api/tags"
DEFAULT_MODEL = "llama3"

# Minimum cosine similarity to consider a chunk relevant.
# Keep this low since cosine similarity with sentence-transformers
# often produces scores in the 0.3-0.7 range for truly relevant text.
MIN_SIMILARITY_THRESHOLD = 0.25


def check_ollama_status() -> Dict[str, Any]:
    """Check if local Ollama server is running and accessible."""
    try:
        res = requests.get(OLLAMA_TAGS_URL, timeout=1.5)
        if res.status_code == 200:
            data = res.json()
            models = [m.get("name") for m in data.get("models", [])]
            return {"connected": True, "models": models}
    except Exception:
        pass
    return {"connected": False, "models": []}


def run_rag_pipeline(question: str) -> Dict[str, Any]:
    """Main RAG execution flow with dual Ollama & Demo Fallback capability."""
    # Determine embedding model name
    st_model = get_sentence_transformer_model()
    embedding_model = (
        "Sentence Transformers (all-MiniLM-L6-v2)"
        if st_model
        else "TF-IDF Fallback Vectorizer"
    )
    total_docs = (
        len(set(m["document_id"] for m in vector_store.chunks_metadata))
        if vector_store.chunks_metadata
        else 0
    )

    if not question or not question.strip():
        return {
            "answer": "Please ask a specific question regarding company policies or documents.",
            "sources": [],
            "mode": "demo",
            "raw_chunks": [],
            "rag_details": {
                "docs_searched": total_docs,
                "chunks_retrieved": 0,
                "vector_search": "FAISS",
                "embedding_model": embedding_model,
            },
        }

    print(f"\n[RAG] Question: {question}")
    print(f"[RAG] Total indexed chunks: {len(vector_store.chunks_metadata)}")

    # 1. Embed user question
    query_vector = generate_embeddings([question])[0]

    # 2. Retrieve top-7 relevant chunks from FAISS vector store (increased for better coverage)
    search_results = vector_store.search(query_vector, top_k=7)

    # 3. Accept chunks above the minimum similarity threshold.
    #    We intentionally keep this threshold LOW because:
    #    - all-MiniLM-L6-v2 cosine scores for relevant content often fall 0.3-0.7
    #    - We do NOT want to reject valid answers
    #    - Worst case: the demo synthesizer will pick the most relevant sentence
    relevant_chunks = []
    sources_set = set()

    print(f"[RAG] Applying similarity threshold >= {MIN_SIMILARITY_THRESHOLD}")
    for meta, score in search_results:
        if score >= MIN_SIMILARITY_THRESHOLD:
            relevant_chunks.append((meta, float(score)))
            sources_set.add(meta["filename"])
            print(
                f"  [+] ACCEPTED | score={score:.4f} | {meta['filename']} "
                f"chunk {meta['chunk_id']}: {meta['text'][:100]}..."
            )
        else:
            print(
                f"  [-] REJECTED | score={score:.4f} | {meta['filename']} "
                f"chunk {meta['chunk_id']}"
            )

    # Note: No fallback to low-scoring results.
    # If nothing meets the threshold, return "not found".
    # This ensures Test 4 (salary - no docs) correctly returns "not found"
    # instead of hallucinating from unrelated documents.

    # Build raw_chunks list for frontend collapsible view
    raw_chunks_payload = [
        {
            "filename": m["filename"],
            "text": m["text"],
            "score": round(score, 4),
            "chunk_id": m.get("chunk_id", 0),
        }
        for m, score in relevant_chunks
    ]

    rag_details = {
        "docs_searched": total_docs,
        "chunks_retrieved": len(relevant_chunks),
        "vector_search": "FAISS (IndexFlatIP / Cosine)",
        "embedding_model": embedding_model,
    }

    # If no relevant chunks found
    if not relevant_chunks:
        print("[RAG] No relevant chunks found. Returning 'not found' message.")
        return {
            "answer": "I could not find this information in the uploaded company documents.",
            "sources": [],
            "mode": "demo",
            "raw_chunks": [],
            "rag_details": rag_details,
        }

    chunks_only = [m for m, _ in relevant_chunks]

    # Prepare context string for LLM
    context_blocks = []
    for idx, chunk in enumerate(chunks_only, 1):
        context_blocks.append(f"[Source {idx}: {chunk['filename']}]\n{chunk['text']}")
    context_text = "\n\n".join(context_blocks)

    print(
        f"[RAG] {len(relevant_chunks)} relevant chunks found from: {list(sources_set)}"
    )

    # 4. Try Ollama first
    ollama_info = check_ollama_status()

    if ollama_info["connected"]:
        try:
            prompt = f"""You are NEXORA AI, an Enterprise Knowledge Assistant. Answer the user's question strictly based on the provided company document context below. Give a concise, clear, professional answer in 1-3 sentences. Do not quote chunks verbatim. If the information is not present in the context, respond with exactly: "I could not find this information in the uploaded company documents."

CONTEXT:
{context_text}

USER QUESTION:
{question}

ANSWER:"""

            model_to_use = (
                ollama_info["models"][0] if ollama_info["models"] else DEFAULT_MODEL
            )

            response = requests.post(
                OLLAMA_API_URL,
                json={"model": model_to_use, "prompt": prompt, "stream": False},
                timeout=15.0,
            )

            if response.status_code == 200:
                answer_text = response.json().get("response", "").strip()
                if answer_text:
                    return {
                        "answer": answer_text,
                        "sources": list(sources_set),
                        "mode": "ollama",
                        "raw_chunks": raw_chunks_payload,
                        "rag_details": {**rag_details, "llm": model_to_use},
                    }
        except Exception as e:
            print(f"[Ollama Call Exception]: {e}. Falling back to Demo Mode.")

    # 5. DEMO / FALLBACK MODE -- smart synthesizer
    answer_text = synthesize_smart_answer(question, chunks_only)

    if answer_text == "I could not find this information in the uploaded company documents.":
        return {
            "answer": answer_text,
            "sources": [],
            "mode": "demo",
            "raw_chunks": [],
            "rag_details": {**rag_details, "chunks_retrieved": 0},
        }

    return {
        "answer": answer_text,
        "sources": list(sources_set),
        "mode": "demo",
        "raw_chunks": raw_chunks_payload,
        "rag_details": rag_details,
    }



def synthesize_smart_answer(question: str, chunks: List[Dict[str, Any]]) -> str:
    """
    Generate a clean, professional answer by extracting the most relevant
    sentences from retrieved chunks, with improved scoring that handles:
    - Multi-word phrase matching (bigrams)
    - Section-aware context (lines near matching headings score higher)
    - Overlap text from chunking (de-prioritized)
    - Bullet-point fact detection
    """
    question_lower = question.lower()

    # Extract meaningful content words from the question
    stop_words = {
        "what", "which", "where", "when", "who", "how", "are", "the", "is", "for",
        "and", "about", "any", "can", "does", "this", "that", "with", "tell", "many",
        "much", "all", "some", "each", "give", "list", "explain", "describe", "after",
        "during", "before", "upon", "will", "has", "have", "get", "be", "do",
        "company", "policy", "policies", "rules", "regarding", "rule", "please",
        "know", "information", "guidelines", "detail", "details", "mention", "mentioned"
    }
    question_words = [w for w in re.findall(r"\w{3,}", question_lower) if w not in stop_words]
    question_words_set = set(question_words)

    # Build bigram phrases from the question for phrase-level matching
    question_bigrams = set()
    for i in range(len(question_words) - 1):
        question_bigrams.add(f"{question_words[i]} {question_words[i+1]}")

    print(f"[Synthesizer] Keywords: {question_words_set} | Bigrams: {question_bigrams}")

    candidate_lines = []

    for chunk in chunks:
        doc_name = re.sub(r"\.(txt|pdf|docx)$", "", chunk["filename"], flags=re.IGNORECASE)
        raw_lines = chunk["text"].split("\n")

        # Track which section heading we are under
        current_section_relevant = False

        for line_idx, line in enumerate(raw_lines):
            line = line.strip()
            if not line or len(line) < 15:
                continue

            line_lower = line.lower()

            # Detect section headers (lines starting with # or "N. HEADING")
            is_section_header = bool(re.match(r"^(#+\s|[\d]+\.\s+[A-Z])", line))
            if is_section_header:
                # Check if this section header is about the query topic
                header_score = sum(1 for w in question_words_set if w in line_lower)
                header_bigram = sum(2 for b in question_bigrams if b in line_lower)
                current_section_relevant = (header_score + header_bigram) >= 1

            # --- Score the line ---
            keyword_score = sum(1.5 for w in question_words_set if w in line_lower)
            bigram_score = sum(3.0 for b in question_bigrams if b in line_lower)
            section_score = 1.5 if (current_section_relevant and not is_section_header) else 0.0

            relevance_base = keyword_score + bigram_score + section_score

            # Skip section headers themselves (we only use them as context)
            if is_section_header:
                continue

            # Must have at least one keyword, phrase, or section match to be considered
            if relevance_base <= 0:
                continue

            score = relevance_base
            # Bullet/fact bonus (lines with numbers or list markers contain policy facts)
            if re.search(r"\d+", line):
                score += 0.8
            if re.match(r"^[-•*]", line) or ":" in line:
                score += 0.5

            candidate_lines.append((score, line, doc_name))

    if not candidate_lines:
        return "I could not find this information in the uploaded company documents."

    # Sort by score descending
    candidate_lines.sort(key=lambda x: x[0], reverse=True)
    best_score = candidate_lines[0][0]
    min_line_score = max(best_score * 0.35, 1.2)

    seen_normalized = set()
    top_lines = []
    for score, line, doc_name in candidate_lines:
        if score < min_line_score and len(top_lines) >= 2:
            break
        # Normalize: lowercase + collapse whitespace for dedup
        normalized = re.sub(r"\s+", " ", line.lower()).strip()
        # Skip lines that are nearly identical to an already-picked line
        if any(
            len(set(normalized.split()) & set(seen.split())) / max(len(normalized.split()), 1) > 0.75
            for seen in seen_normalized
        ):
            continue
        seen_normalized.add(normalized)
        top_lines.append((line, doc_name))
        if len(top_lines) >= 5:
            break

    # Determine the primary document name
    primary_doc = top_lines[0][1] if top_lines else re.sub(
        r"\.(txt|pdf|docx)$", "", chunks[0]["filename"], flags=re.IGNORECASE
    )

    # Build final answer
    answer_parts = [f"According to the **{primary_doc}**:", ""]

    if len(top_lines) == 1:
        clean_line = re.sub(r"^[-•*]\s*", "", top_lines[0][0]).strip()
        answer_parts.append(clean_line)
    else:
        for line, _ in top_lines:
            clean_line = re.sub(r"^[-•*]\s*", "", line).strip()
            answer_parts.append(f"- {clean_line}")

    return "\n".join(answer_parts)

