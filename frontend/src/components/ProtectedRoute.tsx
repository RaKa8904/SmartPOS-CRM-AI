import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "../context/useAuth";

type Props = {
  children: ReactElement;
};

export default function ProtectedRoute({ children }: Props) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
