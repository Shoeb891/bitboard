import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Loading from "../Loading";

export default function AuthGuard({ children, requireAdmin }) {
  const { user, loading, profileLoading } = useAuth();

  if (loading || profileLoading) return <Loading />;
  if (!user)                     return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== "ADMIN") return <Navigate to="/feed" replace />;

  return children;
}
