import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

type LayoutProps = {
  title: string;
  children: ReactNode;
};

const navItems = [
  { name: "Dashboard", path: "/" },
  { name: "Billing", path: "/billing" },
  { name: "Products", path: "/products" },
  { name: "Customers", path: "/customers" },

  // ✅ Phase 7
  { name: "Pricing", path: "/pricing" },
  { name: "Notifications", path: "/notifications" },

  { name: "ML Insights", path: "/ml" },
];

export default function Layout({ title, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-65 bg-zinc-900 border-r border-zinc-800 p-5 hidden md:block">
        <div className="text-xl font-bold tracking-wide">
          Smart<span className="text-indigo-400">POS</span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">CRM • AI • POS</p>

        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-10 text-xs text-zinc-500">
          <p>Backend: 127.0.0.1:8000</p>
          <p>Frontend: localhost:5173</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="text-xs text-zinc-400">Phase 7 • UI Integration 😤🔥</div>
        </header>

        {/* Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
