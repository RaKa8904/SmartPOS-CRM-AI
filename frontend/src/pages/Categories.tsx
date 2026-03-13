import { useEffect, useState } from "react";
import { api } from "../api";

type Category = {
  id: number;
  name: string;
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    const res = await api.get<Category[]>("/categories/list");
    setCategories(res.data ?? []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadCategories();
      } catch {
        alert("Failed to load categories");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addCategory = async () => {
    if (!name.trim()) {
      return;
    }
    try {
      await api.post("/categories/add", { name: name.trim() });
      setName("");
      await loadCategories();
    } catch {
      alert("Failed to add category");
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await api.delete(`/categories/delete/${id}`);
      await loadCategories();
    } catch {
      alert("Failed to delete category");
    }
  };

  if (loading) return <p className="text-zinc-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Product Categories</h2>

        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2"
          />
          <button
            onClick={addCategory}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl"
          >
            Add
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/50 text-zinc-400">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-zinc-800">
                <td className="px-4 py-3">{c.id}</td>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteCategory(c.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={3}>
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
