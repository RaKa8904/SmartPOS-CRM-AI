import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/useAuth";

/* ─── Icon primitives ─────────────────────────────────────── */
function SvgIcon({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4.5 w-4.5 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const Icons = {
  Dashboard:     <SvgIcon><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></SvgIcon>,
  Billing:       <SvgIcon><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></SvgIcon>,
  Products:      <SvgIcon><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></SvgIcon>,
  Categories:    <SvgIcon><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></SvgIcon>,
  Customers:     <SvgIcon><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></SvgIcon>,
  Pricing:       <SvgIcon><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></SvgIcon>,
  UserActivity:  <SvgIcon><path d="M4 19h16"/><path d="M7 15l3-4 3 2 4-6"/><circle cx="7" cy="15" r="1.2"/><circle cx="10" cy="11" r="1.2"/><circle cx="13" cy="13" r="1.2"/><circle cx="17" cy="7" r="1.2"/></SvgIcon>,
  Users:         <SvgIcon><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></SvgIcon>,
  AuditLogs:     <SvgIcon><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></SvgIcon>,
  Notifications: <SvgIcon><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></SvgIcon>,
  MLInsights:    <SvgIcon><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></SvgIcon>,
};

/* ─── Nav structure ───────────────────────────────────────── */
type NavItem = { name: string; path: string; roles: string[]; icon: React.ReactNode };
type NavGroup = { label: string; items: NavItem[] };

const allGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard",  path: "/",    roles: ["admin", "manager"], icon: Icons.Dashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Billing",    path: "/billing",     roles: ["admin", "manager", "cashier"], icon: Icons.Billing },
      { name: "Products",   path: "/products",    roles: ["admin", "manager"],            icon: Icons.Products },
      { name: "Categories", path: "/categories",  roles: ["admin", "manager"],            icon: Icons.Categories },
      { name: "Customers",  path: "/customers",   roles: ["admin", "manager", "cashier"], icon: Icons.Customers },
      { name: "Pricing",    path: "/pricing",     roles: ["admin", "manager"],            icon: Icons.Pricing },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "User Activity", path: "/user-activity", roles: ["admin"], icon: Icons.UserActivity },
      { name: "Users",         path: "/users",         roles: ["admin"], icon: Icons.Users },
      { name: "Audit Logs",    path: "/audit-logs",    roles: ["admin"], icon: Icons.AuditLogs },
      { name: "Notifications", path: "/notifications", roles: ["admin", "manager"], icon: Icons.Notifications },
    ],
  },
  {
    label: "Analytics",
    items: [
      { name: "ML Insights", path: "/ml", roles: ["admin", "manager"], icon: Icons.MLInsights },
    ],
  },
];

const ROLE_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  admin:   { label: "Admin",   dot: "bg-red-400",    bg: "bg-red-500/10",    text: "text-red-300" },
  manager: { label: "Manager", dot: "bg-yellow-400", bg: "bg-yellow-500/10", text: "text-yellow-300" },
  cashier: { label: "Cashier", dot: "bg-emerald-400",bg: "bg-emerald-500/10",text: "text-emerald-300" },
};

export default function Layout() {
  const { logout, user, email, role } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const roleMeta = role ? ROLE_META[role] : null;

  const visibleGroups = allGroups
    .map((g) => ({ ...g, items: g.items.filter((item) => !role || item.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="app-shell min-h-screen text-zinc-100 flex">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 border-r border-white/5
                    bg-[#0d1130] ${collapsed ? "w-17" : "w-60"}`}
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 px-3 py-4 border-b border-white/5 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-cyan-400 to-indigo-500">
            <SvgIcon className="h-4 w-4 text-white stroke-2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </SvgIcon>
          </div>
          {!collapsed && (
            <div className="leading-[1.2] min-w-0">
              <p className="text-[13px] font-bold text-white tracking-wide">SmartPOS</p>
              <p className="text-[9px] text-slate-500 tracking-widest uppercase">CRM · AI · POS</p>
            </div>
          )}
        </div>

        {/* Groups */}
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-5 px-2">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {/* Section label */}
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 select-none">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="mb-1.5 mx-auto h-px w-6 bg-white/10" />}

              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    title={collapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 select-none
                       ${collapsed ? "justify-center py-2.5 px-0" : "px-2.5 py-2"}
                       ${isActive
                         ? "bg-cyan-500/15 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]"
                         : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                       }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`shrink-0 transition-colors ${isActive ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}`}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Role pill */}
        {roleMeta && (
          <div className={`px-3 py-3 border-t border-white/5 ${collapsed ? "flex justify-center" : ""}`}>
            {collapsed ? (
              <span className={`h-2 w-2 rounded-full ${roleMeta.dot}`} title={roleMeta.label} />
            ) : (
              <div className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${roleMeta.bg}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${roleMeta.dot} shrink-0`} />
                <span className={`text-[11px] font-semibold ${roleMeta.text}`}>{roleMeta.label}</span>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-[#090c24]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:bg-white/8 hover:text-slate-200 transition"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6"/>
              </svg>
            </button>
            <h1 className="text-[15px] font-semibold text-slate-200 tracking-wide">SmartPOS Console</h1>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-[11px] text-slate-400 bg-white/5 border border-white/8 px-3 py-1 rounded-full">
                {user}{email && email !== user ? ` · ${email}` : ""}
              </span>
            )}
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="text-[11px] font-medium text-slate-400 bg-white/5 border border-white/8 hover:border-red-400/30 hover:text-red-300 hover:bg-red-500/10 px-3 py-1 rounded-full transition"
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
