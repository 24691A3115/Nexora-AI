"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { apiRequest } from "@/lib/api";
import { Bot, User, Send, Sparkles, FileText, AlertCircle, Info, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sources?: string[];
  mode?: string;
  timestamp: string;
}

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Hello! I am NEXORA AI, your Enterprise Knowledge Assistant. Ask me anything about company HR policies, onboarding guidelines, WFH allowances, or code of conduct.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    "What is the leave policy?",
    "How many casual leaves are allowed?",
    "What is the Work From Home (WFH) policy?",
    "What are the company mandatory holidays?",
    "What are the rules regarding employee probation period?"
  ];

  const handleSend = async (qText?: string) => {
    const query = (qText || question).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!qText) setQuestion("");
    setLoading(true);

    try {
      const res = await apiRequest("/chat", {
        method: "POST",
        body: JSON.stringify({ question: query }),
      });

      const assistantMsg: Message = {
        id: `assistant-${res.id}`,
        sender: "assistant",
        text: res.answer,
        sources: res.sources,
        mode: res.mode,
        timestamp: new Date(res.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: "assistant",
          text: `An error occurred while answering your question: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "260px", display: "flex", flexDirection: "column", height: "100vh" }}>
        <Navbar title="AI Knowledge Chatbot (RAG)" />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "1.5rem 2rem" }}>
          
          {/* Sample Starter Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Suggested Queries:
            </span>
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                style={{
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                  color: "#a5b4fc",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  transition: "all 0.15s ease"
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Feed Area */}
          <div className="glass-panel" style={{
            flex: 1,
            padding: "1.5rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            marginBottom: "1rem"
          }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  gap: "0.85rem",
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "82%"
                }}
              >
                {msg.sender === "assistant" && (
                  <div style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 0 10px rgba(99, 102, 241, 0.3)"
                  }}>
                    <Bot size={20} color="#ffffff" />
                  </div>
                )}

                <div style={{
                  background: msg.sender === "user" ? "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)" : "rgba(15, 23, 42, 0.8)",
                  border: msg.sender === "assistant" ? "1px solid var(--border-color)" : "none",
                  padding: "1rem 1.25rem",
                  borderRadius: msg.sender === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: msg.sender === "user" ? "#ffffff" : "var(--accent-cyan)" }}>
                      {msg.sender === "user" ? "You" : "NEXORA AI Assistant"}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: msg.sender === "user" ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}>
                      {msg.timestamp}
                    </span>
                  </div>

                  <div style={{
                    fontSize: "0.92rem",
                    lineHeight: "1.5",
                    color: msg.sender === "user" ? "#ffffff" : "var(--text-primary)",
                    whiteSpace: "pre-wrap"
                  }}>
                    {msg.text}
                  </div>

                  {/* Sources section if available */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{
                      marginTop: "0.85rem",
                      paddingTop: "0.65rem",
                      borderTop: "1px dashed var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem"
                    }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <FileText size={14} /> Source Documents Referenced:
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {msg.sources.map((src, i) => (
                          <span key={i} className="badge badge-emerald">
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.mode && (
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                      Mode: {msg.mode === "ollama" ? "Ollama LLM" : "Local Demo Fallback RAG"}
                    </div>
                  )}
                </div>

                {msg.sender === "user" && (
                  <div style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <User size={20} color="var(--text-primary)" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
                <div style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <RefreshCw size={18} className="animate-spin" color="#ffffff" />
                </div>
                <div style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid var(--border-color)",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "12px",
                  color: "var(--text-muted)",
                  fontSize: "0.85rem"
                }}>
                  Searching FAISS vector database & generating answer...
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: "flex", gap: "0.75rem" }}>
            <input
              type="text"
              placeholder="Ask a question about leave policy, onboarding, WFH rules..."
              className="form-input"
              style={{ flex: 1, padding: "0.9rem 1.25rem", fontSize: "0.95rem" }}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn-primary" disabled={loading || !question.trim()} style={{ padding: "0 1.5rem" }}>
              <Send size={18} />
              <span>Send</span>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
