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
    return <Navigate to="/billing" replace />;
  }

  return children;
}
