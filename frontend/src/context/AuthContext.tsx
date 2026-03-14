import { createContext } from "react";

export type AuthContextType = {
  user: string | null;
  email: string | null;
  role: string | null;        // "admin" | "manager" | "cashier"
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, inviteToken?: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
