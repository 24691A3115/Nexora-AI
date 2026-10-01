"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { History, FileText, User, HelpCircle, Bot, Search } from "lucide-react";

export default function HistoryPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await apiRequest("/conversations");
        setConversations(data);
      } catch (e) {
        console.error("History load error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const filteredConversations = conversations.filter((c) =>
    c.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "260px" }}>
        <Navbar title="RAG Conversation History" />

        <main style={{ padding: "2rem" }}>

          {/* Search Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Search Chat History</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {user?.role === "admin" ? "Admin Audit Mode: Viewing all user conversations" : "Viewing your recorded chatbot interactions"}
              </p>
            </div>

            <div style={{ width: "300px", position: "relative" }}>
              <Search size={18} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search history questions..."
                className="form-input"
                style={{ paddingLeft: "2.75rem", fontSize: "0.85rem" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversation Cards List */}
          {loading ? (
            <p style={{ color: "var(--text-muted)" }}>Loading conversation history...</p>
          ) : filteredConversations.length === 0 ? (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              No conversation history found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {filteredConversations.map((c) => (
                <div key={c.id} className="glass-panel" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="badge badge-indigo" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <User size={12} /> {c.user_name}
                      </span>
                      <span className="badge badge-cyan">{c.mode === "ollama" ? "Ollama LLM" : "Demo Fallback"}</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {new Date(c.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {/* Question */}
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <HelpCircle size={18} color="var(--accent-primary)" style={{ marginTop: "0.15rem", flexShrink: 0 }} />
                    <span>{c.question}</span>
                  </div>

                  {/* Answer */}
                  <div style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid var(--border-color)",
                    padding: "1rem 1.25rem",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    color: "var(--text-secondary)",
                    marginBottom: "0.75rem"
                  }}>
                    {c.answer}
                  </div>

                  {/* Sources */}
                  {c.sources && c.sources.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontWeight: 600 }}>Sources:</span>
                      {c.sources.map((src: string, idx: number) => (
                        <span key={idx} className="badge badge-emerald">
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
