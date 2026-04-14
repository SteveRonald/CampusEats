"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart, useSession } from "@/components/providers";
import { StudentLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { formatKES } from "@/lib/utils";

export default function CartPage() {
  const router = useRouter();
  const { items, clearCart, totalAmount, updateQuantity, vendorId } = useCart();
  const { profile } = useSession();
  const [notes, setNotes] = useState("");
  const [studentName, setStudentName] = useState(profile?.name ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.name) {
      setStudentName(profile.name);
    }
  }, [profile?.name]);

  const handleCheckout = async () => {
    if (!profile) {
      router.push("/auth?returnTo=/cart");
      return;
    }

    if (items.length === 0 || !vendorId) return;
    setSubmitting(true);
    try {
      const order = await client.checkout({
        vendorId,
        studentName,
        notes,
        items: items.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity }))
      });
      clearCart();
      router.push(`/orders/${order.id}`);
    } finally {
      setSubmitting(false);
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
            onClick={() => router.push("/")}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Browse food
          </button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Your cart</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {profile ? "Checkout uses simulated IntaSend and marks the order paid instantly" : "Browse freely. Sign in only when you are ready to place the order."}
        </p>

        <div className="space-y-3 mb-5">
          {items.map((item) => (
            <div key={item.menuItemId} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary">MEAL</span>
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
            onChange={(event) => setStudentName(event.target.value)}
            placeholder={profile ? "Your name" : "Enter your name before checkout"}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          {!profile && <p className="mt-1 text-xs text-muted-foreground">You can fill this now and sign in when you place the order.</p>}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <label className="block text-sm font-semibold text-foreground mb-1.5">Special notes (optional)</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
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
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={submitting}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Placing order..." : profile ? `Place order - ${formatKES(totalAmount)}` : "Sign in to place order"}
        </button>
      </div>
    </StudentLayout>
  );
}
