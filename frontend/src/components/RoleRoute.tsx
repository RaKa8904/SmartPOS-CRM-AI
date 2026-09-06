import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "../context/useAuth";

type Props = {
  children: ReactElement;
  allowedRoles: string[];
};

export default function RoleRoute({ children, allowedRoles }: Props) {
  const { user, role } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    const fallback = role === "sales" ? "/sales" : "/billing";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
