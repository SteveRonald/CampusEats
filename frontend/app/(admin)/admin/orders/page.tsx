"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    client.adminOrders().then(setOrders);
    const interval = setInterval(() => client.adminOrders().then(setOrders), 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout>
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">All Orders</h1>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <p className="font-bold text-sm text-foreground">#{order.id} - {order.vendor_name}</p>
                  <p className="text-xs text-muted-foreground">{order.student_name}</p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {order.items.map((item) => `${item.menu_item_name} x${item.quantity}`).join(", ")}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-primary">{formatKES(order.total_amount)}</span>
                <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
