import { useEffect, useState } from "react";
import { api } from "../api";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  tax_rate: number;
  category_id: number | null;
};

type Category = {
  id: number;
  name: string;
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [taxRate, setTaxRate] = useState("18");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [categories, setCategories] = useState<Category[]>([]);

  const [restockMap, setRestockMap] = useState<Record<number, number>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  const categoryMap: Record<number, string> = {};
  for (const c of categories) categoryMap[c.id] = c.name;

  const loadProducts = async () => {
    const res = await api.get<Product[]>("/products/list");
    setProducts(res.data);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        await loadProducts();
        const catRes = await api.get<Category[]>("/categories/list");
        setCategories(catRes.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const addProduct = async () => {
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock) || 0;
    const taxNum = parseFloat(taxRate) || 18;
    if (!name || !sku || isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter valid product details");
      return;
    }

    await api.post("/products/add", {
      name,
      sku,
      price: priceNum,
      stock: stockNum,
      tax_rate: taxNum,
      category_id: categoryId || null,
    });

    setName("");
    setSku("");
    setPrice("");
    setStock("");
    setTaxRate("18");
    setCategoryId("");
    setShowAddForm(false);
    loadProducts();
  };

  const deleteProduct = async (id: number) => {
    await api.delete(`/products/delete/${id}`);
    loadProducts();
  };

  const restockProduct = async (id: number) => {
    const qty = restockMap[id];
    if (!qty || qty <= 0) return;
    await api.put(`/products/restock/${id}`, { quantity: qty });
    setRestockMap((prev) => ({ ...prev, [id]: 0 }));
    loadProducts();
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toString().includes(search)
  );

  /* stock badge helper */
  const stockBadge = (s: number) => {
    if (s <= 0) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-400/15">Out of Stock</span>;
    if (s <= 10) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-400/15">{s} left</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-400/15">{s} in stock</span>;
  };

  if (loading) return <p className="text-[var(--pos-muted)]">Loading…</p>;

  /* summary stats */
  const totalProducts = products.length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);

  return (
    <div className="space-y-5">

      {/* ── Header bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gradient">Product Inventory</h1>
          <p className="text-xs text-[var(--pos-muted)] mt-0.5">Manage your product catalog, stock levels, and pricing</p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            showAddForm
              ? "bg-white/10 border border-white/10 text-slate-300 hover:bg-white/15"
              : "btn-primary"
          }`}
        >
          {showAddForm ? (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              Cancel
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              Add Product
            </>
          )}
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Products", value: totalProducts, icon: "📦", color: "from-cyan-500/20 to-cyan-600/5 border-cyan-400/15" },
          { label: "Inventory Value", value: `₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: "💰", color: "from-emerald-500/20 to-emerald-600/5 border-emerald-400/15" },
          { label: "Low Stock", value: lowStock, icon: "⚠️", color: "from-amber-500/20 to-amber-600/5 border-amber-400/15" },
          { label: "Out of Stock", value: outOfStock, icon: "🚫", color: "from-rose-500/20 to-rose-600/5 border-rose-400/15" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl border bg-gradient-to-br ${stat.color} p-4 backdrop-blur-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{stat.icon}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--pos-muted)] font-semibold">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-[var(--pos-text)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Add Product Form (collapsible) ── */}
      {showAddForm && (
        <div className="glass-card rounded-2xl p-5 fade-in border border-cyan-400/10">
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New Product Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Product Name</label>
              <input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">SKU Code</label>
              <input placeholder="SKU code" value={sku} onChange={(e) => setSku(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Price (₹)</label>
              <input type="number" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Initial Stock</label>
              <input type="number" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} className="input-surface text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">GST Rate %</label>
              <input type="number" placeholder="18" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="input-surface text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1 block">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")} className="input-surface text-sm">
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={addProduct} className="btn-primary mt-4 px-6 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
            Save Product
          </button>
        </div>
      )}

      {/* ── Search bar ── */}
      <div className="glass-card rounded-2xl p-4">
        <input
          placeholder="Search by name, SKU, or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-surface text-sm"
        />
        {search && (
          <p className="text-[11px] text-[var(--pos-muted)] mt-2">{filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"</p>
        )}
      </div>

      {/* ── Product Table ── */}
      <div className="glass-card rounded-2xl overflow-hidden fade-in stagger-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--pos-border-glow)] border-b border-[var(--pos-border)]">
                <th className="py-3.5 px-4 text-left text-[10px] uppercase tracking-[0.12em] text-[var(--pos-muted)] font-semibold">Product</th>
                <th className="py-3.5 px-4 text-left text-[10px] uppercase tracking-[0.12em] text-[var(--pos-muted)] font-semibold hidden md:table-cell">SKU</th>
                <th className="py-3.5 px-4 text-left text-[10px] uppercase tracking-[0.12em] text-[var(--pos-muted)] font-semibold hidden lg:table-cell">Category</th>
                <th className="py-3.5 px-4 text-right text-[10px] uppercase tracking-[0.12em] text-[var(--pos-muted)] font-semibold">Price</th>
                <th className="py-3.5 px-4 text-right text-[10px] uppercase tracking-[0.12em] text-[var(--pos-muted)] font-semibold hidden sm:table-cell">GST</th>
                <th className="py-3.5 px-4 text-center text-[10px] uppercase tracking-[0.12em] text-[var(--pos-muted)] font-semibold">Stock</th>
                <th className="py-3.5 px-4 text-center text-[10px] uppercase tracking-[0.12em] text-[var(--pos-muted)] font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[var(--pos-muted)] text-sm">No products found.</td>
                </tr>
              )}

              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-[var(--pos-border)] transition hover:bg-[var(--pos-border-glow)] ${p.stock <= 0 ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-[var(--pos-text)] text-[13px]">{p.name}</p>
                    <p className="text-[10px] text-[var(--pos-muted)] md:hidden">{p.sku}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--pos-border-glow)] text-[11px] font-mono text-[var(--pos-muted)]">{p.sku}</span>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--pos-muted)] text-xs hidden lg:table-cell">
                    {p.category_id && categoryMap[p.category_id] ? categoryMap[p.category_id] : <span className="text-[var(--pos-muted)] opacity-60">–</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-cyan-600 dark:text-cyan-300 font-semibold">₹{p.price}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-[var(--pos-muted)] text-xs hidden sm:table-cell">{p.tax_rate}%</td>
                  <td className="px-4 py-3.5 text-center">{stockBadge(p.stock)}</td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {/* Restock inline */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={restockMap[p.id] || ""}
                          onChange={(e) =>
                              setRestockMap((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                          }
                          placeholder="Qty"
                          className="w-14 bg-[var(--pos-surface)] border border-[var(--pos-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--pos-text)] placeholder-[var(--pos-muted)] focus:outline-none focus:border-[var(--pos-accent)]"
                        />
                        <button
                          onClick={() => restockProduct(p.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/15 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/25 transition"
                          title="Restock"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                      </div>

                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/15 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/25 transition"
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}