"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { client } from "@/lib/api";
import { AuthResponse, CartItem, LoginPayload, RegisterPayload, SessionProfile } from "@/lib/types";

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

export function Providers({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<SessionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItemsState] = useState<CartItem[]>([]);

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
      </CartContext.Provider>
    </SessionContext.Provider>
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
