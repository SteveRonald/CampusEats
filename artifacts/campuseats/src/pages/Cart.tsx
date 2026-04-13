import { useLocation } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useCreateOrder } from "@workspace/api-client-react";
import { StudentLayout } from "@/components/Layout";
import { formatKES } from "@/lib/utils";
import { useState } from "react";

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, totalAmount, vendorId } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [notes, setNotes] = useState("");
  const [studentName, setStudentName] = useState(user?.name || "");
  const createOrder = useCreateOrder();

  const handleCheckout = async () => {
    if (items.length === 0) return;
    const currentVendorId = vendorId ?? items[0]?.vendorId;
    if (!currentVendorId) return;

    try {
      const result = await createOrder.mutateAsync({
        data: {
          studentId: user?.id,
          vendorId: currentVendorId,
          studentName: studentName || user?.name || "Student",
          notes,
          items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        },
      });
      clearCart();
      navigate(`/orders/${result.id}`);
    } catch (err) {
      alert("Failed to place order. Please try again.");
    }
  };

  if (items.length === 0) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-primary/40" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground text-sm mb-6">Add food from the marketplace to get started</p>
          <button
            onClick={() => navigate("/")}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Browse food
          </button>
        </div>
      </StudentLayout>
    );
  }

  const vendorName = items[0]?.vendorName;
  const PLATFORM_FEE = totalAmount * 0.1;

  return (
    <StudentLayout>
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Your cart</h1>
        <p className="text-sm text-muted-foreground mb-4">From {vendorName}</p>

        <div className="space-y-3 mb-5">
          {items.map((item) => (
            <div key={item.menuItemId} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🍽️</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{formatKES(item.price)} each</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                </button>
                <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <label className="block text-sm font-semibold text-foreground mb-1.5">Your name (for pickup)</label>
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Enter your name"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <label className="block text-sm font-semibold text-foreground mb-1.5">Special notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests..."
            className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={2}
          />
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-6">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
                <span className="text-foreground">{formatKES(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatKES(totalAmount)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Platform fee ({formatKES(PLATFORM_FEE)}) included</p>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={createOrder.isPending}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createOrder.isPending ? "Placing order..." : `Place order · ${formatKES(totalAmount)}`}
        </button>
        <p className="text-center text-xs text-muted-foreground mt-2 mb-6">Payment via M-Pesa · Order set to paid instantly</p>
      </div>
    </StudentLayout>
  );
}
