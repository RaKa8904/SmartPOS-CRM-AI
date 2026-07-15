import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

const GROUP_ICONS: Record<string, React.ReactNode> = {
  Overview: (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 opacity-60 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Operations: (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 opacity-60 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
    </svg>
  ),
  Admin: (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 opacity-60 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  ),
  Analytics: (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 opacity-60 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
};

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

  type ThemeMode = "light" | "dark" | "system";

  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("theme") as ThemeMode) || "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (currentTheme: ThemeMode) => {
      let isDark = false;
      if (currentTheme === "dark") {
        isDark = true;
      } else if (currentTheme === "light") {
        isDark = false;
      } else {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      
      if (isDark) {
        root.setAttribute("data-theme", "dark");
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.setAttribute("data-theme", "light");
        root.classList.add("light");
        root.classList.remove("dark");
      }
    };

    applyTheme(theme);
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Operations: true,
    Admin: true,
    Analytics: true,
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const roleMeta = role ? ROLE_META[role] : null;

  const visibleGroups = allGroups
    .map((g) => ({ ...g, items: g.items.filter((item) => !role || item.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="app-shell min-h-screen text-[color:var(--pos-text)] flex">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 border-r bg-[var(--pos-bg-1)] 
                    ${collapsed ? "w-0 border-r-transparent overflow-hidden" : "w-60 border-r-[var(--pos-border)]"}`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-[var(--pos-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#4a6869] to-[#cba16c] shadow-md">
              <SvgIcon className="h-4 w-4 text-white stroke-2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </SvgIcon>
            </div>
            <div className="leading-[1.2] min-w-0">
              <p className="text-[13px] font-cyber text-gradient font-bold tracking-wide">SmartPOS</p>
              <p className="text-[9px] text-slate-500 tracking-widest uppercase font-cyber">CRM · AI · POS</p>
            </div>
          </div>
          {/* Collapse button inside sidebar */}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/8 hover:text-[--pos-accent] transition duration-200"
            title="Collapse sidebar"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4.5 w-4.5 stroke-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" className="transition-transform duration-300 group-hover:translate-x-0.5" />
              <path d="M13 15l-3-3 3-3" className="transition-all duration-300 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
            </svg>
          </button>
        </div>

        {/* Groups */}
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-4 px-2">
          {visibleGroups.map((group) => {
            const isExpanded = expandedGroups[group.label] !== false;
            return (
              <div key={group.label} className="flex flex-col">
                {/* Section label */}
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center justify-between w-full mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-[var(--pos-text)] transition select-none text-left"
                  >
                    <span className="flex items-center">
                      {GROUP_ICONS[group.label]}
                      <span>{group.label}</span>
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-3 w-3 transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ) : (
                  <div className="mb-1.5 mx-auto h-px w-6 bg-[var(--pos-border)]" />
                )}

                {/* Nav Items Container (collapsible) */}
                <div
                  className={`flex flex-col gap-0.5 overflow-hidden transition-all duration-300 ${
                    !collapsed && !isExpanded ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                  }`}
                >
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
                           ? "bg-[rgba(74,104,105,0.14)] text-[var(--pos-text)] border-l-2 border-[--pos-accent] font-cyber font-semibold"
                           : "text-[var(--pos-muted)] hover:bg-[var(--pos-border-glow)] hover:text-[var(--pos-text)] hover:translate-x-0.5"
                         }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`shrink-0 transition-colors ${isActive ? "text-[--pos-accent]" : "text-slate-500 group-hover:text-[--pos-accent]"}`}>
                            {item.icon}
                          </span>
                          {!collapsed && <span className="truncate">{item.name}</span>}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Role pill */}
        {roleMeta && (
          <div className={`px-3 py-3 border-t border-[var(--pos-border)] ${collapsed ? "flex justify-center" : ""}`}>
            {collapsed ? (
              <span className={`h-2 w-2 rounded-full ${roleMeta.dot}`} title={roleMeta.label} />
            ) : (
              <div className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${roleMeta.bg} border border-[var(--pos-border)]`}>
                <span className={`h-1.5 w-1.5 rounded-full ${roleMeta.dot} shrink-0`} />
                <span className={`text-[11px] font-cyber font-semibold ${roleMeta.text}`}>{roleMeta.label}</span>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--pos-border)] bg-[var(--pos-bg-1)]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Morphing Logo / Expand Button when collapsed */}
            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition duration-200 hover:bg-[var(--pos-border-glow)] mr-1"
                title="Expand sidebar"
              >
                {/* Logo Icon (default visible, fades out on hover) */}
                <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 group-hover:opacity-0 group-hover:scale-75">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4a6869] to-[#cba16c] shadow-md">
                    <SvgIcon className="h-4 w-4 text-white stroke-2">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </SvgIcon>
                  </div>
                </div>

                {/* Animated Expand Panel Icon (revealed on hover) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 stroke-2 text-[--pos-accent]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" className="transition-transform duration-300 group-hover:translate-x-0.5" />
                    <path d="M14 9l3 3-3 3" className="transition-all duration-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
                  </svg>
                </div>
              </button>
            )}
            <h1 className="text-[15px] font-cyber text-[var(--pos-text)] font-bold tracking-wide">SmartPOS Console</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => {
                const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
                setTheme(nextTheme);
              }}
              className="text-[11px] font-cyber font-medium text-[var(--pos-muted)] bg-[var(--pos-surface)] border border-[var(--pos-border)] hover:border-[--pos-accent] hover:text-[var(--pos-text)] hover:bg-[var(--pos-border-glow)] px-3 py-1.5 rounded-full transition flex items-center gap-1.5 cursor-pointer select-none"
              title={`Theme: ${theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}`}
            >
              {theme === "light" && (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="18.36" x2="5.64" y2="19.78"/><line x1="18.36" y1="4.22" x2="19.78" y2="5.64"/>
                  </svg>
                  <span>Light</span>
                </>
              )}
              {theme === "dark" && (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                  <span>Dark</span>
                </>
              )}
              {theme === "system" && (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <span>System</span>
                </>
              )}
            </button>

            {user && (
              <span className="text-[11px] font-cyber text-[var(--pos-text)] bg-[var(--pos-surface)] border border-[var(--pos-border)] px-3 py-1.5 rounded-full">
                {user}{email && email !== user ? ` · ${email}` : ""}
              </span>
            )}
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="text-[11px] font-cyber font-medium text-[var(--pos-muted)] bg-[var(--pos-surface)] border border-[var(--pos-border)] hover:border-[--pos-accent] hover:text-[var(--pos-text)] hover:bg-[var(--pos-border-glow)] px-3 py-1.5 rounded-full transition"
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
