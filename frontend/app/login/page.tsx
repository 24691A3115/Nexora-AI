"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Sparkles, Shield, User, Lock, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(res.access_token, res.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setError("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      background: "var(--bg-primary)"
    }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        
        {/* Logo & Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 25px rgba(99, 102, 241, 0.4)",
            marginBottom: "1rem"
          }}>
            <Sparkles size={30} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em" }}>NEXORA AI</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Enterprise Knowledge Assistant & RAG Platform
          </p>
        </div>

        {/* Login Glass Card */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem" }}>Account Sign In</h2>

          {error && (
            <div style={{
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fda4af",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              marginBottom: "1.25rem"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <User size={18} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="email"
                  required
                  placeholder="name@nexora.local"
                  className="form-input"
                  style={{ paddingLeft: "2.75rem" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingLeft: "2.75rem" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", padding: "0.85rem", marginTop: "0.5rem" }}>
              {loading ? "Authenticating..." : "Sign In to Dashboard"} <ArrowRight size={18} />
            </button>
          </form>

          {/* DEMO ACCOUNTS SECTION */}
          <div style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px dashed var(--border-color)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-cyan)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ⚡ Demo Accounts (Click to Quick-Fill)
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => fillDemoAccount("employee@nexora.local", "employee123")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                  textAlign: "left"
                }}
              >
                <div>
                  <strong style={{ color: "#a5b4fc" }}>Employee:</strong> employee@nexora.local
                </div>
                <span className="badge badge-indigo">Pass: employee123</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount("hr@nexora.local", "hr123")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                  textAlign: "left"
                }}
              >
                <div>
                  <strong style={{ color: "#fbbf24" }}>HR Manager:</strong> hr@nexora.local
                </div>
                <span className="badge badge-amber">Pass: hr123</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount("admin@nexora.local", "admin123")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.2)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                  textAlign: "left"
                }}
              >
                <div>
                  <strong style={{ color: "#fda4af" }}>Admin:</strong> admin@nexora.local
                </div>
                <span className="badge" style={{ background: "rgba(244,63,94,0.2)", color: "#fda4af" }}>Pass: admin123</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer link */}
        <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "1.5rem" }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
            Register new account
          </Link>
        </p>
      </div>
    </div>
  );
}
