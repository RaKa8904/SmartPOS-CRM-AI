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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-5 hidden md:block">
        <div className="text-xl font-bold tracking-wide">
          Smart<span className="text-indigo-400">POS</span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">CRM • AI • POS</p>

        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
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
          {role && (
            <p className={`mt-2 font-semibold capitalize ${ROLE_COLORS[role] ?? "text-zinc-400"}`}>
              Role: {role}
            </p>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
          <h1 className="text-lg font-semibold">SmartPOS</h1>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-xs text-zinc-400">
                {user}
              </span>
            )}

            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="bg-red-600/20 text-red-400 border border-red-600/30
                         px-3 py-1.5 rounded-lg text-xs font-medium
                         hover:bg-red-600/30 transition"
            >
              Logout
            </button>

          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
