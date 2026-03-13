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
    const taxNum   = parseFloat(taxRate) || 18;
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
      p.id.toString().includes(search)
  );

  if (loading) return <p className="text-zinc-400">Loading...</p>;

  return (
    <div className="space-y-8">

      {/* ADD PRODUCT CARD */}
      <div className="glass-card rounded-2xl p-6 shadow-xl fade-in">
        <h2 className="section-title text-gradient mb-4">Add New Product</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-surface"
          />
          <input
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="input-surface"
          />
          <input
            type="number"
            placeholder="Price (₹)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input-surface"
          />
          <input
            type="number"
            placeholder="Initial Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="input-surface"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <input
            type="number"
            placeholder="GST Rate % (e.g. 18)"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className="input-surface"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
            className="input-surface"
          >
            <option value="">No Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={addProduct}
          className="btn-primary mt-4 px-6 py-2 font-medium"
        >
          Add Product
        </button>
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search by name or ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-surface"
      />

      {/* PRODUCT TABLE */}
      <div className="glass-card rounded-2xl shadow-xl overflow-hidden fade-in stagger-1">
        <table className="w-full text-sm">
          <thead className="bg-[#1b214a]/70 text-slate-300/80">
            <tr>
              <th className="py-3 px-4 text-left">ID</th>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">SKU</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-right">GST%</th>
              <th className="py-3 px-4 text-right">Stock</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="border-b border-[#33437f]/25 hover:bg-[#24366c]/20 transition"
              >
                <td className="px-4 py-3">{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-zinc-400">{p.sku}</td>
                <td className="px-4 py-3 text-right text-indigo-400">
                  ₹ {p.price}
                </td>
                <td className="px-4 py-3 text-right text-zinc-400">
                  {p.tax_rate}%
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    p.stock === 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {p.stock}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      value={restockMap[p.id] || ""}
                      onChange={(e) =>
                        setRestockMap((prev) => ({
                          ...prev,
                          [p.id]: Number(e.target.value),
                        }))
                      }
                      placeholder="Qty"
                      className="w-16 input-surface px-2 py-1 text-xs"
                    />

                    <button
                      onClick={() => restockProduct(p.id)}
                      className="px-3 py-1 bg-emerald-600/85 hover:bg-emerald-500 rounded-lg text-xs"
                    >
                      Restock
                    </button>

                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="btn-danger px-3 py-1 rounded-lg text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}