import { useEffect, useState } from "react";
import { api } from "../api";

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
  total_amount: number;
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

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<InvoiceHistoryItem[]>([]);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // ---------------- FETCHERS ----------------

  const fetchCustomers = async () => {
    try {
      const res = await api.get<Customer[]>("/customers/list");
      setCustomers(res.data ?? []);
    } catch {
      alert("Failed to fetch customers.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerAnalytics = async (customerId: number) => {
  try {
    const histRes = await api.get<CustomerHistoryResponse>(
      `/customers/${customerId}/history`
    );

    setHistory(histRes.data?.invoices ?? []);
  } catch {
    alert("Failed to fetch analytics.");
    setHistory([]);
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

    await api.post("/customers/add", {
      name,
      email: email || null,
      phone: phone || null,
    });

    setName("");
    setEmail("");
    setPhone("");
    fetchCustomers();
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  if (loading) return <p className="text-zinc-400">Loading...</p>;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-5 fade-in">
            <h2 className="section-title text-gradient mb-4">Add Customer</h2>

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
              className="input-surface mb-3"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button
              onClick={addCustomer}
              className="btn-primary w-full py-2"
            >
              Add Customer
            </button>
          </div>

          <div className="glass-card rounded-2xl p-5 fade-in stagger-1">
            <h2 className="section-title mb-4">Customer List</h2>

            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c);
                  fetchCustomerAnalytics(c.id);
                }}
                className={`w-full text-left p-3 rounded-xl border mb-2 transition ${
                  selectedCustomer?.id === c.id
                    ? "border-cyan-300/50 bg-cyan-300/10"
                    : "border-[#33437f]/30 bg-[#0d1635]/55 hover:bg-[#203063]/25"
                }`}
              >
                <p className="text-slate-100">{c.name}</p>
                <p className="text-xs text-slate-300/70">
                  ID: {c.id}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 fade-in stagger-2">
          {!selectedCustomer ? (
            <p className="text-slate-300/75">Select a customer to view invoice history.</p>
          ) : (
            <>
              <h2 className="section-title mb-4">Invoice History • {selectedCustomer.name}</h2>

              <div className="rounded-xl border border-[#33437f]/35 overflow-hidden bg-[#0d1635]/55">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#18275a]/70 border-b border-[#33437f]/40 text-slate-300/85">
                      <th className="text-left py-3 px-3">Invoice ID</th>
                      <th className="text-left py-3 px-3">Total</th>
                      <th className="text-left py-3 px-3">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((inv) => (
                      <tr key={inv.invoice_id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => fetchInvoice(inv.invoice_id)}
                            className="text-cyan-200 hover:text-cyan-100 underline underline-offset-4"
                          >
                            {inv.invoice_id}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-cyan-100">₹ {inv.total_amount}</td>
                        <td className="py-2.5 px-3 text-slate-200/85">
                          {new Date(inv.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="glass-card border border-[#33437f]/35 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">

            <h2 className="text-xl font-semibold text-cyan-200 mb-4">
              Invoice #{selectedInvoice.invoice_id}
            </h2>

            <p className="mb-4 text-slate-300/80">
              Customer: <span className="text-white">{selectedInvoice.customer_name}</span>
            </p>

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

            <div className="mt-4 text-right text-lg font-bold">
              Total: ₹ {selectedInvoice.total_amount}
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="btn-primary px-4 py-2"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
