"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { 
  LayoutDashboard, 
  Bot, 
  FileText, 
  Mail, 
  History, 
  Users, 
  Settings, 
  LogOut,
  Sparkles
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "hr", "employee"] },
    { name: "AI Chat", href: "/chat", icon: Bot, roles: ["admin", "hr", "employee"] },
    { name: "Documents", href: "/documents", icon: FileText, roles: ["admin", "hr", "employee"] },
    { name: "Email Assistant", href: "/email", icon: Mail, roles: ["admin", "hr", "employee"] },
    { name: "Conversation History", href: "/history", icon: History, roles: ["admin", "hr", "employee"] },
    { name: "Users", href: "/users", icon: Users, roles: ["admin"] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ["admin", "hr", "employee"] },
  ];

  return (
    <aside style={{
      width: "260px",
      minHeight: "100vh",
      background: "rgba(11, 15, 25, 0.95)",
      borderRight: "1px solid var(--border-color)",
      display: "flex",
      flexDirection: "column",
      padding: "1.5rem 1rem",
      position: "fixed",
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 50
    }}>
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0 0.5rem 1.5rem 0.5rem", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)"
        }}>
          <Sparkles size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#ffffff" }}>
            NEXORA AI
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>
            Enterprise Knowledge
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "1.5rem", flex: 1 }}>
        {navItems.map((item) => {
          if (user && !item.roles.includes(user.role)) return null;

          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontSize: "0.9rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                background: isActive ? "linear-gradient(90deg, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.05) 100%)" : "transparent",
                borderLeft: isActive ? "3px solid var(--accent-primary)" : "3px solid transparent",
                transition: "all 0.15s ease"
              }}
            >
              <Icon size={18} color={isActive ? "var(--accent-primary)" : "var(--text-muted)"} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Badge */}
      <div style={{
        padding: "1rem",
        borderRadius: "10px",
        background: "rgba(17, 24, 39, 0.6)",
        border: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.full_name || "User"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
            {user?.role || "Employee"} Role
          </div>
        </div>
        <button onClick={logout} style={{ background: "transparent", color: "var(--text-muted)", padding: "0.25rem" }} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
