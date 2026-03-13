import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/useAuth";

type NavItem = { name: string; path: string; roles: string[] };

const allNavItems: NavItem[] = [
  { name: "Dashboard",     path: "/",             roles: ["admin", "manager"] },
  { name: "Billing",       path: "/billing",      roles: ["admin", "manager", "cashier"] },
  { name: "Products",      path: "/products",     roles: ["admin", "manager"] },
  { name: "Categories",    path: "/categories",   roles: ["admin", "manager"] },
  { name: "Customers",     path: "/customers",    roles: ["admin", "manager", "cashier"] },
  { name: "Pricing",       path: "/pricing",      roles: ["admin", "manager"] },
  { name: "Users",         path: "/users",        roles: ["admin"] },
  { name: "Audit Logs",    path: "/audit-logs",   roles: ["admin"] },
  { name: "Notifications", path: "/notifications",roles: ["admin", "manager"] },
  { name: "ML Insights",   path: "/ml",           roles: ["admin", "manager"] },
];

const ROLE_COLORS: Record<string, string> = {
  admin:   "text-red-400",
  manager: "text-yellow-400",
  cashier: "text-green-400",
};

export default function Layout() {
  const { logout, user, email, role } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = allNavItems.filter(
    (item) => !role || item.roles.includes(role)
  );

  return (
    <div className="app-shell min-h-screen text-zinc-100 flex">
      {/* Sidebar */}
      <aside className={`glass-card border-r border-[#3b4488]/40 p-3 md:p-4 hidden md:block fade-in transition-all duration-300 overflow-hidden ${sidebarCollapsed ? "w-20" : "w-72"}`}>
        <div className="text-xl font-bold tracking-wide whitespace-nowrap">
          <span className="text-gradient">Smart</span>
          {!sidebarCollapsed && <span className="text-cyan-100">POS</span>}
        </div>
        {!sidebarCollapsed && <p className="text-xs text-slate-300/75 mt-1">CRM • AI • POS Platform</p>}

        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `rounded-xl text-sm font-medium transition duration-200 ${sidebarCollapsed ? "px-2 py-2 justify-center flex" : "px-4 py-2.5"} ${
                  isActive
                    ? "bg-cyan-400/16 text-cyan-200 border border-cyan-300/35 glow-ring"
                    : "text-slate-200/90 hover:bg-slate-400/10 hover:text-cyan-100"
                }`
              }
              title={item.name}
            >
              {sidebarCollapsed ? (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/30 bg-[#0f1b43]/70 text-cyan-100 font-semibold">
                  {item.name.charAt(0)}
                </span>
              ) : (
                item.name
              )}
            </NavLink>
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="mt-10 text-xs text-slate-300/65">
            <p>Backend: 127.0.0.1:8000</p>
            <p>Frontend: localhost:5173</p>
            {role && (
              <p className={`mt-2 font-semibold capitalize ${ROLE_COLORS[role] ?? "text-slate-300"}`}>
                Role: {role}
              </p>
            )}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#4550a0]/35 bg-[#120f2f]/65 backdrop-blur-xl fade-in">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 transition"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : "rotate-0"}`} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-cyan-100 tracking-wide">SmartPOS Console</h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-xs text-slate-300/80 glass-card px-3 py-1 rounded-full border border-slate-400/30">
                {user}{email && email !== user ? ` (${email})` : ""}
              </span>
            )}

            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="btn-danger px-3 py-1.5 rounded-lg text-xs font-medium
                         hover:bg-red-600/30 transition"
            >
              Logout
            </button>

          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6 fade-in stagger-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
