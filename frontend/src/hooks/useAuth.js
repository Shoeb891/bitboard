// Shorter alias for useAuthContext.
import { useAuthContext } from "../context/AuthContext";

export function useAuth() {
  return useAuthContext();
}
