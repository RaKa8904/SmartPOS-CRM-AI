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

function asString(value: string | number | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
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
    stored && !isExpired(storedPayload)
      ? asString(storedPayload?.name as string | number | undefined)
        ?? asString(storedPayload?.sub as string | number | undefined)
      : null
  );
  const [email, setEmail] = useState<string | null>(
    stored && !isExpired(storedPayload)
      ? asString(storedPayload?.sub as string | number | undefined)
      : null
  );
  const [role, setRole] = useState<string | null>(
    stored && !isExpired(storedPayload) ? asString(storedPayload?.role as string | number | undefined) : null
  );

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const token = res.data.access_token;
    localStorage.setItem("access_token", token);
    const payload = decodeToken(token);
    setUser(asString(payload?.name as string | number | undefined) ?? (res.data.username as string | undefined) ?? email);
    setEmail(asString(payload?.sub as string | number | undefined) ?? email);
    setRole((payload?.role as string | undefined) ?? res.data.role ?? "cashier");
  };

  const register = async (email: string, username: string, password: string, roleArg?: string) => {
    await api.post("/auth/register", { email, username, password, role: roleArg });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
    setEmail(null);
    setRole(null);
  };


  return (
    <AuthContext.Provider value={{ user, email, role, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
