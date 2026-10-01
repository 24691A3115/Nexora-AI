"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Users, UserPlus, Shield, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function UsersPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // New user form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");

  const fetchUsers = async () => {
    try {
      const data = await apiRequest("/users");
      setUsersList(data);
    } catch (e: any) {
      setError("Admin access required to manage user accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      });
      setMessage(`User account ${email} created successfully.`);
      setShowAddModal(false);
      setFullName("");
      setEmail("");
      setPassword("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await apiRequest(`/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      setMessage(`Updated user role to ${newRole}.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to update role.");
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await apiRequest(`/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      setMessage(`User status updated.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to update status.");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "260px" }}>
        <Navbar title="Admin User Management & RBAC Control" />

        <main style={{ padding: "2rem" }}>

          {/* Feedback banners */}
          {message && (
            <div style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              padding: "0.85rem 1.25rem",
              borderRadius: "8px",
              marginBottom: "1.5rem"
            }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fda4af",
              padding: "0.85rem 1.25rem",
              borderRadius: "8px",
              marginBottom: "1.5rem"
            }}>
              {error}
            </div>
          )}

          {/* Header Action */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>User Accounts ({usersList.length})</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Manage system users, grant roles (Admin, HR, Employee), and toggle active access.
              </p>
            </div>

            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <UserPlus size={18} /> Add New User
            </button>
          </div>

          {/* Users Table */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            {loading ? (
              <p style={{ color: "var(--text-muted)" }}>Loading user records...</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>User</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Email</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Current Role</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Account Status</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Created Date</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>{u.full_name}</td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>{u.email}</td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <select
                            className="form-input"
                            style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem", width: "auto" }}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          >
                            <option value="employee">Employee</option>
                            <option value="hr">HR Manager</option>
                            <option value="admin">System Admin</option>
                          </select>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          {u.is_active ? (
                            <span className="badge badge-emerald">Active</span>
                          ) : (
                            <span className="badge" style={{ background: "rgba(244,63,94,0.2)", color: "#fda4af" }}>Deactivated</span>
                          )}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                          <button
                            onClick={() => handleToggleStatus(u.id, u.is_active)}
                            className="btn-secondary"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add User Modal */}
          {showAddModal && (
            <div style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100
            }}>
              <div className="glass-panel" style={{ width: "100%", maxWidth: "440px", padding: "2rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem" }}>Create New User Account</h3>

                <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Full Name</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Email Address</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Password</label>
                    <input
                      type="password"
                      required
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Role</label>
                    <select
                      className="form-input"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="employee">Employee</option>
                      <option value="hr">HR Manager</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                    <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Create Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
