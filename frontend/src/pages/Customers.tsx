import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import { printInvoiceDocument } from "../utils/invoicePrint";

type Customer = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
};

type InvoiceItem = {
  name: string;
  quantity: number;
  price: number;
  line_total: number;
};

type InvoiceDetail = {
  invoice_id: number;
  customer_name: string;
  items: InvoiceItem[];
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  payment_method?: string;
  change_due?: number | null;
  created_at?: string;
};

type InvoiceHistoryItem = {
  invoice_id: number;
  total_amount: number;
  created_at: string;
};

type CustomerHistoryResponse = {
  customer: Customer;
  invoices: InvoiceHistoryItem[];
};

type CustomerSummary = {
  customer_id: number;
  name: string;
  phone?: string;
  total_invoices: number;
  total_spent: number;
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<InvoiceHistoryItem[]>([]);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // ---------------- FETCHERS ----------------

  const fetchCustomers = async () => {
    try {
      const res = await api.get<Customer[]>("/customers/list");
      const rows = res.data ?? [];
      setCustomers(rows);
      return rows;
    } catch {
      alert("Failed to fetch customers.");
      setCustomers([]);
      return [] as Customer[];
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerAnalytics = async (customerId: number) => {
    setLoadingCustomerData(true);
    try {
      const [histRes, summaryRes] = await Promise.all([
        api.get<CustomerHistoryResponse>(`/customers/${customerId}/history`),
        api.get<CustomerSummary>(`/customers/${customerId}/summary`),
      ]);

      setHistory(histRes.data?.invoices ?? []);
      setSummary(summaryRes.data ?? null);
    } catch {
      alert("Failed to fetch analytics.");
      setHistory([]);
      setSummary(null);
    } finally {
      setLoadingCustomerData(false);
    }
  };

  const fetchInvoice = async (id: number) => {
    try {
      const res = await api.get<InvoiceDetail>(`/billing/invoice/${id}`);
      setSelectedInvoice(res.data);
    } catch {
      alert("Failed to load invoice.");
    }
  };

  const addCustomer = async () => {
    if (!name.trim()) return alert("Customer name required");
    setSubmitting(true);
    try {
      await api.post("/customers/add", {
        name,
        email: email || null,
        phone: phone || null,
      });

      setName("");
      setEmail("");
      setPhone("");
      await fetchCustomers();
    } catch {
      alert("Failed to add customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name ?? "");
    setEditEmail(customer.email ?? "");
    setEditPhone(customer.phone ?? "");
  };

  const updateCustomer = async () => {
    if (!editingCustomer) return;
    if (!editName.trim()) {
      alert("Customer name required");
      return;
    }
    if (!editPhone.trim()) {
      alert("Phone required");
      return;
    }

    setSavingEdit(true);
    try {
      await api.put(`/customers/${editingCustomer.id}`, {
        name: editName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone.trim(),
      });

      const nextSelectedId = selectedCustomer?.id;
      const rows = await fetchCustomers();
      if (nextSelectedId) {
        const refreshed = rows.find((c) => c.id === nextSelectedId);
        if (refreshed) setSelectedCustomer(refreshed);
        await fetchCustomerAnalytics(nextSelectedId);
      }
      setEditingCustomer(null);
    } catch {
      alert("Failed to update customer.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteCustomer = async (customer: Customer) => {
    const confirmed = window.confirm(
      `Delete ${customer.name}?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/customers/${customer.id}`);
      const wasSelected = selectedCustomer?.id === customer.id;
      const rows = await fetchCustomers();
      if (wasSelected) {
        setSelectedCustomer(null);
        setHistory([]);
        setSummary(null);
      } else {
        const selectedId = selectedCustomer?.id;
        if (selectedId) {
          const refreshed = rows.find((c) => c.id === selectedId) ?? null;
          setSelectedCustomer(refreshed);
        }
      }
    } catch {
      alert("Delete failed. If customer has invoices, deletion is blocked.");
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoice) return;
    printInvoiceDocument(selectedInvoice);
  };

  useEffect(() => {
    if (!selectedInvoice) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedInvoice(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedInvoice]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email ?? "", customer.phone ?? "", String(customer.id)]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [customers, search]);

  const customersWithEmail = customers.filter((customer) => customer.email).length;
  const customersWithPhone = customers.filter((customer) => customer.phone).length;
  const lastPurchaseAt = history.length
    ? new Date(
        history.reduce((latest, invoice) =>
          new Date(invoice.created_at) > new Date(latest.created_at) ? invoice : latest
        ).created_at
      ).toLocaleString()
    : "No purchases yet";
  const avgOrderValue = summary && summary.total_invoices > 0
    ? summary.total_spent / summary.total_invoices
    : 0;

  const spendingTimeline = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    let running = 0;
    return sorted.map((invoice) => {
      running += invoice.total_amount;
      return {
        label: new Date(invoice.created_at).toLocaleDateString(),
        amount: Number(invoice.total_amount.toFixed(2)),
        cumulative: Number(running.toFixed(2)),
      };
    });
  }, [history]);

  const monthlySpending = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const invoice of history) {
      const dt = new Date(invoice.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, (buckets.get(key) ?? 0) + invoice.total_amount);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) }));
  }, [history]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-3xl p-6 h-32 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl p-5 h-64 animate-pulse" />
            <div className="glass-card rounded-2xl p-5 h-96 animate-pulse" />
          </div>
          <div className="lg:col-span-3 glass-card rounded-2xl p-5 h-140 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <section className="glass-card rounded-3xl p-6 md:p-7 fade-in overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,245,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(123,97,255,0.18),transparent_36%)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/75 mb-2">CRM Console</p>
              <h1 className="text-3xl font-semibold text-zinc-100">Customers</h1>
              <p className="text-sm text-slate-300/75 mt-2 max-w-2xl">
                Manage customer records, inspect purchase history, and open invoice details from one cleaner workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-full xl:min-w-120 xl:max-w-136">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/65">Total Customers</p>
                <p className="text-2xl font-semibold text-cyan-100 mt-2">{customers.length}</p>
              </div>
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/8 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-violet-200/65">With Email</p>
                <p className="text-2xl font-semibold text-violet-100 mt-2">{customersWithEmail}</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-200/65">With Phone</p>
                <p className="text-2xl font-semibold text-emerald-100 mt-2">{customersWithPhone}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl p-5 fade-in">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="section-title text-gradient">Add Customer</h2>
                  <p className="text-sm text-slate-300/70 mt-1">Capture basic contact information for faster checkout and support.</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-linear-to-br from-cyan-400/30 to-violet-400/25 border border-cyan-300/20 flex items-center justify-center text-cyan-100">
                  +
                </div>
              </div>

              <input
                className="input-surface mb-3"
                placeholder="Customer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className="input-surface mb-3"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="input-surface mb-4"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <button
                onClick={addCustomer}
                disabled={submitting}
                className="btn-primary w-full py-2.5"
              >
                {submitting ? "Saving..." : "Add Customer"}
              </button>
            </div>

            <div className="glass-card rounded-2xl p-5 fade-in stagger-1">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="section-title">Customer List</h2>
                  <p className="text-xs text-slate-300/65 mt-1">{filteredCustomers.length} visible</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full border border-[#33437f]/40 bg-[#0d1635]/60 text-slate-300/80">
                  {customers.length} total
                </span>
              </div>

              <input
                className="input-surface mb-4"
                placeholder="Search by name, email, phone, or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="max-h-136 overflow-auto pr-1">
                {filteredCustomers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#33437f]/35 bg-[#0d1635]/45 p-5 text-sm text-slate-300/70">
                    No customers match your search.
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        fetchCustomerAnalytics(c.id);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border mb-3 transition ${
                        selectedCustomer?.id === c.id
                          ? "border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.12)]"
                          : "border-[#33437f]/30 bg-[#0d1635]/55 hover:bg-[#203063]/25"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-slate-100 font-medium truncate">{c.name}</p>
                          <p className="text-xs text-slate-300/60 mt-1">Customer ID: {c.id}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCustomer(c);
                            }}
                            className="h-8 w-8 rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/18 transition flex items-center justify-center"
                            aria-label={`Edit ${c.name}`}
                            title="Edit customer"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M4 20h4l10-10a2.5 2.5 0 10-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomer(c);
                            }}
                            className="h-8 w-8 rounded-lg border border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/18 transition flex items-center justify-center"
                            aria-label={`Delete ${c.name}`}
                            title="Delete customer"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M3 6h18" />
                              <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
                              <path d="M19 6l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6" />
                              <path d="M10 11v6M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {c.email && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-violet-500/10 text-violet-200 border border-violet-400/20 max-w-full truncate">
                            {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-400/20">
                            {c.phone}
                          </span>
                        )}
                        {!c.email && !c.phone && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-zinc-500/10 text-zinc-300 border border-zinc-400/20">
                            No contact info
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-3 glass-card rounded-2xl p-5 md:p-6 fade-in stagger-2 min-h-176">
            {!selectedCustomer ? (
              <div className="h-full rounded-3xl border border-dashed border-[#33437f]/35 bg-[radial-gradient(circle_at_top,rgba(0,245,255,0.08),transparent_35%),rgba(13,22,53,0.42)] flex flex-col items-center justify-center text-center px-6 py-12">
                <div className="h-16 w-16 rounded-3xl bg-linear-to-br from-cyan-400/20 to-violet-500/20 border border-cyan-300/20 flex items-center justify-center text-2xl text-cyan-100 mb-4">
                  👤
                </div>
                <h2 className="text-2xl font-semibold text-zinc-100">Select a customer</h2>
                <p className="text-slate-300/72 mt-3 max-w-md">
                  Pick someone from the left panel to review their spending summary, invoice trail, and printable invoice details.
                </p>
              </div>
            ) : loadingCustomerData ? (
              <div className="space-y-4">
                <div className="rounded-3xl bg-[#0d1635]/55 h-36 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="rounded-2xl bg-[#0d1635]/55 h-28 animate-pulse" />
                  ))}
                </div>
                <div className="rounded-2xl bg-[#0d1635]/55 h-80 animate-pulse" />
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-[#33437f]/35 bg-[radial-gradient(circle_at_top_right,rgba(0,245,255,0.1),transparent_26%),rgba(13,22,53,0.52)] p-6">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/75 mb-2">Customer Profile</p>
                      <h2 className="text-2xl font-semibold text-zinc-100">{selectedCustomer.name}</h2>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedCustomer.email && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-200 border border-violet-400/20">
                            {selectedCustomer.email}
                          </span>
                        )}
                        {selectedCustomer.phone && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-400/20">
                            {selectedCustomer.phone}
                          </span>
                        )}
                        <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-200 border border-cyan-400/20">
                          ID #{selectedCustomer.id}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-full xl:min-w-md xl:max-w-136">
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/65">Invoices</p>
                        <p className="text-2xl font-semibold text-cyan-100 mt-2">{summary?.total_invoices ?? history.length}</p>
                      </div>
                      <div className="rounded-2xl border border-violet-400/20 bg-violet-400/8 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-violet-200/65">Total Spent</p>
                        <p className="text-2xl font-semibold text-violet-100 mt-2">₹ {(summary?.total_spent ?? 0).toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-emerald-200/65">Avg Order</p>
                        <p className="text-2xl font-semibold text-emerald-100 mt-2">₹ {avgOrderValue.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    <div className="rounded-2xl border border-[#33437f]/30 bg-[#0d1635]/55 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Recent Activity</p>
                      <p className="text-lg font-medium text-zinc-100 mt-2">{lastPurchaseAt}</p>
                    </div>
                    <div className="rounded-2xl border border-[#33437f]/30 bg-[#0d1635]/55 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Invoice Access</p>
                      <p className="text-sm text-slate-300/78 mt-2">Click any invoice ID below to inspect or print the full bill.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-[#33437f]/35 bg-[#0d1635]/55 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-200">Spending Trend</h3>
                      <span className="text-[11px] text-slate-400">Per Invoice</span>
                    </div>
                    {spendingTimeline.length === 0 ? (
                      <p className="text-sm text-slate-400 py-8 text-center">No spending data available.</p>
                    ) : (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={spendingTimeline} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#33437f44" />
                            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip
                              contentStyle={{ background: "#0d1635", border: "1px solid #33437f77", borderRadius: "10px", color: "#e2e8f0" }}
                              formatter={(value: number | string | undefined) => {
                                const num = Number(value ?? 0);
                                return [`₹${num.toFixed(2)}`, "Invoice total"];
                              }}
                            />
                            <Area type="monotone" dataKey="amount" stroke="#22d3ee" fill="url(#spendGradient)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[#33437f]/35 bg-[#0d1635]/55 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-200">Monthly Spend</h3>
                      <span className="text-[11px] text-slate-400">Month buckets</span>
                    </div>
                    {monthlySpending.length === 0 ? (
                      <p className="text-sm text-slate-400 py-8 text-center">No monthly data available.</p>
                    ) : (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlySpending} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#33437f44" />
                            <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip
                              contentStyle={{ background: "#0d1635", border: "1px solid #33437f77", borderRadius: "10px", color: "#e2e8f0" }}
                              formatter={(value: number | string | undefined) => {
                                const num = Number(value ?? 0);
                                return [`₹${num.toFixed(2)}`, "Monthly total"];
                              }}
                            />
                            <Bar dataKey="total" fill="#7b61ff" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#33437f]/35 overflow-hidden bg-[#0d1635]/55">
                  <div className="flex items-center justify-between px-4 py-4 border-b border-[#33437f]/35 bg-[#18275a]/45">
                    <div>
                      <h3 className="section-title text-base">Invoice History</h3>
                      <p className="text-xs text-slate-300/65 mt-1">Chronological purchase trail for this customer.</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full border border-[#33437f]/40 bg-[#0d1635]/55 text-slate-200/75">
                      {history.length} invoice{history.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {history.length === 0 ? (
                    <div className="px-4 py-10 text-center text-slate-300/72">
                      No invoices found for this customer yet.
                    </div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-sm min-w-152">
                        <thead>
                          <tr className="border-b border-[#33437f]/40 text-slate-300/85">
                            <th className="text-left py-3 px-4">Invoice ID</th>
                            <th className="text-left py-3 px-4">Total</th>
                            <th className="text-left py-3 px-4">Created At</th>
                            <th className="text-left py-3 px-4">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((inv) => (
                            <tr key={inv.invoice_id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => fetchInvoice(inv.invoice_id)}
                                  className="text-cyan-200 hover:text-cyan-100 underline underline-offset-4"
                                >
                                  #{inv.invoice_id}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-cyan-100 font-medium">₹ {inv.total_amount.toFixed(2)}</td>
                              <td className="py-3 px-4 text-slate-200/85">{new Date(inv.created_at).toLocaleString()}</td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => fetchInvoice(inv.invoice_id)}
                                  className="text-xs px-3 py-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15 transition"
                                >
                                  Open Invoice
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* INVOICE MODAL */}
      {typeof document !== "undefined" &&
        createPortal(
          selectedInvoice ? (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              style={{ zIndex: 9999 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedInvoice(null);
                }
              }}
            >
              <div className="glass-card border border-[#33437f]/35 rounded-3xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-auto">

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70 mb-2">Invoice Detail</p>
                    <h2 className="text-xl font-semibold text-cyan-200">
                      Invoice #{selectedInvoice.invoice_id}
                    </h2>
                    <p className="mt-2 text-slate-300/80">
                      Customer: <span className="text-white">{selectedInvoice.customer_name}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedInvoice.created_at && (
                      <span className="text-xs px-2.5 py-1 rounded-full border border-[#33437f]/35 bg-[#0d1635]/60 text-slate-200/80">
                        {new Date(selectedInvoice.created_at).toLocaleString()}
                      </span>
                    )}
                    {selectedInvoice.payment_method && (
                      <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 capitalize">
                        {selectedInvoice.payment_method}
                      </span>
                    )}
                  </div>
                </div>

                <table className="w-full text-sm rounded-xl overflow-hidden">
                  <thead>
                    <tr className="border-b border-[#33437f]/35 text-slate-300/85">
                      <th className="text-left py-2">Product</th>
                      <th className="text-center py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, i) => (
                      <tr key={i} className="border-b border-[#33437f]/22">
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-center">{item.quantity}</td>
                        <td className="py-2 text-right">₹ {item.price}</td>
                        <td className="py-2 text-right">₹ {item.line_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-5 text-right text-sm text-slate-300/85 space-y-1">
                  <p>Subtotal: ₹ {(selectedInvoice.subtotal ?? selectedInvoice.total_amount).toFixed(2)}</p>
                  <p>GST: ₹ {(selectedInvoice.tax_amount ?? 0).toFixed(2)}</p>
                  <p className="text-lg font-bold text-white">
                    Grand Total: ₹ {selectedInvoice.total_amount.toFixed(2)}
                  </p>
                  {selectedInvoice.change_due != null && selectedInvoice.change_due > 0 && (
                    <p className="text-green-400 font-semibold">
                      Change Due: ₹ {selectedInvoice.change_due.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="mt-6 text-right flex justify-end gap-3">
                  <button
                    onClick={handlePrintInvoice}
                    className="px-4 py-2 rounded-xl border border-emerald-400/20 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/20 transition"
                  >
                    Print
                  </button>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="btn-primary px-4 py-2"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          ) : null,
          document.body
        )}

      {/* EDIT CUSTOMER MODAL */}
      {typeof document !== "undefined" &&
        createPortal(
          editingCustomer ? (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              style={{ zIndex: 9999 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setEditingCustomer(null);
                }
              }}
            >
              <div className="glass-card border border-[#33437f]/35 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70 mb-2">Edit Customer</p>
                <h3 className="text-xl font-semibold text-zinc-100 mb-4">{editingCustomer.name}</h3>

                <input
                  className="input-surface mb-3"
                  placeholder="Customer Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <input
                  className="input-surface mb-3"
                  placeholder="Email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                <input
                  className="input-surface mb-4"
                  placeholder="Phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditingCustomer(null)}
                    className="px-4 py-2 rounded-xl border border-[#33437f]/35 text-slate-200 hover:bg-[#1a2a5e]/40 transition"
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateCustomer}
                    className="btn-primary px-4 py-2"
                    disabled={savingEdit}
                  >
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          ) : null,
          document.body
        )}
    </>
  );
}
