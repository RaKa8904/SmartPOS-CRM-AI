import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

type Customer = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
};

type InvoiceItem = {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  price_at_purchase: number;
  line_total: number;
};

type InvoiceHistoryItem = {
  invoice_id: number;
  total_amount: number;
  created_at: string;
  items: InvoiceItem[];
};

type CustomerHistoryResponse = {
  customer: Customer;
  invoices: InvoiceHistoryItem[];
};

type CustomerSummary = {
  customer_id?: number;
  total_invoices?: number;
  invoice_count?: number;
  total_spent?: number;
  total?: number;
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<InvoiceHistoryItem[]>([]);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // add customer form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get<Customer[]>("/customers/list");
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert("Failed to fetch customers. Check backend is running.");
      console.log(err);
      setCustomers([]);
    }
    setLoading(false);
  };

  const fetchCustomerAnalytics = async (customerId: number) => {
    setHistoryLoading(true);

    try {
      const [histRes, sumRes] = await Promise.all([
        api.get<CustomerHistoryResponse>(`/customers/${customerId}/history`),
        api.get<CustomerSummary>(`/customers/${customerId}/summary`),
      ]);

      // ✅ FIX: invoices is inside histRes.data.invoices
      setHistory(histRes.data?.invoices ?? []);
      setSummary(sumRes.data ?? null);
    } catch (err) {
      alert("Failed to fetch customer history/summary.");
      console.log(err);
      setHistory([]);
      setSummary(null);
    }

    setHistoryLoading(false);
  };

  const addCustomer = async () => {
    if (!name.trim()) {
      alert("Customer name is required!");
      return;
    }

    try {
      await api.post("/customers/add", {
        name,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });

      setName("");
      setEmail("");
      setPhone("");

      await fetchCustomers();
      alert("Customer added ✅");
    } catch (err) {
      console.log(err);
      alert("Failed to add customer ❌");
    }
  };

  useEffect(() => {
    (async () => {
      await fetchCustomers();
    })();
  }, []);

  return (
    <Layout title="Customers (CRM)">
      {loading ? (
        <p className="text-zinc-400">Loading customers...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: ADD + LIST */}
          <div className="space-y-6">
            {/* ADD CUSTOMER */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h2 className="text-lg font-semibold mb-4">Add Customer</h2>

              <div className="space-y-3">
                <input
                  className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  placeholder="Customer Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <input
                  className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  placeholder="Phone (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <button
                  onClick={addCustomer}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-white font-medium"
                >
                  Add Customer
                </button>
              </div>
            </div>

            {/* CUSTOMER LIST */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h2 className="text-lg font-semibold mb-4">Customer List</h2>

              {customers.length === 0 ? (
                <p className="text-zinc-500 text-sm">No customers found.</p>
              ) : (
                <div className="space-y-2">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        fetchCustomerAnalytics(c.id);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        selectedCustomer?.id === c.id
                          ? "bg-indigo-600/20 border-indigo-500"
                          : "bg-zinc-950 border-zinc-800 hover:bg-zinc-900"
                      }`}
                    >
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-zinc-400">
                        ID: {c.id} {c.email ? `• ${c.email}` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: CUSTOMER DETAILS */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Customer Analytics</h2>

            {!selectedCustomer ? (
              <p className="text-zinc-500 mt-4">
                Select a customer to view history + summary.
              </p>
            ) : historyLoading ? (
              <p className="text-zinc-400 mt-4">Loading history...</p>
            ) : (
              <div className="mt-4 space-y-6">
                {/* SUMMARY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                    <p className="text-sm text-zinc-400">Customer</p>
                    <p className="font-semibold">{selectedCustomer.name}</p>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                    <p className="text-sm text-zinc-400">Total Invoices</p>
                    <p className="text-xl font-bold">
                      {summary?.total_invoices ?? summary?.invoice_count ?? 0}
                    </p>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                    <p className="text-sm text-zinc-400">Total Spent</p>
                    <p className="text-xl font-bold">
                      ₹ {summary?.total_spent ?? summary?.total ?? 0}
                    </p>
                  </div>
                </div>

                {/* HISTORY TABLE */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <h3 className="font-semibold mb-3">Invoice History</h3>

                  {history.length === 0 ? (
                    <p className="text-zinc-500 text-sm">
                      No invoices found for this customer.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-400 border-b border-zinc-800">
                          <th className="text-left py-2">Invoice ID</th>
                          <th className="text-left py-2">Total</th>
                          <th className="text-left py-2">Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((inv) => (
                          <tr
                            key={inv.invoice_id}
                            className="border-b border-zinc-800"
                          >
                            <td className="py-2">{inv.invoice_id}</td>
                            <td className="py-2">₹ {inv.total_amount}</td>
                            <td className="py-2">
                              {new Date(inv.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
