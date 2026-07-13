import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { api, setAccessToken } from "../api";

/** Decode JWT payload without an external library */
function decodeToken(token: string): Record<string, string | number> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function asString(value: string | number | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      // Try to silently refresh token on app mount (e.g. reload or open new tab)
      try {
        const res = await api.post("/auth/refresh");
        const token = res.data.access_token;
        setAccessToken(token);

        const payload = decodeToken(token);
        setUser(asString(payload?.name as string | number | undefined) ?? (res.data.username as string | undefined) ?? (payload?.sub as string));
        setEmail(asString(payload?.sub as string | number | undefined));
        setRole((payload?.role as string | undefined) ?? res.data.role ?? "cashier");
      } catch {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, []);

  const login = async (emailVal: string, password: string) => {
    const res = await api.post("/auth/login", { email: emailVal, password });
    const token = res.data.access_token;
    
    // Store access token in memory (cookie is stored automatically by browser)
    setAccessToken(token);

    const payload = decodeToken(token);
    setUser(asString(payload?.name as string | number | undefined) ?? (res.data.username as string | undefined) ?? emailVal);
    setEmail(asString(payload?.sub as string | number | undefined) ?? emailVal);
    setRole((payload?.role as string | undefined) ?? res.data.role ?? "cashier");
  };

  const register = async (emailVal: string, username: string, password: string, inviteToken?: string) => {
    await api.post("/auth/register", { email: emailVal, username, password, invite_token: inviteToken });
    await login(emailVal, password);
  };

  const logout = async () => {
    try {
      // Clean up HttpOnly cookie on the backend
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      // Clear client state regardless
      setAccessToken(null);
      setUser(null);
      setEmail(null);
      setRole(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#121214] text-zinc-400 font-cyber text-sm">
        Initializing session...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, email, role, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
