import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
  { name: "Notifications", path: "/notifications",roles: ["admin", "manager"] },
  { name: "ML Insights",   path: "/ml",           roles: ["admin", "manager"] },
];

const ROLE_COLORS: Record<string, string> = {
  admin:   "text-red-400",
  manager: "text-yellow-400",
  cashier: "text-green-400",
};

export default function Layout() {
  const { logout, user, role } = useAuth();
  const navigate = useNavigate();

  const navItems = allNavItems.filter(
    (item) => !role || item.roles.includes(role)
  );

  return (
    <div className="app-shell min-h-screen text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-72 glass-card border-r border-[#3b4488]/40 p-5 hidden md:block fade-in">
        <div className="text-xl font-bold tracking-wide">
          <span className="text-gradient">Smart</span>
          <span className="text-cyan-100">POS</span>
        </div>
        <p className="text-xs text-slate-300/75 mt-1">CRM • AI • POS Platform</p>

        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-xl text-sm font-medium transition duration-200 ${
                  isActive
                    ? "bg-cyan-400/16 text-cyan-200 border border-cyan-300/35 glow-ring"
                    : "text-slate-200/90 hover:bg-slate-400/10 hover:text-cyan-100"
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-10 text-xs text-slate-300/65">
          <p>Backend: 127.0.0.1:8000</p>
          <p>Frontend: localhost:5173</p>
          {role && (
            <p className={`mt-2 font-semibold capitalize ${ROLE_COLORS[role] ?? "text-slate-300"}`}>
              Role: {role}
            </p>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#4550a0]/35 bg-[#120f2f]/65 backdrop-blur-xl fade-in">
          <h1 className="text-lg font-semibold text-cyan-100 tracking-wide">SmartPOS Console</h1>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-xs text-slate-300/80 glass-card px-3 py-1 rounded-full border border-slate-400/30">
                {user}
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
