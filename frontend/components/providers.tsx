"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { CartItem, SessionProfile } from "@/lib/types";

const PROFILES: SessionProfile[] = [
  { role: "student", userId: 1, name: "Campus Student", email: "student@moi.ac.ke" },
  { role: "vendor", userId: 2, vendorId: 1, name: "Mama Njeri", email: "mama@moi.ac.ke" },
  { role: "admin", userId: 3, name: "Campus Admin", email: "admin@campuseats.co.ke" }
];

const SessionContext = createContext<{
  profile: SessionProfile;
  setProfile: (profile: SessionProfile) => void;
  profiles: SessionProfile[];
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
  const [profile, setProfileState] = useState<SessionProfile>(PROFILES[0]);
  const [items, setItemsState] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedProfile = window.localStorage.getItem("campuseats_profile");
    const storedCart = window.localStorage.getItem("campuseats_cart");
    if (storedProfile) setProfileState(JSON.parse(storedProfile));
    if (storedCart) setItemsState(JSON.parse(storedCart));
  }, []);

  const setProfile = (nextProfile: SessionProfile) => {
    setProfileState(nextProfile);
    window.localStorage.setItem("campuseats_profile", JSON.stringify(nextProfile));
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

  const updateQuantity = (menuItemId: number, quantity: number) => {
    const nextItems = items
      .map((item) => (item.menuItemId === menuItemId ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    setItems(nextItems);
  };

  return (
    <SessionContext.Provider value={{ profile, setProfile, profiles: PROFILES }}>
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
