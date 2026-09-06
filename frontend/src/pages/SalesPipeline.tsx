import { useEffect, useState } from "react";
import { api } from "../api";

/* ── Types ────────────────────────────────────────────────── */

type Company = { id: number; name: string; industry: string | null; website: string | null; address: string | null };
type Contact = { id: number; company_id: number; first_name: string; last_name: string; email: string | null; phone: string | null; designation: string | null };
type LeadRow = {
  id: number; title: string; contact_id: number; assigned_user_id: number | null;
  status: string; estimated_value: number; notes: string | null;
  created_at: string; updated_at: string | null;
  contact_name: string | null; company_name: string | null; assigned_user_email: string | null;
};
type UserRef = { id: number; email: string; username: string; role: string };

const STATUSES = ["New", "Contacted", "Demo Scheduled", "Negotiating", "Won", "Lost"] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  New:              { bg: "bg-sky-500/10",     text: "text-sky-300",     dot: "bg-sky-400",     border: "border-sky-400/20" },
  Contacted:        { bg: "bg-violet-500/10",  text: "text-violet-300",  dot: "bg-violet-400",  border: "border-violet-400/20" },
  "Demo Scheduled": { bg: "bg-amber-500/10",   text: "text-amber-300",   dot: "bg-amber-400",   border: "border-amber-400/20" },
  Negotiating:      { bg: "bg-orange-500/10",  text: "text-orange-300",  dot: "bg-orange-400",  border: "border-orange-400/20" },
  Won:              { bg: "bg-emerald-500/10", text: "text-emerald-300", dot: "bg-emerald-400", border: "border-emerald-400/20" },
  Lost:             { bg: "bg-rose-500/10",    text: "text-rose-300",    dot: "bg-rose-400",    border: "border-rose-400/20" },
};

/* ── Helpers ──────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.New;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════ */

