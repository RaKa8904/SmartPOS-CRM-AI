import { useEffect, useState } from "react";
import { api } from "../api";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);

  const [restockMap, setRestockMap] = useState<Record<number, number>>({});

  const loadProducts = async () => {
    const res = await api.get<Product[]>("/products/list");
    setProducts(res.data);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        await loadProducts();
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const addProduct = async () => {
    if (!name || !sku || price <= 0) {
      alert("Please enter valid product details");
      return;
    }

    await api.post("/products/add", { name, sku, price, stock });

    setName("");
    setSku("");
    setPrice(0);
    setStock(0);

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
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Add New Product</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded-xl p-2"
          />
          <input
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded-xl p-2"
          />
          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="bg-zinc-950 border border-zinc-700 rounded-xl p-2"
          />
          <input
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            className="bg-zinc-950 border border-zinc-700 rounded-xl p-2"
          />
        </div>

        <button
          onClick={addProduct}
          className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium"
        >
          Add Product
        </button>
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search by name or ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3"
      />

      {/* PRODUCT TABLE */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/70 text-zinc-400">
            <tr>
              <th className="py-3 px-4 text-left">ID</th>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">SKU</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-right">Stock</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="border-b border-zinc-800 hover:bg-zinc-900/40 transition"
              >
                <td className="px-4 py-3">{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-zinc-400">{p.sku}</td>
                <td className="px-4 py-3 text-right text-indigo-400">
                  ₹ {p.price}
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
                      className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs"
                    />

                    <button
                      onClick={() => restockProduct(p.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-xs"
                    >
                      Restock
                    </button>

                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-xs"
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