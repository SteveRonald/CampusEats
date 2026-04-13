import { createContext, useContext, useState, type ReactNode } from "react";

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  vendorId: number;
  vendorName: string;
  imageUrl?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  vendorId: number | null;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const vendorId = items.length > 0 ? items[0].vendorId : null;

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map((i) => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (prev.length > 0 && prev[0].vendorId !== item.vendorId) {
        if (!confirm("Adding items from a different vendor will clear your current cart. Continue?")) {
          return prev;
        }
        return [{ ...item, quantity: 1 }];
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (menuItemId: number) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems((prev) => prev.map((i) => i.menuItemId === menuItemId ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalAmount, vendorId }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
