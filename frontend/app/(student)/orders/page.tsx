"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight } from "lucide-react";
import { StudentLayout } from "@/components/Layout";
import { useCart, useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function OrdersPage() {
  const router = useRouter();
  const { profile } = useSession();
  const { setItems } = useCart();
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    client.studentOrders(profile.userId).then(setOrders);
    const interval = setInterval(() => client.studentOrders(profile.userId).then(setOrders), 10000);
    return () => clearInterval(interval);
  }, [profile.userId]);

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
                  className="mt-3 w-full border border-primary/20 text-primary py-2 rounded-xl text-sm font-semibold"
                >
                  Order again
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
