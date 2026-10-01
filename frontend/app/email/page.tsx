"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { apiRequest } from "@/lib/api";
import {
  Mail,
  Sparkles,
  Send,
  Edit3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  User,
  AtSign,
  FileText,
  BookOpen,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailData {
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  rag_context_used?: boolean;
}

interface EmailRecord {
  id: number;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  sent_at: string;
}

// ─── Quick prompt chips ───────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: "3-Day Casual Leave", text: "I want to take 3 days of casual leave starting next Monday." },
  { label: "WFH Request", text: "I would like to work from home for the next 2 days due to personal reasons." },
  { label: "Sick Leave", text: "I am unwell and need to take 2 days of sick leave with medical certificate." },
  { label: "Onboarding Email", text: "Send a welcome onboarding email to a new Senior Developer joining next week." },
  { label: "Resignation Letter", text: "I would like to formally resign from my position with a 2-week notice period." },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmailPage() {
  // Form state
  const [requestText, setRequestText] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [subjectInput, setSubjectInput] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Data state
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [emailHistory, setEmailHistory] = useState<EmailRecord[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // ─── Load history on mount ──────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiRequest("/email/history");
      setEmailHistory(data);
    } catch {
      // silently fail – user may not be authenticated yet
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ─── Auto-dismiss notification ──────────────────────────────────────────────
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(t);
  }, [notification]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleGenerate = async (overrideText?: string) => {
    const text = overrideText ?? requestText;
    if (!text.trim()) return;

    setNotification(null);
    setGenerating(true);
    setIsEditing(false);

    try {
      const res = await apiRequest("/email/generate", {
        method: "POST",
        body: JSON.stringify({
          request_text: text,
          recipient: recipientInput.trim(),
          subject: subjectInput.trim(),
        }),
      });
      setEmailData(res);
      // Pre-fill the form fields from generated data if they were empty
      if (!recipientInput.trim()) setRecipientInput(res.recipient);
      if (!subjectInput.trim()) setSubjectInput(res.subject);
    } catch (err: any) {
      setNotification({ type: "error", msg: `Failed to generate email: ${err.message}` });
    } finally {
      setGenerating(false);
    }
  };

  const handleDemoSend = async () => {
    if (!emailData || sending) return;
    setSending(true);
    setNotification(null);

    try {
      await apiRequest("/email/demo-send", {
        method: "POST",
        body: JSON.stringify({
          recipient: emailData.recipient,
          subject: emailData.subject,
          body: emailData.body,
        }),
      });
      setNotification({ type: "success", msg: "Demo email sent successfully." });
      // Refresh email history
      await loadHistory();
    } catch (err: any) {
      setNotification({ type: "error", msg: `Failed to send email: ${err.message}` });
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    setRequestText("");
    setRecipientInput("");
    setSubjectInput("");
    setEmailData(null);
    setIsEditing(false);
    setNotification(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "260px" }}>
        <Navbar title="AI Email Assistant" />

        <main style={{ padding: "2rem", maxWidth: "1100px" }}>

          {/* ─── Notification Banner ───────────────────────────────────────── */}
          {notification && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.9rem 1.25rem",
                borderRadius: "10px",
                marginBottom: "1.5rem",
                fontWeight: 600,
                fontSize: "0.9rem",
                background: notification.type === "success"
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(244, 63, 94, 0.12)",
                border: `1px solid ${notification.type === "success"
                  ? "rgba(16, 185, 129, 0.35)"
                  : "rgba(244, 63, 94, 0.35)"}`,
                color: notification.type === "success" ? "#34d399" : "#fda4af",
                animation: "slideIn 0.3s ease",
              }}
            >
              {notification.type === "success"
                ? <CheckCircle2 size={20} />
                : <XCircle size={20} />}
              {notification.msg}
            </div>
          )}

          {/* ─── Compose Form ──────────────────────────────────────────────── */}
          <div
            className="glass-panel"
            style={{
              padding: "1.75rem 2rem",
              marginBottom: "1.5rem",
              background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.04) 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
              <div
                style={{
                  padding: "0.5rem",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(6,182,212,0.2) 100%)",
                }}
              >
                <Sparkles size={18} color="var(--accent-primary)" />
              </div>
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                  Generate Smart Enterprise Email
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                  Describe your request in plain language · RAG retrieves relevant company policy automatically
                </p>
              </div>
            </div>

            {/* Request Text */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                <Zap size={13} style={{ display: "inline", marginRight: "4px" }} />
                Your Request *
              </label>
              <textarea
                rows={3}
                className="form-input"
                placeholder='e.g. "I want to take 3 days of casual leave starting next Monday."'
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                style={{ resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" }}
              />
            </div>

            {/* Recipient + Subject row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                  <AtSign size={13} style={{ display: "inline", marginRight: "4px" }} />
                  Recipient <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional – auto-detected)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. HR Department, John Smith"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                  <FileText size={13} style={{ display: "inline", marginRight: "4px" }} />
                  Subject <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional – auto-generated)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Leave Request – 3 Days"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              {/* Quick prompts */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Quick:</span>
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setRequestText(p.text);
                      handleGenerate(p.text);
                    }}
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      color: "var(--text-secondary)",
                      padding: "0.3rem 0.65rem",
                      borderRadius: "20px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.08)";
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Primary + Clear buttons */}
              <div style={{ display: "flex", gap: "0.65rem" }}>
                <button
                  onClick={handleClear}
                  className="btn-secondary"
                  style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
                >
                  <Trash2 size={15} /> Clear
                </button>
                <button
                  onClick={() => handleGenerate()}
                  className="btn-primary"
                  disabled={generating || !requestText.trim()}
                >
                  {generating
                    ? <RefreshCw size={16} className="spin-icon" />
                    : <Sparkles size={16} />}
                  {generating ? "Generating…" : "Generate Email"}
                </button>
              </div>
            </div>
          </div>

          {/* ─── Email Preview Card ─────────────────────────────────────────── */}
          {emailData && (
            <div
              className="glass-panel"
              style={{
                padding: "2rem",
                marginBottom: "1.5rem",
                border: "1px solid rgba(99,102,241,0.35)",
                animation: "fadeSlideUp 0.4s ease",
              }}
            >
              {/* Preview Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.5rem",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Mail size={20} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Email Preview</h3>
                  {emailData.rag_context_used && (
                    <span
                      className="badge badge-emerald"
                      title="This email was enhanced with relevant company policy retrieved via RAG"
                    >
                      <BookOpen size={12} /> RAG Context Applied
                    </span>
                  )}
                </div>
                <span className="badge badge-indigo">Draft Ready</span>
              </div>

              {/* Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", marginBottom: "1.5rem" }}>

                {/* From */}
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: "0.75rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textAlign: "right" }}>
                    From:
                  </label>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                      padding: "0.55rem 0.85rem",
                      background: "rgba(15,23,42,0.5)",
                      borderRadius: "7px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    {emailData.sender}
                  </div>
                </div>

                {/* To */}
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: "0.75rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textAlign: "right" }}>
                    To:
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: "0.55rem 0.85rem", fontSize: "0.9rem" }}
                      value={emailData.recipient}
                      onChange={(e) => setEmailData({ ...emailData, recipient: e.target.value })}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: "var(--accent-cyan)",
                        padding: "0.55rem 0.85rem",
                        background: "rgba(6,182,212,0.06)",
                        borderRadius: "7px",
                        border: "1px solid rgba(6,182,212,0.18)",
                      }}
                    >
                      {emailData.recipient}
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: "0.75rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textAlign: "right" }}>
                    Subject:
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: "0.55rem 0.85rem", fontSize: "0.9rem", fontWeight: 600 }}
                      value={emailData.subject}
                      onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        padding: "0.55rem 0.85rem",
                        background: "rgba(15,23,42,0.5)",
                        borderRadius: "7px",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      {emailData.subject}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "0.75rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textAlign: "right", paddingTop: "0.6rem" }}>
                    Body:
                  </label>
                  {isEditing ? (
                    <textarea
                      rows={10}
                      className="form-input"
                      style={{
                        padding: "0.85rem 1rem",
                        fontSize: "0.9rem",
                        fontFamily: "inherit",
                        lineHeight: "1.65",
                        resize: "vertical",
                      }}
                      value={emailData.body}
                      onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                    />
                  ) : (
                    <div
                      style={{
                        background: "rgba(15,23,42,0.55)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "1.1rem 1.25rem",
                        fontSize: "0.9rem",
                        lineHeight: "1.7",
                        whiteSpace: "pre-wrap",
                        color: "var(--text-primary)",
                      }}
                    >
                      {emailData.body}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "1.1rem",
                  borderTop: "1px solid var(--border-color)",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.65rem" }}>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn-secondary"
                  >
                    <Edit3 size={15} />
                    {isEditing ? "Save Edits" : "Edit Email"}
                  </button>
                  <button
                    onClick={() => handleGenerate()}
                    className="btn-secondary"
                    disabled={generating}
                  >
                    {generating ? <RefreshCw size={15} className="spin-icon" /> : <RefreshCw size={15} />}
                    Regenerate
                  </button>
                  <button onClick={handleClear} className="btn-secondary" style={{ color: "#fda4af", borderColor: "rgba(244,63,94,0.25)" }}>
                    <Trash2 size={15} /> Clear
                  </button>
                </div>

                <button
                  onClick={handleDemoSend}
                  className="btn-primary"
                  disabled={sending}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
                  }}
                >
                  {sending ? <RefreshCw size={16} className="spin-icon" /> : <Send size={16} />}
                  {sending ? "Sending…" : "Demo Send Email"}
                </button>
              </div>
            </div>
          )}

          {/* ─── Email History ──────────────────────────────────────────────── */}
          <div className="glass-panel" style={{ padding: "1.75rem 2rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Clock size={18} color="var(--accent-amber)" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Email History</h3>
                <span
                  style={{
                    background: "rgba(245,158,11,0.15)",
                    color: "#fbbf24",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "0.15rem 0.55rem",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {emailHistory.length}
                </span>
              </div>
              <button
                onClick={loadHistory}
                className="btn-secondary"
                disabled={loadingHistory}
                style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
              >
                <RefreshCw size={14} className={loadingHistory ? "spin-icon" : ""} />
                {loadingHistory ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>
                Loading email history…
              </div>
            ) : emailHistory.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "var(--text-muted)",
                }}
              >
                <Mail size={42} style={{ opacity: 0.2, marginBottom: "0.75rem" }} />
                <p style={{ fontSize: "0.9rem" }}>No emails sent yet.</p>
                <p style={{ fontSize: "0.8rem", marginTop: "0.3rem" }}>Generate an email above and click <strong>Demo Send</strong> to see it here.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {emailHistory.map((record) => (
                  <div
                    key={record.id}
                    style={{
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      overflow: "hidden",
                      background: "rgba(15,23,42,0.45)",
                      transition: "border-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
                    }}
                  >
                    {/* Row header */}
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === record.id ? null : record.id)
                      }
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.85rem 1.1rem",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            padding: "0.4rem",
                            borderRadius: "7px",
                            background: "rgba(16,185,129,0.15)",
                            flexShrink: 0,
                          }}
                        >
                          <Mail size={15} color="var(--accent-emerald)" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.88rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {record.subject}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                            To: <span style={{ color: "var(--accent-cyan)" }}>{record.recipient}</span>
                            &nbsp;·&nbsp;
                            {new Date(record.sent_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                        <span
                          className="badge badge-emerald"
                          style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}
                        >
                          {record.status}
                        </span>
                        {expandedId === record.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {/* Expanded body */}
                    {expandedId === record.id && (
                      <div
                        style={{
                          padding: "0 1.1rem 1.1rem 1.1rem",
                          borderTop: "1px solid var(--border-color)",
                        }}
                      >
                        <div
                          style={{
                            marginTop: "0.85rem",
                            padding: "1rem 1.15rem",
                            background: "rgba(11,15,25,0.7)",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            fontSize: "0.85rem",
                            lineHeight: "1.65",
                            whiteSpace: "pre-wrap",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <div style={{ marginBottom: "0.5rem" }}>
                            <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem" }}>From: </span>
                            <span>{record.sender}</span>
                          </div>
                          {record.body}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Keyframe animations (injected once) */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .spin-icon {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


