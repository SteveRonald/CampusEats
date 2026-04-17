"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { client } from "@/lib/api";
import { AuthResponse, CartItem, LoginPayload, RegisterPayload, SessionProfile } from "@/lib/types";

type ToastTone = "success" | "error" | "info";

type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

const SessionContext = createContext<{
  profile: SessionProfile | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<SessionProfile>;
  register: (payload: RegisterPayload) => Promise<SessionProfile>;
  adminLogin: (payload: LoginPayload) => Promise<SessionProfile>;
  refreshProfile: () => Promise<SessionProfile | null>;
  logout: () => void;
} | null>(null);

const CartContext = createContext<{
  items: CartItem[];
  setItems: (items: CartItem[]) => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  clearCart: () => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  totalItems: number;
  totalAmount: number;
  vendorId: number | null;
} | null>(null);

const ToastContext = createContext<{
  toast: (message: { title: string; description?: string; tone?: ToastTone }) => void;
} | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<SessionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItemsState] = useState<CartItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const toast = (message: { title: string; description?: string; tone?: ToastTone }) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const nextToast: ToastMessage = {
      id,
      title: message.title,
      description: message.description,
      tone: message.tone ?? "success"
    };

    setToasts((current) => [...current, nextToast].slice(-3));
    window.setTimeout(() => removeToast(id), 3500);
  };

  const persistSession = ({ token, profile: nextProfile }: AuthResponse) => {
    setProfileState(nextProfile);
    window.localStorage.setItem("campuseats_token", token);
    window.localStorage.setItem("campuseats_profile", JSON.stringify(nextProfile));
    return nextProfile;
  };

  const clearSession = () => {
    setProfileState(null);
    setItemsState([]);
    window.localStorage.removeItem("campuseats_token");
    window.localStorage.removeItem("campuseats_profile");
    window.localStorage.removeItem("campuseats_cart");
  };

  useEffect(() => {
    const storedToken = window.localStorage.getItem("campuseats_token");
    const storedProfile = window.localStorage.getItem("campuseats_profile");
    const storedCart = window.localStorage.getItem("campuseats_cart");

    if (storedProfile) {
      setProfileState(JSON.parse(storedProfile));
    }

    if (storedCart) setItemsState(JSON.parse(storedCart));

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    client
      .me()
      .then(({ profile: freshProfile }) => {
        setProfileState(freshProfile);
        window.localStorage.setItem("campuseats_profile", JSON.stringify(freshProfile));
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (payload: LoginPayload) => {
    const response = await client.login(payload);
    return persistSession(response);
  };

  const register = async (payload: RegisterPayload) => {
    const response = await client.register(payload);
    return persistSession(response);
  };

  const adminLogin = async (payload: LoginPayload) => {
    const response = await client.adminLogin(payload);
    return persistSession(response);
  };

  const setItems = (nextItems: CartItem[]) => {
    setItemsState(nextItems);
    window.localStorage.setItem("campuseats_cart", JSON.stringify(nextItems));
  };

  const addItem = (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    setItemsState((current) => {
      const base = current.length > 0 && current[0].vendorId !== item.vendorId ? [] : current;
      const existing = base.find((entry) => entry.menuItemId === item.menuItemId);
      const quantity = item.quantity ?? 1;
      const next = existing
        ? base.map((entry) =>
            entry.menuItemId === item.menuItemId ? { ...entry, quantity: entry.quantity + quantity } : entry
          )
        : [...base, { ...item, quantity }];
      window.localStorage.setItem("campuseats_cart", JSON.stringify(next));
      return next;
    });
  };

  const clearCart = () => setItems([]);

  const refreshProfile = async () => {
    const token = window.localStorage.getItem("campuseats_token");
    if (!token) {
      setProfileState(null);
      return null;
    }

    const { profile: freshProfile } = await client.me();
    setProfileState(freshProfile);
    window.localStorage.setItem("campuseats_profile", JSON.stringify(freshProfile));
    return freshProfile;
  };

  const logout = () => clearSession();

  const updateQuantity = (menuItemId: number, quantity: number) => {
    const nextItems = items
      .map((item) => (item.menuItemId === menuItemId ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    setItems(nextItems);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <SessionContext.Provider value={{ profile, isLoading, login, register, adminLogin, refreshProfile, logout }}>
        <CartContext.Provider
          value={{
            items,
            setItems,
            addItem,
            clearCart,
            updateQuantity,
            totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
            totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            vendorId: items[0]?.vendorId ?? null
          }}
        >
          {children}
          <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-6">
            {toasts.map((message) => (
              <div
                key={message.id}
                className={`pointer-events-auto rounded-2xl border p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-all duration-300 ${
                  message.tone === "error"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : message.tone === "info"
                      ? "border-sky-200 bg-sky-50 text-sky-900"
                      : "border-emerald-200 bg-gradient-to-r from-[#0E8A4A] to-[#20B15B] text-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${message.tone === "error" ? "bg-red-500" : message.tone === "info" ? "bg-sky-500" : "bg-white"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-tight">{message.title}</p>
                    {message.description ? <p className="mt-1 text-xs leading-relaxed opacity-90">{message.description}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeToast(message.id)}
                    className="rounded-full px-1.5 py-0.5 text-xs font-bold opacity-80 transition hover:opacity-100"
                    aria-label="Dismiss notification"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CartContext.Provider>
      </SessionContext.Provider>
    </ToastContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within Providers");
  return context;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within Providers");
  return context;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within Providers");
  return context;
}
