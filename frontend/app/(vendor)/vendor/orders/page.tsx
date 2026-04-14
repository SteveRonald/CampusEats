"use client";

import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

const STATUS_ACTIONS: Record<string, { next: string; label: string; btnClass: string }> = {
  paid: { next: "preparing", label: "Start preparing", btnClass: "bg-yellow-500 text-white" },
  preparing: { next: "ready", label: "Mark ready", btnClass: "bg-secondary text-white" },
  ready: { next: "completed", label: "Mark completed", btnClass: "bg-gray-700 text-white" }
};

export default function VendorOrdersPage() {
  const { profile } = useSession();
  const [filter, setFilter] = useState<string>("active");
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    if (!profile.vendorId) return;
    const load = () => client.vendorOrders(profile.vendorId!).then(setOrders);
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [profile.vendorId]);

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
                  {action && (
                    <button
                      onClick={async () => {
                        await client.updateOrderStatus(order.id, action.next);
                        if (profile.vendorId) setOrders(await client.vendorOrders(profile.vendorId));
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${action.btnClass}`}
                    >
                      {action.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </VendorLayout>
  );
}
