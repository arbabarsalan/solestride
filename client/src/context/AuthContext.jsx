import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

// Auth state lives on the client: a JWT from the auth API plus the signed-in
// user object. API calls that need the account pass the token explicitly.
const AuthContext = createContext(null);
const STORAGE_KEY = "libas.auth.v1";

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw);
    return parsed && parsed.token && parsed.user
      ? parsed
      : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  useEffect(() => {
    if (auth.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      async login(email, password) {
        const data = await api.post("/auth/login", { email, password });
        setAuth({ token: data.token, user: data.user });
        return data.user;
      },
      async register(email, password, fullName) {
        const data = await api.post("/auth/register", { email, password, fullName });
        setAuth({ token: data.token, user: data.user });
        return data.user;
      },
      logout() {
        setAuth({ token: null, user: null });
      },
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
