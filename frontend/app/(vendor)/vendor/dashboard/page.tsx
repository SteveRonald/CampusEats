"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Clock, CheckCircle, ShoppingBag } from "lucide-react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function VendorDashboardPage() {
  const { profile } = useSession();
  const [stats, setStats] = useState({ ordersToday: 0, earningsToday: 0, pendingOrders: 0, completedOrders: 0, totalPayout: 0 });
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    if (!profile.vendorId) return;
    client.vendorOverview(profile.vendorId).then(setStats);
    client.vendorOrders(profile.vendorId).then(setOrders);
    const interval = setInterval(() => {
      client.vendorOverview(profile.vendorId!).then(setStats);
      client.vendorOrders(profile.vendorId!).then(setOrders);
    }, 10000);
    return () => clearInterval(interval);
  }, [profile.vendorId]);

  if (!profile) {
    return null;
  }

  const activeOrders = orders.filter((order) => ["paid", "preparing", "ready"].includes(order.status));

  return (
    <VendorLayout>
      <div className="px-4 pt-4 md:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">Welcome back, {profile.name.split(" ")[0]}</p>

        <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
          {[
            { label: "Today's orders", value: stats.ordersToday, Icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
            { label: "Today's earnings", value: formatKES(stats.earningsToday), Icon: TrendingUp, color: "text-primary bg-orange-50" },
            { label: "Pending", value: stats.pendingOrders, Icon: Clock, color: "text-yellow-600 bg-yellow-50" },
            { label: "Completed", value: stats.completedOrders, Icon: CheckCircle, color: "text-secondary bg-green-50" }
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-foreground">Active orders</h2>
            <span className="text-xs text-muted-foreground">Auto-refreshing</span>
          </div>
          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-6 text-center">
              <p className="text-muted-foreground text-sm">No active orders right now</p>
              <p className="text-xs text-muted-foreground mt-1">New orders will appear here automatically</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {activeOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-sm text-foreground">#{order.id} - {order.student_name}</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{order.items.map((item) => `${item.menu_item_name} x${item.quantity}`).join(", ")}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-bold text-sm text-primary">{formatKES(order.total_amount)}</span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(order.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}
