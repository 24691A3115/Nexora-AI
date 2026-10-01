"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { apiRequest } from "@/lib/api";
import { Settings, Server, Database, Cpu, BookOpen, ShieldCheck, HelpCircle } from "lucide-react";

export default function SettingsPage() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await apiRequest("/chat/status");
        setStatus(data);
      } catch (e) {
        console.error("Status fetch error:", e);
      }
    }
    loadStatus();
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "260px" }}>
        <Navbar title="System Settings & Viva Reference Guide" />

        <main style={{ padding: "2rem" }}>

          {/* System Overview */}
          <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Server size={20} color="var(--accent-primary)" /> Local Stack Architecture Overview
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
              <div style={{ padding: "1rem", background: "rgba(15,23,42,0.6)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Backend API</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "0.25rem" }}>FastAPI (Python)</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>http://localhost:8000</div>
              </div>

              <div style={{ padding: "1rem", background: "rgba(15,23,42,0.6)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Vector DB Engine</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.25rem" }}>FAISS Local Vector Store</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>SentenceTransformers (384-dim)</div>
              </div>

              <div style={{ padding: "1rem", background: "rgba(15,23,42,0.6)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Relational DB</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: "0.25rem" }}>SQLite (nexora.db)</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Users, Docs, Convs, Emails</div>
              </div>

              <div style={{ padding: "1rem", background: "rgba(15,23,42,0.6)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>LLM Execution</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: status?.connected ? "var(--accent-emerald)" : "var(--accent-amber)", marginTop: "0.25rem" }}>
                  {status?.connected ? "Ollama Local Service" : "Intelligent Fallback Engine"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  {status?.connected ? `Model: ${status?.models[0] || "llama3"}` : "Fallback RAG Synthesizer active"}
                </div>
              </div>
            </div>
          </div>

          {/* VIVA EXAM QUICK REFERENCE */}
          <div className="glass-panel" style={{ padding: "2rem", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1.25rem", color: "#a5b4fc", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <BookOpen size={22} color="var(--accent-primary)" /> College Viva Exam Explanation Sheet
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "0.4rem" }}>
                  Q1: What is Retrieval-Augmented Generation (RAG)?
                </h4>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  RAG is an AI technique that combines vector search (Retrieval) with Large Language Models (Generation). Instead of relying on general knowledge, RAG first searches our custom company policy documents in FAISS, retrieves relevant text chunks, and provides them as context to the LLM to generate accurate, hallucination-free answers.
                </p>
              </div>

              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "0.4rem" }}>
                  Q2: How does FAISS and Vector Embedding work in NEXORA AI?
                </h4>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  When a PDF/TXT/DOCX file is uploaded, the document processor extracts text, cleans it, and splits it into 500-character chunks with 50-character overlap. The SentenceTransformer embedder converts text into 384-dimensional mathematical vectors. FAISS (Facebook AI Similarity Search) indexes these vectors and executes fast inner product/cosine similarity search when a user asks a question.
                </p>
              </div>

              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "0.4rem" }}>
                  Q3: What is the Demo / Fallback Mode?
                </h4>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  If Ollama is not installed or running locally, NEXORA AI enters **Demo Fallback Mode**. The system still performs full semantic vector search on FAISS, extracts the top matching document chunks, and formats a structured, intelligent answer with explicit citations so the project can be demonstrated without any external LLM dependencies.
                </p>
              </div>

              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fda4af", marginBottom: "0.4rem" }}>
                  Q4: How does Role-Based Access Control (RBAC) work?
                </h4>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  FastAPI backend enforces JWT bearer token authorization on API routes. Employee role can chat and view documents; HR role can upload policy documents and generate emails; Admin role has full system rights, document deletion, and user management capabilities.
                </p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
