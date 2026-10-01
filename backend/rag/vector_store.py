import os
import json
import numpy as np
from typing import List, Dict, Any, Tuple

FAISS_INDEX_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "faiss_index.bin")
METADATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "metadata.json")
EMBEDDINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "faiss_index.npy")


class VectorStoreManager:
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.chunks_metadata: List[Dict[str, Any]] = []
        self._all_embeddings: np.ndarray = None
        self.index = None
        self._init_faiss()
        self._load_from_disk()

    def _init_faiss(self):
        """Initialize a fresh FAISS IndexFlatIP (Inner Product = cosine when normalized)."""
        try:
            import faiss
            self.index = faiss.IndexFlatIP(self.dimension)
        except Exception as e:
            print(f"[VectorStore] FAISS import error: {e}. Using NumPy cosine search fallback.")
            self.index = None

    def _rebuild_faiss_from_embeddings(self):
        """Rebuild the FAISS index from scratch using _all_embeddings."""
        if self._all_embeddings is None or len(self._all_embeddings) == 0:
            return
        try:
            import faiss
            self.index = faiss.IndexFlatIP(self.dimension)
            self.index.add(self._all_embeddings.astype("float32"))
            print(f"[VectorStore] FAISS index rebuilt with {self.index.ntotal} vectors.")
        except Exception as e:
            print(f"[VectorStore] FAISS rebuild error: {e}")

    def add_document_chunks(
        self,
        document_id: int,
        filename: str,
        chunks: List[Dict[str, Any]],
        embeddings: np.ndarray,
    ):
        """Add document chunk embeddings and metadata to index."""
        if len(chunks) == 0 or embeddings.shape[0] == 0:
            return

        for idx, chunk in enumerate(chunks):
            meta = {
                "document_id": document_id,
                "filename": filename,
                "chunk_id": chunk["chunk_id"],
                "text": chunk["text"],
            }
            self.chunks_metadata.append(meta)

        # Accumulate all embeddings in memory
        if self._all_embeddings is None or len(self._all_embeddings) == 0:
            self._all_embeddings = embeddings.astype("float32")
        else:
            self._all_embeddings = np.vstack(
                [self._all_embeddings, embeddings.astype("float32")]
            )

        # Rebuild FAISS from all embeddings to keep counts in sync
        self._rebuild_faiss_from_embeddings()
        self._save_to_disk()

        print(
            f"[VectorStore] Added {len(chunks)} chunks for '{filename}'. "
            f"Total: {len(self.chunks_metadata)} chunks / {self.index.ntotal if self.index else 0} vectors."
        )

    def search(
        self, query_embedding: np.ndarray, top_k: int = 5
    ) -> List[Tuple[Dict[str, Any], float]]:
        """Search vector store for relevant chunks matching query embedding."""
        if len(self.chunks_metadata) == 0:
            print("[VectorStore] No chunks in metadata -- index is empty.")
            return []

        if query_embedding.ndim == 1:
            query_embedding = np.expand_dims(query_embedding, axis=0)

        results = []

        if self.index is not None and self.index.ntotal > 0:
            import faiss

            # Sanity check: metadata count must match index vector count
            if len(self.chunks_metadata) != self.index.ntotal:
                print(
                    f"[VectorStore] WARNING: metadata count ({len(self.chunks_metadata)}) "
                    f"!= FAISS vector count ({self.index.ntotal}). Rebuilding index..."
                )
                self._rebuild_faiss_from_embeddings()

            k = min(top_k, self.index.ntotal)
            scores, indices = self.index.search(query_embedding.astype("float32"), k)

            print(f"\n[VectorStore] FAISS Search Results (top {k}):")
            for score, idx in zip(scores[0], indices[0]):
                if 0 <= idx < len(self.chunks_metadata):
                    meta = self.chunks_metadata[idx]
                    print(
                        f"  Similarity: {score:.4f} | File: {meta['filename']} | "
                        f"Chunk {meta['chunk_id']}: {meta['text'][:80]}..."
                    )
                    results.append((meta, float(score)))
                else:
                    print(f"  [!] Invalid index returned by FAISS: {idx}")
        else:
            # Fallback NumPy Cosine Similarity
            print("[VectorStore] Using NumPy cosine similarity fallback.")
            if self._all_embeddings is not None and len(self._all_embeddings) == len(
                self.chunks_metadata
            ):
                scores = np.dot(self._all_embeddings, query_embedding[0])
                top_indices = np.argsort(scores)[::-1][:top_k]
                for idx in top_indices:
                    print(
                        f"  Similarity: {scores[idx]:.4f} | File: {self.chunks_metadata[idx]['filename']}"
                    )
                    results.append((self.chunks_metadata[idx], float(scores[idx])))

        return results

    def remove_document_chunks(self, document_id: int):
        """Remove all chunks associated with a document_id and rebuild index."""
        indices_to_keep = [
            idx
            for idx, meta in enumerate(self.chunks_metadata)
            if meta["document_id"] != document_id
        ]

        self.chunks_metadata = [self.chunks_metadata[i] for i in indices_to_keep]

        if self._all_embeddings is not None and len(indices_to_keep) > 0:
            self._all_embeddings = self._all_embeddings[indices_to_keep]
        else:
            self._all_embeddings = None

        self._rebuild_faiss_from_embeddings()
        self._save_to_disk()

    def _save_to_disk(self):
        """Persist metadata and embeddings to disk."""
        try:
            with open(METADATA_FILE, "w", encoding="utf-8") as f:
                json.dump(self.chunks_metadata, f, indent=2)

            if self._all_embeddings is not None and len(self._all_embeddings) > 0:
                np.save(EMBEDDINGS_FILE, self._all_embeddings)

            # Also write FAISS binary index for reference
            if self.index is not None and self.index.ntotal > 0:
                import faiss
                faiss.write_index(self.index, FAISS_INDEX_FILE)

        except Exception as e:
            print(f"[VectorStore Save Error]: {e}")

    def _load_from_disk(self):
        """
        Load index and metadata from disk on startup.
        Strategy: load embeddings ONLY from .npy (single source of truth),
        then rebuild FAISS from those embeddings.
        This avoids the double-loading bug where vectors get added twice
        (once from .bin and once from .npy), causing index/metadata mismatch.
        """
        try:
            if os.path.exists(METADATA_FILE):
                with open(METADATA_FILE, "r", encoding="utf-8") as f:
                    self.chunks_metadata = json.load(f)
                print(
                    f"[VectorStore] Loaded {len(self.chunks_metadata)} chunk metadata entries."
                )

            # Prefer .npy (raw embeddings) -- always rebuild FAISS fresh from it
            # NEVER load from .bin to avoid double-adding vectors
            if os.path.exists(EMBEDDINGS_FILE):
                self._all_embeddings = np.load(EMBEDDINGS_FILE)
                print(
                    f"[VectorStore] Loaded {len(self._all_embeddings)} embeddings from .npy file."
                )
                if len(self._all_embeddings) != len(self.chunks_metadata):
                    print(
                        f"[VectorStore] WARNING: embedding count ({len(self._all_embeddings)}) "
                        f"!= metadata count ({len(self.chunks_metadata)}). "
                        "Index is stale. Use 'Rebuild RAG Index' in the admin panel to fix."
                    )
                # Rebuild FAISS fresh from .npy
                self._rebuild_faiss_from_embeddings()

        except Exception as e:
            print(f"[VectorStore Load Error]: {e}")

    def clear_all(self):
        """Reset index and metadata completely."""
        self.chunks_metadata = []
        self._all_embeddings = None
        self._init_faiss()
        for f in [METADATA_FILE, EMBEDDINGS_FILE, FAISS_INDEX_FILE]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

    def rebuild_from_scratch(
        self,
        all_chunks_data: List[Dict[str, Any]],
        all_embeddings: np.ndarray,
    ):
        """
        Fully rebuild vector store from provided chunks and embeddings.
        Used by the admin 'Rebuild RAG Index' endpoint.
        """
        self.chunks_metadata = all_chunks_data
        self._all_embeddings = (
            all_embeddings.astype("float32") if all_embeddings is not None else None
        )
        self._rebuild_faiss_from_embeddings()
        self._save_to_disk()
        print(
            f"[VectorStore] Full rebuild complete: {len(self.chunks_metadata)} chunks, "
            f"{self.index.ntotal if self.index else 0} vectors."
        )


vector_store = VectorStoreManager()
