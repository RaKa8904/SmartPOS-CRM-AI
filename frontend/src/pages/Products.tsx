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

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<Product[]>("/products/list");
        setProducts(res.data);
      } catch (err) {
        console.error(err);
        alert("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    load();
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

    const res = await api.get<Product[]>("/products/list");
    setProducts(res.data);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-semibold mb-4">Add Product</h2>

        <div className="space-y-3">
          <input
            className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800"
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800"
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <input
            className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800"
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
          <input
            className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800"
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
          />

          <button
            onClick={addProduct}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500"
          >
            Add Product
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Product List</h2>

        {loading ? (
          <p className="text-zinc-400 mt-4">Loading...</p>
        ) : (
          <table className="w-full text-sm table-fixed">
  <thead>
    <tr className="text-zinc-400 border-b border-zinc-800">
      <th className="w-12 text-left py-2">ID</th>
      <th className="w-40 text-left py-2">Name</th>
      <th className="w-32 text-left py-2">SKU</th>
      <th className="w-24 text-right py-2">Price</th>
      <th className="w-20 text-right py-2">Stock</th>
    </tr>
  </thead>
  <tbody>
    {products.map((p) => (
      <tr
        key={p.id}
        className="border-b border-zinc-800 hover:bg-zinc-900/40 transition"
      >
        <td className="py-2">{p.id}</td>
        <td className="py-2 truncate">{p.name}</td>
        <td className="py-2 text-zinc-400">{p.sku}</td>
        <td className="py-2 text-right">₹ {p.price}</td>
        <td
          className={`py-2 text-right font-medium ${
            p.stock === 0 ? "text-red-400" : "text-green-400"
          }`}
        >
          {p.stock}
        </td>
      </tr>
    ))}
  </tbody>
</table>
        )}
      </div>
    </div>
  );
}
