"use client";

import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

function toWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("254")) return digits;
  if (digits.length === 10 && digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
  return digits;
}

function buildVendorOrderMessage(order: OrderRecord): string {
  const itemSummary = order.items.map((item) => `${item.menu_item_name} x${item.quantity}`).join(", ");
  return [
    `Hi ${order.student_name},`,
    `This is an update for your CampusEats order #${order.id}.`,
    `Status: ${getStatusLabel(order.status)}`,
    `Pickup code: ${order.pickup_code}`,
    `Items: ${itemSummary}`,
    `Total: ${formatKES(order.total_amount)}`
  ].join("\n");
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12.04 2C6.5 2 2 6.49 2 12.03c0 1.77.46 3.5 1.33 5.02L2 22l5.09-1.31a10.02 10.02 0 0 0 4.95 1.27h.01c5.54 0 10.04-4.49 10.04-10.03A10.02 10.02 0 0 0 12.04 2Zm0 18.26h-.01c-1.5 0-2.97-.4-4.25-1.15l-.3-.18-3.02.78.8-2.95-.2-.31a8.28 8.28 0 0 1-1.27-4.41c0-4.57 3.72-8.29 8.3-8.29a8.3 8.3 0 0 1 8.28 8.29c0 4.57-3.72 8.29-8.33 8.29Zm4.56-6.17c-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.56.13-.17.25-.65.82-.8.98-.14.17-.3.19-.55.06-.25-.13-1.06-.39-2.03-1.24a7.6 7.6 0 0 1-1.4-1.73c-.14-.25-.02-.39.11-.52.12-.12.25-.3.37-.45.12-.14.16-.25.25-.42.08-.17.04-.31-.02-.44-.07-.13-.56-1.35-.77-1.85-.2-.48-.41-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.02 2.61.13.17 1.79 2.73 4.33 3.83.61.26 1.08.42 1.45.54.61.19 1.17.16 1.61.1.49-.07 1.5-.61 1.72-1.2.21-.59.21-1.1.15-1.2-.06-.1-.22-.16-.46-.29Z"
      />
    </svg>
  );
}

const STATUS_ACTIONS: Record<string, { next: string; label: string; btnClass: string }> = {
  paid: { next: "preparing", label: "Start preparing", btnClass: "bg-yellow-500 text-white" },
  preparing: { next: "ready", label: "Mark ready", btnClass: "bg-secondary text-white" },
  ready: { next: "completed", label: "Mark completed", btnClass: "bg-gray-700 text-white" }
};

export default function VendorOrdersPage() {
  const { profile } = useSession();
  const vendorId = profile?.vendorId;
  const [filter, setFilter] = useState<string>("active");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    const load = async () => {
      try {
        setLoadError(null);
        setOrders(await client.vendorOrders(vendorId));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to fetch vendor orders");
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [vendorId]);

  if (!profile) {
    return null;
  }

  const filtered = orders.filter((order) => {
    if (filter === "active") return ["paid", "preparing", "ready"].includes(order.status);
    if (filter === "completed") return order.status === "completed";
    return true;
  });

  return (
    <VendorLayout>
      <div className="px-4 pt-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Auto-refreshes</span>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: "active", label: "Active" },
            { key: "completed", label: "Completed" },
            { key: "all", label: "All" }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                filter === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loadError && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}

        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((order) => {
            const action = STATUS_ACTIONS[order.status];
            return (
              <div key={order.id} className="bg-white rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-foreground">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.student_name} - {formatDate(order.created_at)}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-foreground">{item.menu_item_name}</span>
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    </div>
                  ))}
                  {order.notes && <p className="text-xs text-muted-foreground mt-1 border-t border-border pt-1">Note: {order.notes}</p>}
                </div>
                <p className="text-xs text-muted-foreground mb-2">Pickup code: <strong className="text-foreground font-mono">{order.pickup_code}</strong></p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">{formatKES(order.total_amount)}</span>
                  <div className="flex items-center gap-2">
                    {toWhatsAppPhone(order.student_phone) ? (
                      <a
                        href={`https://wa.me/${toWhatsAppPhone(order.student_phone)}?text=${encodeURIComponent(buildVendorOrderMessage(order))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Message ${order.student_name} on WhatsApp`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366] text-white"
                      >
                        <WhatsAppIcon />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Customer phone number not available"
                        aria-label="Customer phone number not available"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                      >
                        <WhatsAppIcon />
                      </button>
                    )}
                    {action && (
                      <button
                        onClick={async () => {
                          await client.updateOrderStatus(order.id, action.next);
                          if (vendorId) setOrders(await client.vendorOrders(vendorId));
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${action.btnClass}`}
                      >
                        {action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </VendorLayout>
  );
}
