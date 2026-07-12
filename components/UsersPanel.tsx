"use client";

import { useState, useEffect, useCallback } from "react";

type Role = "customer" | "support" | "admin";

interface UserRow {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

const ROLE_COLORS: Record<Role, { bg: string; text: string }> = {
  customer: { bg: "#e0f2fe", text: "#0369a1" },
  support:  { bg: "#ede9fe", text: "#5b21b6" },
  admin:    { bg: "#fef3c7", text: "#92400e" },
};

export function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/users");
    if (r.ok) {
      const data = await r.json();
      if (data.success) setUsers(data.users);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeRole(userId: string, role: Role) {
    setUpdating(userId);
    try {
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await r.json();
      if (data.success) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
        User Management
        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>admin</span>
      </h2>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
        Change roles live — takes effect on the next login or token refresh.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {users.map((u) => (
          <div key={u.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", background: "#f9fafb", borderRadius: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: ROLE_COLORS[u.role].bg,
                color: ROLE_COLORS[u.role].text,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13,
              }}>
                {u.displayName[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.displayName}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>@{u.username}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                background: ROLE_COLORS[u.role].bg, color: ROLE_COLORS[u.role].text,
              }}>
                {u.role}
              </span>
              <select
                value={u.role}
                disabled={updating === u.id}
                onChange={(e) => changeRole(u.id, e.target.value as Role)}
                style={{
                  fontSize: 12, padding: "3px 6px", borderRadius: 4,
                  border: "1px solid #e5e7eb", background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="customer">customer</option>
                <option value="support">support</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
