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
      <div className="glass-card rounded-2xl p-6 fade-in">
        <h2 className="section-title text-gradient mb-4">Product Categories</h2>

        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="input-surface flex-1"
          />
          <button
            onClick={addCategory}
            className="btn-primary px-4 py-2"
          >
            Add
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden fade-in stagger-1">
        <table className="w-full text-sm">
          <thead className="bg-[#1b214a]/70 text-slate-300/80">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-[#3c4a8f]/30 hover:bg-[#203063]/20 transition">
                <td className="px-4 py-3">{c.id}</td>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteCategory(c.id)}
                    className="btn-danger px-3 py-1 rounded-lg text-xs"
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
