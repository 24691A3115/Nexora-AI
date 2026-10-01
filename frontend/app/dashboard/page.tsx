"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { apiRequest } from "@/lib/api";
import { 
  FileText, 
  HelpCircle, 
  Mail, 
  Users, 
  Sparkles, 
  ArrowRight, 
  Activity, 
  Bot, 
  ShieldCheck, 
  Server
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await apiRequest("/dashboard/stats");
        setStats(data);
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "260px" }}>
        <Navbar title="Enterprise Dashboard" />

        <main style={{ padding: "2rem" }}>
          
          {/* Welcome & System Status Banner */}
          <div className="glass-panel" style={{
            padding: "1.75rem 2rem",
            marginBottom: "2rem",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.25)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <span className="badge badge-indigo">NEXORA AI V1.0</span>
                  {stats?.system_status?.ollama_connected ? (
                    <span className="badge badge-emerald">Ollama LLM Active</span>
                  ) : (
                    <span className="badge badge-amber">Demo Fallback RAG Active</span>
                  )}
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Welcome to Nexora Knowledge Assistant</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                  Query enterprise policy documents, search semantic FAISS vectors, and draft automated AI emails instantly.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Link href="/chat" className="btn-primary">
                  <Bot size={18} /> Launch AI Chat
                </Link>
                <Link href="/email" className="btn-secondary">
                  <Mail size={18} /> Draft Email
                </Link>
              </div>
            </div>
          </div>

          {/* 4 Key Metrics Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem"
          }}>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Total Documents</span>
                <div style={{ padding: "0.5rem", background: "rgba(99, 102, 241, 0.15)", borderRadius: "8px" }}>
                  <FileText size={20} color="var(--accent-primary)" />
                </div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>{loading ? "..." : stats?.metrics?.total_documents || 0}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Indexed into FAISS</div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Total Questions</span>
                <div style={{ padding: "0.5rem", background: "rgba(6, 182, 212, 0.15)", borderRadius: "8px" }}>
                  <HelpCircle size={20} color="var(--accent-cyan)" />
                </div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>{loading ? "..." : stats?.metrics?.total_questions || 0}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Semantic queries processed</div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Generated Emails</span>
                <div style={{ padding: "0.5rem", background: "rgba(16, 185, 129, 0.15)", borderRadius: "8px" }}>
                  <Mail size={20} color="var(--accent-emerald)" />
                </div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>{loading ? "..." : stats?.metrics?.generated_emails || 0}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Drafted & sent via demo</div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Active Users</span>
                <div style={{ padding: "0.5rem", background: "rgba(245, 158, 11, 0.15)", borderRadius: "8px" }}>
                  <Users size={20} color="var(--accent-amber)" />
                </div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>{loading ? "..." : stats?.metrics?.active_users || 0}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>RBAC role accounts</div>
            </div>
          </div>

          {/* Activity & Quick Actions Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
            
            {/* Recent Activity Feed */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Activity size={18} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Recent Activity</h3>
                </div>
                <Link href="/history" style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: 600 }}>
                  View All History →
                </Link>
              </div>

              {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading activity stream...</p>
              ) : stats?.recent_activity?.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No recent activity recorded yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {stats?.recent_activity?.map((act: any) => (
                    <div key={act.id} style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.85rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      background: "rgba(15, 23, 42, 0.5)",
                      border: "1px solid var(--border-color)"
                    }}>
                      <div style={{
                        padding: "0.4rem",
                        borderRadius: "6px",
                        background: act.type === "question" ? "rgba(99, 102, 241, 0.15)" : "rgba(6, 182, 212, 0.15)",
                        marginTop: "0.1rem"
                      }}>
                        {act.type === "question" ? <HelpCircle size={16} color="var(--accent-primary)" /> : <FileText size={16} color="var(--accent-cyan)" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{act.title}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>{act.description}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                          {new Date(act.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Overview Side Panel */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>System Status</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid var(--border-color)"
                }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>RAG Vector Engine</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.25rem" }}>
                    FAISS + SentenceTransformers
                  </div>
                </div>

                <div style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid var(--border-color)"
                }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Database Storage</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "0.25rem" }}>
                    SQLite (nexora.db)
                  </div>
                </div>

                <div style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid var(--border-color)"
                }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>LLM Execution Engine</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: stats?.system_status?.ollama_connected ? "var(--accent-emerald)" : "var(--accent-amber)", marginTop: "0.25rem" }}>
                    {stats?.system_status?.ollama_connected ? "Ollama Connected" : "Local Demo Fallback"}
                  </div>
                </div>

                <Link href="/documents" className="btn-secondary" style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}>
                  <FileText size={16} /> Manage Documents
                </Link>
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
