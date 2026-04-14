"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight } from "lucide-react";
import { StudentLayout } from "@/components/Layout";
import { useCart, useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

function toWhatsAppPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("254")) return digits;
  if (digits.length === 10 && digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
  return digits;
}

function buildOrderMessage(order: OrderRecord): string {
  const itemSummary = order.items.map((item) => `${item.menu_item_name} x${item.quantity}`).join(", ");
  return [
    `Hi ${order.vendor_name},`,
    `I placed order #${order.id} on CampusEats.`,
    `Items: ${itemSummary}`,
    `Total: ${formatKES(order.total_amount)}`,
    `Pickup code: ${order.pickup_code}`,
    `Status: ${getStatusLabel(order.status)}`,
    `Ordered: ${formatDate(order.created_at)}`
  ].join("\n");
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12.04 2C6.5 2 2 6.49 2 12.03c0 1.77.46 3.5 1.33 5.02L2 22l5.09-1.31a10.02 10.02 0 0 0 4.95 1.27h.01c5.54 0 10.04-4.49 10.04-10.03A10.02 10.02 0 0 0 12.04 2Zm0 18.26h-.01c-1.5 0-2.97-.4-4.25-1.15l-.3-.18-3.02.78.8-2.95-.2-.31a8.28 8.28 0 0 1-1.27-4.41c0-4.57 3.72-8.29 8.3-8.29a8.3 8.3 0 0 1 8.28 8.29c0 4.57-3.72 8.29-8.33 8.29Zm4.56-6.17c-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.56.13-.17.25-.65.82-.8.98-.14.17-.3.19-.55.06-.25-.13-1.06-.39-2.03-1.24a7.6 7.6 0 0 1-1.4-1.73c-.14-.25-.02-.39.11-.52.12-.12.25-.3.37-.45.12-.14.16-.25.25-.42.08-.17.04-.31-.02-.44-.07-.13-.56-1.35-.77-1.85-.2-.48-.41-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.02 2.61.13.17 1.79 2.73 4.33 3.83.61.26 1.08.42 1.45.54.61.19 1.17.16 1.61.1.49-.07 1.5-.61 1.72-1.2.21-.59.21-1.1.15-1.2-.06-.1-.22-.16-.46-.29Z"
      />
    </svg>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { profile } = useSession();
  const { setItems } = useCart();
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    if (!profile) return;
    if (profile.role === "vendor") {
      router.replace("/vendor/orders");
      return;
    }

    client.studentOrders().then(setOrders);
    const interval = setInterval(() => client.studentOrders().then(setOrders), 10000);
    return () => clearInterval(interval);
  }, [profile, router]);

  if (!profile) {
    return (
      <StudentLayout>
        <div className="px-4 pt-10">
          <div className="rounded-3xl border border-border bg-white p-6 text-center">
            <div className="text-4xl mb-3">ORD</div>
            <h1 className="text-xl font-bold text-foreground mb-2">Sign in to view your orders</h1>
            <p className="text-sm text-muted-foreground mb-5">Your order history appears after you place an order and sign in.</p>
            <Link href="/auth?returnTo=/orders" className="inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white">
              Sign in
            </Link>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Your orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">ORD</div>
            <h3 className="font-bold text-foreground mb-1">No orders yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Your order history will appear here</p>
            <button
              onClick={() => router.push("/")}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold"
            >
              Order food
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-border p-4">
                <button onClick={() => router.push(`/orders/${order.id}`)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{order.vendor_name}</p>
                      <p className="text-xs text-muted-foreground">{order.items.map((item) => item.menu_item_name).join(", ")}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">{formatKES(order.total_amount)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(order.created_at)}
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() =>
                      setItems(
                        order.items.map((item) => ({
                          menuItemId: item.menu_item_id,
                          vendorId: order.vendor_id,
                          vendorName: order.vendor_name,
                          name: item.menu_item_name,
                          price: Number(item.unit_price),
                          quantity: item.quantity,
                          imageUrl: null
                        }))
                      )
                    }
                    className="flex-1 border border-primary/20 text-primary py-2 rounded-xl text-sm font-semibold"
                  >
                    Order again
                  </button>
                  {toWhatsAppPhone(order.vendor_phone) ? (
                    <a
                      href={`https://wa.me/${toWhatsAppPhone(order.vendor_phone)}?text=${encodeURIComponent(buildOrderMessage(order))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Text ${order.vendor_name} on WhatsApp about order ${order.id}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white transition hover:brightness-95"
                    >
                      <WhatsAppIcon />
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Vendor phone number not available"
                      aria-label="Vendor phone number not available"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                    >
                      <WhatsAppIcon />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
