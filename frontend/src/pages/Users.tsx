import { useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { api } from "../api";
import { useAuth } from "../context/useAuth";

type UserRow = {
  id: number;
  email: string;
  username: string;
  role: "admin" | "manager" | "cashier";
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
  session_revoked: boolean;
};

const ROLE_OPTIONS: Array<UserRow["role"]> = ["admin", "manager", "cashier"];

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function errorDetail(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<{ detail?: string }>;
  return axiosErr.response?.data?.detail ?? fallback;
}

export default function Users() {
  const { email: currentUserEmail } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRow["role"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [nameDraft, setNameDraft] = useState<Record<number, string>>({});

  const loadUsers = async () => {
    const res = await api.get<UserRow[]>("/users/list");
    const next = res.data ?? [];
    setRows(next);
    setNameDraft(Object.fromEntries(next.map((r) => [r.id, r.username ?? ""])));
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadUsers();
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        r.email.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        String(r.id).includes(q);
      const matchesRole = roleFilter === "all" || r.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && r.is_active) ||
        (statusFilter === "disabled" && !r.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [rows, roleFilter, search, statusFilter]);

  const updateRole = async (id: number, role: UserRow["role"]) => {
    setBusyId(id);
    try {
      await api.put(`/users/${id}/role`, { role });
      await loadUsers();
    } catch (err: unknown) {
      alert(errorDetail(err, "Failed to update role"));
    } finally {
      setBusyId(null);
    }
  };

  const updateStatus = async (id: number, isActive: boolean) => {
    setBusyId(id);
    try {
      await api.put(`/users/${id}/status`, { is_active: isActive });
      await loadUsers();
    } catch (err: unknown) {
      alert(errorDetail(err, "Failed to update status"));
    } finally {
      setBusyId(null);
    }
  };

  const revokeSession = async (id: number) => {
    setBusyId(id);
    try {
      await api.post(`/users/${id}/revoke-session`);
      await loadUsers();
      alert("Session revoked successfully");
    } catch (err: unknown) {
      alert(errorDetail(err, "Failed to revoke session"));
    } finally {
      setBusyId(null);
    }
  };

  const updateUsername = async (id: number) => {
    const username = (nameDraft[id] ?? "").trim();
    if (!username) {
      alert("Username cannot be empty");
      return;
    }
    setBusyId(id);
    try {
      await api.put(`/users/${id}/username`, { username });
      await loadUsers();
    } catch (err: unknown) {
      alert(errorDetail(err, "Failed to update username"));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-zinc-400">Loading users...</p>;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 shadow-xl fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="section-title text-gradient mb-1">Admin Users Management</h2>
            <p className="text-sm text-slate-300/80">
              Monitor users, manage roles, disable/reactivate accounts, and revoke active sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, username, or ID"
              className="input-surface"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "all" | UserRow["role"])}
              className="input-surface"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "disabled")}
              className="input-surface"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl shadow-xl overflow-hidden fade-in stagger-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-245">
            <thead className="bg-[#1b214a]/70 text-slate-300/80">
              <tr>
                <th className="py-3 px-4 text-left">ID</th>
                <th className="py-3 px-4 text-left">Email</th>
                <th className="py-3 px-4 text-left">Username</th>
                <th className="py-3 px-4 text-left">Role</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Created</th>
                <th className="py-3 px-4 text-left">Last Login</th>
                <th className="py-3 px-4 text-left">Session</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const isSelf = currentUserEmail === row.email;
                const busy = busyId === row.id;
                return (
                  <tr key={row.id} className="border-t border-[#33437f]/25 odd:bg-[#11204b]/25">
                    <td className="py-3 px-4 text-slate-300">{row.id}</td>
                    <td className="py-3 px-4 text-slate-100">{row.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          value={nameDraft[row.id] ?? ""}
                          onChange={(e) =>
                            setNameDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                          }
                          className="input-surface h-9 py-1"
                          placeholder="Username"
                        />
                        <button
                          onClick={() => updateUsername(row.id)}
                          disabled={busy}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-cyan-300/35 bg-cyan-400/12 text-cyan-100 hover:bg-cyan-400/18 disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={row.role}
                        disabled={busy}
                        onChange={(e) => updateRole(row.id, e.target.value as UserRow["role"])}
                        className="input-surface h-9 py-1"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${
                          row.is_active
                            ? "bg-emerald-300/15 text-emerald-200 border-emerald-300/30"
                            : "bg-rose-300/15 text-rose-200 border-rose-300/30"
                        }`}
                      >
                        {row.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{fmtDate(row.created_at)}</td>
                    <td className="py-3 px-4 text-slate-300">{fmtDate(row.last_login_at)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${
                          row.session_revoked
                            ? "bg-amber-300/15 text-amber-200 border-amber-300/30"
                            : "bg-cyan-300/15 text-cyan-200 border-cyan-300/30"
                        }`}
                      >
                        {row.session_revoked ? "Revoked" : "Valid"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {row.is_active ? (
                          <button
                            onClick={() => updateStatus(row.id, false)}
                            disabled={busy || isSelf}
                            className="btn-danger px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                            title={isSelf ? "You cannot disable your own account" : "Disable account"}
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            onClick={() => updateStatus(row.id, true)}
                            disabled={busy}
                            className="btn-primary px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                          >
                            Reactivate
                          </button>
                        )}
                        <button
                          onClick={() => revokeSession(row.id)}
                          disabled={busy || !row.is_active}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-cyan-300/35 bg-cyan-400/12 text-cyan-100 hover:bg-cyan-400/18 disabled:opacity-40"
                        >
                          Revoke Session
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No users match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
