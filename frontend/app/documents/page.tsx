"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FilePlus,
  Layers,
  RefreshCw,
  Database,
} from "lucide-react";

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canUpload = user?.role === "admin" || user?.role === "hr";

  const fetchDocuments = async () => {
    try {
      const data = await apiRequest("/documents");
      setDocuments(data);
    } catch (err: any) {
      setError("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessage("");
    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiRequest("/documents/upload", {
        method: "POST",
        body: formData,
      });
      setMessage(res.message || "Document successfully uploaded and indexed!");
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, filename: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${filename}? This will remove it from FAISS vector index.`
      )
    )
      return;

    try {
      await apiRequest(`/documents/${id}`, { method: "DELETE" });
      setMessage(`Deleted ${filename} successfully.`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete document.");
    }
  };

  const handleRebuildIndex = async () => {
    if (
      !confirm(
        "Rebuild the entire RAG index from scratch?\n\nThis will re-read all documents, re-generate embeddings, and recreate the FAISS index.\n\nThis may take a few seconds."
      )
    )
      return;

    setMessage("");
    setError("");
    setRebuilding(true);

    try {
      const res = await apiRequest("/documents/rebuild-index", {
        method: "POST",
      });
      setMessage(
        `${res.message} (${res.documents_processed} documents, ${res.total_chunks} chunks indexed)`
      );
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || "Failed to rebuild RAG index.");
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "260px" }}>
        <Navbar title="Document Management & FAISS Storage" />

        <main style={{ padding: "2rem" }}>

          {/* Messages */}
          {message && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
                padding: "0.85rem 1.25rem",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <CheckCircle2 size={18} /> {message}
            </div>
          )}

          {error && (
            <div
              style={{
                background: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "#fda4af",
                padding: "0.85rem 1.25rem",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {/* Upload Zone (HR & Admin) */}
          {canUpload && (
            <div
              className="glass-panel"
              style={{ padding: "2rem", marginBottom: "2rem", textAlign: "center" }}
            >
              <div
                style={{
                  border: "2px dashed var(--border-color)",
                  borderRadius: "12px",
                  padding: "2.5rem 1.5rem",
                  background: "rgba(15, 23, 42, 0.4)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "50%",
                    background: "rgba(99, 102, 241, 0.15)",
                    color: "var(--accent-primary)",
                  }}
                >
                  <Upload size={32} />
                </div>

                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    Upload Enterprise Policy Documents
                  </h3>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    Supports PDF, TXT, and DOCX files. Documents are automatically
                    chunked & vectorized into FAISS.
                  </p>
                </div>

                <label
                  className="btn-primary"
                  style={{ cursor: uploading ? "not-allowed" : "pointer" }}
                >
                  <FilePlus size={18} />
                  <span>
                    {uploading ? "Extracting & Vectorizing..." : "Select Document File"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx,.doc"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Rebuild RAG Index Panel (HR & Admin) */}
          {canUpload && (
            <div
              className="glass-panel"
              style={{
                padding: "1.5rem",
                marginBottom: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#fbbf24",
                  }}
                >
                  <Database size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.2rem" }}>
                    Rebuild RAG Index
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    Re-reads all documents, regenerates embeddings, and recreates the
                    FAISS vector index from scratch. Use this if AI answers seem
                    incorrect or outdated.
                  </p>
                </div>
              </div>

              <button
                id="rebuild-rag-index-btn"
                onClick={handleRebuildIndex}
                disabled={rebuilding}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 1.25rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  background: rebuilding
                    ? "rgba(245, 158, 11, 0.08)"
                    : "rgba(245, 158, 11, 0.15)",
                  color: "#fbbf24",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: rebuilding ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  opacity: rebuilding ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!rebuilding)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(245, 158, 11, 0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(245, 158, 11, 0.15)";
                }}
              >
                <RefreshCw
                  size={16}
                  style={{
                    animation: rebuilding ? "spin 1s linear infinite" : "none",
                  }}
                />
                {rebuilding ? "Rebuilding Index..." : "Rebuild RAG Index"}
              </button>
            </div>
          )}

          {/* Document Table */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                Indexed Document Library ({documents.length})
              </h3>
              <span className="badge badge-indigo">FAISS Store</span>
            </div>

            {loading ? (
              <p style={{ color: "var(--text-muted)", padding: "1rem" }}>
                Loading documents...
              </p>
            ) : documents.length === 0 ? (
              <p style={{ color: "var(--text-muted)", padding: "1rem" }}>
                No policy documents uploaded yet.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: "0.9rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        color: "var(--text-muted)",
                      }}
                    >
                      <th style={{ padding: "0.75rem 1rem" }}>Document Title / File</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Format</th>
                      <th style={{ padding: "0.75rem 1rem" }}>FAISS Chunks</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Uploaded By</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Upload Date</th>
                      {canUpload && (
                        <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        style={{ borderBottom: "1px solid var(--border-color)" }}
                      >
                        <td style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <FileText size={18} color="var(--accent-primary)" />
                            <span>{doc.filename}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span className="badge badge-cyan">{doc.file_type}</span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span
                            className="badge badge-emerald"
                            style={{ gap: "0.35rem" }}
                          >
                            <Layers size={14} /> {doc.chunk_count} Chunks
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "0.85rem 1rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {doc.uploaded_by}
                        </td>
                        <td
                          style={{
                            padding: "0.85rem 1rem",
                            color: "var(--text-muted)",
                            fontSize: "0.8rem",
                          }}
                        >
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        {canUpload && (
                          <td
                            style={{ padding: "0.85rem 1rem", textAlign: "right" }}
                          >
                            <button
                              onClick={() => handleDelete(doc.id, doc.filename)}
                              className="btn-danger"
                              title="Delete from FAISS"
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </main>
      </div>
    </div>
  );
}
