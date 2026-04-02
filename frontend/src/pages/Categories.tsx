import { useEffect, useState } from "react";
import { api } from "../api";

type Category = {
  id: number;
  name: string;
};

/* ── Emoji map for known categories ── */
const catEmojis: Record<string, string> = {
  "Beverages": "🥤", "Snacks": "🍿", "Dairy & Bakery": "🧈",
  "Instant Meals": "🍜", "Personal Care": "🧴", "Home & Cleaning": "🧹",
  "Stationery": "📒", "Frozen Foods": "🧊", "Health & Wellness": "💊",
  "Electronics Accessories": "🔌", "Spices & Condiments": "🌶️", "Baby & Kids": "🍼",
};

const catColors: Record<string, string> = {
  "Beverages": "from-cyan-500/25 to-cyan-700/5 border-cyan-400/20",
  "Snacks": "from-amber-500/25 to-amber-700/5 border-amber-400/20",
  "Dairy & Bakery": "from-yellow-500/25 to-yellow-700/5 border-yellow-400/20",
  "Instant Meals": "from-orange-500/25 to-orange-700/5 border-orange-400/20",
  "Personal Care": "from-pink-500/25 to-pink-700/5 border-pink-400/20",
  "Home & Cleaning": "from-teal-500/25 to-teal-700/5 border-teal-400/20",
  "Stationery": "from-indigo-500/25 to-indigo-700/5 border-indigo-400/20",
  "Frozen Foods": "from-blue-500/25 to-blue-700/5 border-blue-400/20",
  "Health & Wellness": "from-emerald-500/25 to-emerald-700/5 border-emerald-400/20",
  "Electronics Accessories": "from-violet-500/25 to-violet-700/5 border-violet-400/20",
  "Spices & Condiments": "from-red-500/25 to-red-700/5 border-red-400/20",
  "Baby & Kids": "from-fuchsia-500/25 to-fuchsia-700/5 border-fuchsia-400/20",
};

const defaultColor = "from-slate-500/20 to-slate-700/5 border-slate-400/15";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

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
    if (!name.trim()) return;
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
      setConfirmDelete(null);
      await loadCategories();
    } catch {
      alert("Failed to delete category");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addCategory();
  };

  if (loading) return <p className="text-zinc-400">Loading…</p>;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-gradient">Product Categories</h1>
        <p className="text-xs text-slate-500 mt-0.5">Organize your products into categories for easier management and billing</p>
      </div>

      {/* ── Add Category card ── */}
      <div className="glass-card rounded-2xl p-5 fade-in">
        <label className="text-[10px] uppercase tracking-[0.12em] text-slate-400 font-semibold mb-2 block">New Category</label>
        <div className="flex gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Category name"
              className="input-surface text-sm"
            />
          <button
            onClick={addCategory}
            disabled={!name.trim()}
            className="btn-primary px-6 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add
          </button>
        </div>
      </div>

      {/* ── Categories Grid ── */}
      {categories.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center fade-in stagger-1">
          <div className="text-4xl mb-3 opacity-40">📁</div>
          <p className="text-sm text-slate-500">No categories yet. Create your first category above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 fade-in stagger-1">
          {categories.map((c, idx) => {
            const emoji = catEmojis[c.name] || "📁";
            const colorClass = catColors[c.name] || defaultColor;
            const isConfirming = confirmDelete === c.id;

            return (
              <div
                key={c.id}
                className={`group relative rounded-2xl border bg-gradient-to-br ${colorClass} p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Top row: emoji + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-white/8 backdrop-blur-sm flex items-center justify-center text-xl border border-white/5">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">ID: {c.id}</p>
                  </div>
                </div>

                {/* Delete button / confirm */}
                {isConfirming ? (
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-rose-300 flex-1">Delete this category?</p>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/25 border border-rose-400/20 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/40 transition"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-slate-400 text-[11px] font-semibold hover:bg-white/12 transition"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(c.id)}
                    className="w-full py-1.5 rounded-lg bg-white/5 border border-white/8 text-slate-500 text-[11px] font-medium flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-400/20"
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Summary footer ── */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-600">{categories.length} categor{categories.length === 1 ? "y" : "ies"} total</p>
      </div>
    </div>
  );
}
