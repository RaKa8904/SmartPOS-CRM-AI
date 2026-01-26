import { useEffect, useState } from "react";
import Layout from "../components/Layout";
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

  // form state
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await api.get<Product[]>("/products/list");
    setProducts(res.data);
    setLoading(false);
  };

  useEffect(() => {
  (async () => {
    await fetchProducts();
  })();
}, []);


  const addProduct = async () => {
    if (!name || !sku || price <= 0) {
      alert("Please enter valid product details");
      return;
    }

    await api.post("/products/add", {
      name,
      sku,
      price,
      stock,
    });

    setName("");
    setSku("");
    setPrice(0);
    setStock(0);

    fetchProducts();
  };

  return (
    <Layout title="Products / Inventory">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Product Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-lg font-semibold mb-4">Add Product</h2>

          <div className="space-y-3">
            <input
              className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
              placeholder="Product Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
              placeholder="SKU"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />

            <input
              className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
              placeholder="Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />

            <input
              className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
              placeholder="Stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
            />

            <button
              onClick={addProduct}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-white font-medium"
            >
              Add Product
            </button>
          </div>
        </div>

        {/* Product List */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Product List</h2>

          {loading ? (
            <p className="text-zinc-400 mt-4">Loading...</p>
          ) : (
            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">SKU</th>
                    <th className="text-left py-2">Price</th>
                    <th className="text-left py-2">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-800">
                      <td className="py-2">{p.id}</td>
                      <td className="py-2">{p.name}</td>
                      <td className="py-2">{p.sku}</td>
                      <td className="py-2">₹ {p.price}</td>
                      <td className="py-2">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {products.length === 0 && (
                <p className="text-zinc-500 mt-4">No products found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
