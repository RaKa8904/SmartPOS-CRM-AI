import { useState } from "react";
import { AuthContext } from "./AuthContext";
import { api } from "../api";

/** Decode JWT payload without an external library */
function decodeToken(token: string): Record<string, string> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const stored = localStorage.getItem("access_token");
  const storedPayload = stored ? decodeToken(stored) : null;

  const [user, setUser] = useState<string | null>(
    storedPayload?.sub ?? null
  );
  const [role, setRole] = useState<string | null>(
    storedPayload?.role ?? null
  );

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const token = res.data.access_token;
    localStorage.setItem("access_token", token);
    const payload = decodeToken(token);
    setUser(payload?.sub ?? email);
    setRole(payload?.role ?? res.data.role ?? "cashier");
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
