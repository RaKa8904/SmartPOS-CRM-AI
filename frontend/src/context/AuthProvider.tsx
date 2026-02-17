import { useState } from "react";
import { AuthContext } from "./AuthContext";
import { api } from "../api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  const [user, setUser] = useState<string | null>(
    token ? "authenticated" : null
  );

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("access_token", res.data.access_token);
    setUser(email);
  };

  const register = async (email: string, password: string) => {
    await api.post("/auth/register", { email, password });
    await login(email, password);
  };

  const logout = () => {
  localStorage.removeItem("token");
  setUser(null);
  };


  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
