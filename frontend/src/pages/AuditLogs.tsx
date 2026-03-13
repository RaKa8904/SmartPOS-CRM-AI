import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

type AuditLog = {
  id: number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string | null;
};

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get<AuditLog[]>("/audit-logs/list");
        setRows(res.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.actor_email.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.entity_type.toLowerCase().includes(q) ||
        String(r.entity_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  if (loading) return <p className="text-zinc-400">Loading audit logs...</p>;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 shadow-xl fade-in">
        <h2 className="section-title text-gradient mb-2">Audit Logs</h2>
        <p className="text-sm text-slate-300/80 mb-4">
          Trace critical actions across pricing, billing, deletion, user-role changes, and logins.
        </p>
        <input
          className="input-surface"
          placeholder="Search by actor, action, entity, or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="glass-card rounded-2xl shadow-xl overflow-hidden fade-in stagger-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-245">
            <thead className="bg-[#1b214a]/70 text-slate-300/80">
              <tr>
                <th className="py-3 px-4 text-left">Time</th>
                <th className="py-3 px-4 text-left">Actor</th>
                <th className="py-3 px-4 text-left">Action</th>
                <th className="py-3 px-4 text-left">Entity</th>
                <th className="py-3 px-4 text-left">ID</th>
                <th className="py-3 px-4 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-[#33437f]/25 odd:bg-[#11204b]/25 align-top">
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="py-3 px-4 text-slate-100">{r.actor_email}</td>
                  <td className="py-3 px-4 text-cyan-200 font-medium">{r.action}</td>
                  <td className="py-3 px-4 text-slate-300">{r.entity_type}</td>
                  <td className="py-3 px-4 text-slate-300">{r.entity_id ?? "-"}</td>
                  <td className="py-3 px-4 text-slate-300 max-w-130 wrap-break-word">{r.details ?? "{}"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="py-8 text-center text-slate-400" colSpan={6}>
                    No audit logs found.
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
