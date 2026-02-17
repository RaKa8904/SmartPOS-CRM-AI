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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-lg font-semibold mb-4">Add Customer</h2>

            <input
              className="w-full mb-3 p-2 bg-zinc-950 border border-zinc-800 rounded-lg"
              placeholder="Customer Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="w-full mb-3 p-2 bg-zinc-950 border border-zinc-800 rounded-lg"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="w-full mb-3 p-2 bg-zinc-950 border border-zinc-800 rounded-lg"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button
              onClick={addCustomer}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg"
            >
              Add Customer
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-lg font-semibold mb-4">Customer List</h2>

            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c);
                  fetchCustomerAnalytics(c.id);
                }}
                className="w-full text-left p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 mb-2"
              >
                <p>{c.name}</p>
                <p className="text-xs text-zinc-400">
                  ID: {c.id}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          {!selectedCustomer ? (
            <p className="text-zinc-500">Select a customer.</p>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4">Invoice History</h2>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="text-left py-2">Invoice ID</th>
                    <th className="text-left py-2">Total</th>
                    <th className="text-left py-2">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((inv) => (
                    <tr key={inv.invoice_id} className="border-b border-zinc-800">
                      <td className="py-2">
                        <button
                          onClick={() => fetchInvoice(inv.invoice_id)}
                          className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                          {inv.invoice_id}
                        </button>
                      </td>
                      <td className="py-2">₹ {inv.total_amount}</td>
                      <td className="py-2">
                        {new Date(inv.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">

            <h2 className="text-xl font-semibold text-indigo-400 mb-4">
              Invoice #{selectedInvoice.invoice_id}
            </h2>

            <p className="mb-4 text-zinc-400">
              Customer: <span className="text-white">{selectedInvoice.customer_name}</span>
            </p>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-400">
                  <th className="text-left py-2">Product</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item, i) => (
                  <tr key={i} className="border-b border-zinc-800">
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg"
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
