"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Sparkles, LogOut, Shield, User as UserIcon } from "lucide-react";

export default function Navbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const [aiStatus, setAiStatus] = useState<{ connected: boolean; models: string[] }>({
    connected: false,
    models: []
  });

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await apiRequest("/chat/status");
        setAiStatus(res);
      } catch (e) {
        setAiStatus({ connected: false, models: [] });
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "admin":
        return <span className="badge badge-rose" style={{ background: "rgba(244,63,94,0.15)", color: "#fda4af", border: "1px solid rgba(244,63,94,0.3)" }}>ADMIN</span>;
      case "hr":
        return <span className="badge badge-amber">HR MANAGER</span>;
      default:
        return <span className="badge badge-indigo">EMPLOYEE</span>;
    }
  };

  return (
    <header style={{
      height: "70px",
      borderBottom: "1px solid var(--border-color)",
      background: "rgba(11, 15, 25, 0.8)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
      position: "sticky",
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {/* AI Status Indicator Badge */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "rgba(17, 24, 39, 0.9)",
          border: "1px solid var(--border-color)",
          padding: "0.4rem 0.85rem",
          borderRadius: "20px",
          fontSize: "0.8rem",
          fontWeight: 600
        }}>
          <span className={`status-dot ${aiStatus.connected ? "connected" : "demo"}`}></span>
          <span style={{ color: aiStatus.connected ? "#34d399" : "#fbbf24" }}>
            {aiStatus.connected ? "Ollama Connected" : "Demo Mode"}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            {aiStatus.connected ? `(${aiStatus.models[0] || "llama3"})` : "(Local RAG Fallback)"}
          </span>
        </div>

        {/* User Info & Role Badge */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{user.full_name}</div>
              <div style={{ fontSize: "0.75rem" }}>{getRoleBadge(user.role)}</div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="btn-secondary"
              style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