export default function SalesPipeline() {
  /* ── Data ─── */
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── UI state ─── */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showForm, setShowForm] = useState<"lead" | "company" | "contact" | null>(null);

  /* ── Lead form ─── */
  const [fTitle, setFTitle] = useState("");
  const [fContactId, setFContactId] = useState<number | "">("");
  const [fUserId, setFUserId] = useState<number | "">("");
  const [fStatus, setFStatus] = useState<string>("New");
  const [fValue, setFValue] = useState("");
  const [fNotes, setFNotes] = useState("");

  /* ── Company form ─── */
  const [cName, setCName] = useState("");
  const [cIndustry, setCIndustry] = useState("");
  const [cWebsite, setCWebsite] = useState("");
  const [cAddress, setCAddress] = useState("");

  /* ── Contact form ─── */
  const [ctCompanyId, setCtCompanyId] = useState<number | "">("");
  const [ctFirstName, setCtFirstName] = useState("");
  const [ctLastName, setCtLastName] = useState("");
  const [ctEmail, setCtEmail] = useState("");
  const [ctPhone, setCtPhone] = useState("");
  const [ctDesignation, setCtDesignation] = useState("");

  /* ── Alert ─── */
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const flash = (type: "ok" | "err", msg: string) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 3500); };

  const runLoader = async (loader: () => Promise<void>, label: string) => {
    try {
      await loader();
    } catch {
      flash("err", `Failed to load ${label}`);
    }
  };

  /* ── Loaders ─── */
  const loadLeads     = async () => { const r = await api.get<LeadRow[]>("/sales/leads"); setLeads(r.data); };
  const loadCompanies = async () => { const r = await api.get<Company[]>("/sales/companies"); setCompanies(r.data); };
  const loadContacts  = async () => { const r = await api.get<Contact[]>("/sales/contacts"); setContacts(r.data); };
  const loadUsers     = async () => {
    try { const r = await api.get<UserRef[]>("/users/list"); setUsers(r.data); }
    catch { /* non-admin may not have access — that's fine */ }
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.allSettled([
          runLoader(loadLeads, "leads"),
          runLoader(loadCompanies, "companies"),
          runLoader(loadContacts, "contacts"),
          runLoader(loadUsers, "users"),
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Create handlers ─── */
  const createCompany = async () => {
    if (!cName.trim()) { flash("err", "Company name is required"); return; }
    try {
      await api.post("/sales/companies", { name: cName, industry: cIndustry || null, website: cWebsite || null, address: cAddress || null });
      setCName(""); setCIndustry(""); setCWebsite(""); setCAddress("");
      setShowForm(null); void runLoader(loadCompanies, "companies"); flash("ok", "Company created");
    } catch (e: any) { flash("err", e.response?.data?.detail ?? "Failed to create company"); }
  };

  const createContact = async () => {
    if (!ctFirstName.trim() || !ctLastName.trim() || !ctCompanyId) { flash("err", "First name, last name, and company are required"); return; }
    try {
      await api.post("/sales/contacts", { company_id: ctCompanyId, first_name: ctFirstName, last_name: ctLastName, email: ctEmail || null, phone: ctPhone || null, designation: ctDesignation || null });
      setCtFirstName(""); setCtLastName(""); setCtEmail(""); setCtPhone(""); setCtDesignation(""); setCtCompanyId("");
      setShowForm(null); void runLoader(loadContacts, "contacts"); flash("ok", "Contact created");
    } catch (e: any) { flash("err", e.response?.data?.detail ?? "Failed to create contact"); }
  };

  const createLead = async () => {
    if (!fTitle.trim() || !fContactId) { flash("err", "Title and contact are required"); return; }
    try {
      await api.post("/sales/leads", {
        title: fTitle, contact_id: fContactId,
        assigned_user_id: fUserId || null, status: fStatus,
        estimated_value: parseFloat(fValue) || 0, notes: fNotes || null,
      });
      setFTitle(""); setFContactId(""); setFUserId(""); setFStatus("New"); setFValue(""); setFNotes("");
      setShowForm(null); void runLoader(loadLeads, "leads"); flash("ok", "Lead created");
    } catch (e: any) { flash("err", e.response?.data?.detail ?? "Failed to create lead"); }
  };

  const deleteLead = async (id: number) => {
    try { await api.delete(`/sales/leads/${id}`); loadLeads(); flash("ok", "Lead deleted"); }
    catch { flash("err", "Failed to delete lead"); }
  };

  const updateLeadStatus = async (id: number, status: string) => {
    try { await api.put(`/sales/leads/${id}`, { status }); loadLeads(); }
    catch { flash("err", "Failed to update status"); }
  };

  /* ── Filtering ─── */
  const filtered = leads.filter((l) => {
    const matchesStatus = statusFilter === "All" || l.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q
      || l.title.toLowerCase().includes(q)
      || (l.company_name ?? "").toLowerCase().includes(q)
      || (l.contact_name ?? "").toLowerCase().includes(q)
      || l.id.toString().includes(q);
    return matchesStatus && matchesSearch;
  });

  /* ── Stats ─── */
  const totalLeads = leads.length;
  const pipelineValue = leads.filter((l) => !["Won", "Lost"].includes(l.status)).reduce((s, l) => s + (l.estimated_value ?? 0), 0);
  const wonCount = leads.filter((l) => l.status === "Won").length;
  const lostCount = leads.filter((l) => l.status === "Lost").length;

  if (loading) return <p className="text-(--pos-muted)">Loading…</p>;

  return (
    <div className="space-y-5">

      {/* ── Alert toast ── */}
      {alert && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg fade-in ${alert.type === "ok" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/20" : "bg-rose-500/20 text-rose-300 border border-rose-400/20"}`}>
          {alert.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gradient">Sales Pipeline</h1>
          <p className="text-xs text-(--pos-muted) mt-0.5">Manage companies, contacts, and leads for laser system sales</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(showForm === "company" ? null : "company")} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${showForm === "company" ? "bg-white/10 border border-white/10 text-slate-300" : "bg-white/5 border border-white/8 text-slate-400 hover:bg-white/10"}`}>
            + Company
          </button>
          <button onClick={() => setShowForm(showForm === "contact" ? null : "contact")} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${showForm === "contact" ? "bg-white/10 border border-white/10 text-slate-300" : "bg-white/5 border border-white/8 text-slate-400 hover:bg-white/10"}`}>
            + Contact
          </button>
          <button onClick={() => setShowForm(showForm === "lead" ? null : "lead")} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${showForm === "lead" ? "bg-white/10 border border-white/10 text-slate-300 hover:bg-white/15" : "btn-primary"}`}>
            {showForm === "lead" ? (
              <><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>Cancel</>
            ) : (
              <><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>New Lead</>
            )}
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Leads",    value: totalLeads,                                          icon: "🎯", color: "from-cyan-500/20 to-cyan-600/5 border-cyan-400/15" },
          { label: "Pipeline Value", value: `₹${pipelineValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: "💰", color: "from-emerald-500/20 to-emerald-600/5 border-emerald-400/15" },
          { label: "Won",            value: wonCount,                                            icon: "🏆", color: "from-amber-500/20 to-amber-600/5 border-amber-400/15" },
          { label: "Lost",           value: lostCount,                                           icon: "📉", color: "from-rose-500/20 to-rose-600/5 border-rose-400/15" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl border bg-linear-to-br ${stat.color} p-4 backdrop-blur-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{stat.icon}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-(--pos-muted) font-semibold">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-(--pos-text)">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Company form ── */}
      {showForm === "company" && (
        <div className="glass-card rounded-2xl p-5 fade-in border border-cyan-400/10">
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>
            New Company
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Company Name *</label>
              <input placeholder="Acme Manufacturing" value={cName} onChange={(e) => setCName(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Industry</label>
              <input placeholder="Automotive, Aerospace..." value={cIndustry} onChange={(e) => setCIndustry(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Website</label>
              <input placeholder="https://..." value={cWebsite} onChange={(e) => setCWebsite(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Address</label>
              <input placeholder="City, State" value={cAddress} onChange={(e) => setCAddress(e.target.value)} className="input-surface text-sm" />
            </div>
          </div>
          <button onClick={createCompany} className="btn-primary mt-4 px-6 py-2.5 text-sm">Create Company</button>
        </div>
      )}

      {/* ── Contact form ── */}
      {showForm === "contact" && (
        <div className="glass-card rounded-2xl p-5 fade-in border border-violet-400/10">
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            New Contact
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Company *</label>
              <select value={ctCompanyId} onChange={(e) => setCtCompanyId(e.target.value ? Number(e.target.value) : "")} className="input-surface text-sm">
                <option value="">Select company…</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">First Name *</label>
              <input placeholder="John" value={ctFirstName} onChange={(e) => setCtFirstName(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Last Name *</label>
              <input placeholder="Doe" value={ctLastName} onChange={(e) => setCtLastName(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Email</label>
              <input placeholder="john@acme.com" value={ctEmail} onChange={(e) => setCtEmail(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Phone</label>
              <input placeholder="+91 ..." value={ctPhone} onChange={(e) => setCtPhone(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Designation</label>
              <input placeholder="VP Engineering" value={ctDesignation} onChange={(e) => setCtDesignation(e.target.value)} className="input-surface text-sm" />
            </div>
          </div>
          <button onClick={createContact} className="btn-primary mt-4 px-6 py-2.5 text-sm">Create Contact</button>
        </div>
      )}

      {/* ── Lead form ── */}
      {showForm === "lead" && (
        <div className="glass-card rounded-2xl p-5 fade-in border border-cyan-400/10">
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New Lead
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Lead Title *</label>
              <input placeholder="Fiber Laser - Acme Plant 2" value={fTitle} onChange={(e) => setFTitle(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Contact *</label>
              <select value={fContactId} onChange={(e) => setFContactId(e.target.value ? Number(e.target.value) : "")} className="input-surface text-sm">
                <option value="">Select contact…</option>
                {contacts.map((c) => {
                  const comp = companies.find((co) => co.id === c.company_id);
                  return <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{comp ? ` — ${comp.name}` : ""}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Assigned To</label>
              <select value={fUserId} onChange={(e) => setFUserId(e.target.value ? Number(e.target.value) : "")} className="input-surface text-sm">
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.username || u.email}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Status</label>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="input-surface text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Estimated Value (₹)</label>
              <input type="number" placeholder="0" value={fValue} onChange={(e) => setFValue(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Notes</label>
              <input placeholder="Optional notes…" value={fNotes} onChange={(e) => setFNotes(e.target.value)} className="input-surface text-sm" />
            </div>
          </div>
          <button onClick={createLead} className="btn-primary mt-4 px-6 py-2.5 text-sm">Create Lead</button>
        </div>
      )}

      {/* ── Filter / Search bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["All", ...STATUSES].map((s) => {
            const active = statusFilter === s;
            const sc = s !== "All" ? STATUS_COLORS[s] : null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? sc ? `${sc.bg} ${sc.text} border ${sc.border}` : "bg-white/10 text-white border border-white/15"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                {s}
                {s !== "All" && <span className="ml-1 opacity-60">({leads.filter((l) => l.status === s).length})</span>}
              </button>
            );
          })}
        </div>
        <div className="sm:ml-auto w-full sm:w-64">
          <input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-surface text-sm" />
        </div>
      </div>

      {/* ── Leads table ── */}
      <div className="glass-card rounded-2xl overflow-hidden border border-(--pos-border)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--pos-border)">
                {["ID", "Lead Title", "Company", "Contact", "Status", "Value (₹)", "Assigned To", "Created", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-(--pos-muted) font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-(--pos-muted)">
                    {leads.length === 0 ? "No leads yet. Create your first lead above." : "No leads match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-(--pos-border) hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 font-number text-xs text-(--pos-muted)">#{lead.id}</td>
                    <td className="px-4 py-3 font-semibold text-(--pos-text)">{lead.title}</td>
                    <td className="px-4 py-3 text-(--pos-muted)">{lead.company_name ?? "—"}</td>
                    <td className="px-4 py-3 text-(--pos-muted)">{lead.contact_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className="bg-transparent text-xs font-semibold border-0 outline-none cursor-pointer px-0"
                        style={{ color: "inherit" }}
                      >
                        {STATUSES.map((s) => <option key={s} value={s} className="bg-[#1c1c1f] text-slate-200">{s}</option>)}
                      </select>
                      <div className="mt-1"><StatusBadge status={lead.status} /></div>
                    </td>
                    <td className="px-4 py-3 font-number text-(--pos-text)">{(lead.estimated_value ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-(--pos-muted) text-xs">{lead.assigned_user_email ?? <span className="italic opacity-50">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-xs text-(--pos-muted) font-number">{lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteLead(lead.id)} className="text-rose-400/70 hover:text-rose-300 transition-colors" title="Delete lead">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
