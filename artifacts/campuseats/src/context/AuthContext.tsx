import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: "student" | "vendor" | "admin";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("campuseats_user");
      const storedToken = localStorage.getItem("campuseats_token");
      if (stored && storedToken) {
        setUser(JSON.parse(stored));
        setToken(storedToken);
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  const login = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem("campuseats_user", JSON.stringify(u));
    localStorage.setItem("campuseats_token", t);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("campuseats_user");
    localStorage.removeItem("campuseats_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
