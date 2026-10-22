import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { request, User } from "./api";

type AuthContextValue = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function storedUser(): User | null {
  try {
    const value = localStorage.getItem("inkwell-user");
    return value ? JSON.parse(value) as User : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(storedUser);

  async function authenticate(path: string, payload: Record<string, string>) {
    const result = await request<{ user: User; token: string }>(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    localStorage.setItem("inkwell-token", result.token);
    localStorage.setItem("inkwell-user", JSON.stringify(result.user));
    setUser(result.user);
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    signIn: (email, password) => authenticate("/auth/login", { email, password }),
    signUp: (name, email, password) => authenticate("/auth/register", { name, email, password }),
    signOut: () => {
      localStorage.removeItem("inkwell-token");
      localStorage.removeItem("inkwell-user");
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
