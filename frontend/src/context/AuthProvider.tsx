import { useState } from "react";
import { AuthContext } from "./AuthContext";
import { api } from "../api";

/** Decode JWT payload without an external library */
function decodeToken(token: string): Record<string, string | number> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isExpired(payload: Record<string, string | number> | null): boolean {
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const accessToken = localStorage.getItem("access_token");
  const legacyToken = localStorage.getItem("token");
  const stored = accessToken ?? legacyToken;

  if (legacyToken && !accessToken) {
    localStorage.setItem("access_token", legacyToken);
    localStorage.removeItem("token");
  }

  const storedPayload = stored ? decodeToken(stored) : null;

  if (stored && isExpired(storedPayload)) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
  }

  const [user, setUser] = useState<string | null>(
    stored && !isExpired(storedPayload) ? (storedPayload?.sub as string | null) ?? null : null
  );
  const [role, setRole] = useState<string | null>(
    stored && !isExpired(storedPayload) ? (storedPayload?.role as string | null) ?? null : null
  );

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const token = res.data.access_token;
    localStorage.setItem("access_token", token);
    const payload = decodeToken(token);
    setUser((payload?.sub as string | undefined) ?? email);
    setRole((payload?.role as string | undefined) ?? res.data.role ?? "cashier");
  };

  const register = async (email: string, password: string, roleArg?: string) => {
    await api.post("/auth/register", { email, password, role: roleArg });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
    setRole(null);
  };


  return (
    <AuthContext.Provider value={{ user, role, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
