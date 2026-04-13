import { useAuth } from "@/context/AuthContext";
import { useGetVendorStats, useGetVendorOrders, useListVendors } from "@workspace/api-client-react";
import { VendorLayout } from "@/components/Layout";
import { formatKES, getStatusColor, getStatusLabel, formatDate } from "@/lib/utils";
import { TrendingUp, Clock, CheckCircle, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function VendorDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [vendorId, setVendorId] = useState<number | null>(null);

  const { data: vendors } = useListVendors({ query: { enabled: !!user } });

  useEffect(() => {
    if (vendors && user) {
      const v = vendors.find((v) => v.userId === user.id);
      if (v) setVendorId(v.id);
    }
  }, [vendors, user]);

  const { data: stats } = useGetVendorStats(vendorId!, {
    query: { enabled: !!vendorId, refetchInterval: 15000 },
  });

  const { data: recentOrders } = useGetVendorOrders(
    vendorId!,
    {},
    { query: { enabled: !!vendorId, refetchInterval: 10000 } },
  );

  const activeOrders = recentOrders?.filter((o) => ["paid", "preparing"].includes(o.status)) ?? [];

  return (
    <VendorLayout>
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-5">Welcome back, {user?.name?.split(" ")[0]}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Today's orders", value: stats?.ordersToday ?? 0, Icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
            { label: "Today's earnings", value: formatKES(stats?.earningsToday ?? 0), Icon: TrendingUp, color: "text-primary bg-orange-50" },
            { label: "Pending", value: stats?.pendingOrders ?? 0, Icon: Clock, color: "text-yellow-600 bg-yellow-50" },
            { label: "Completed", value: stats?.completedOrders ?? 0, Icon: CheckCircle, color: "text-secondary bg-green-50" },
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

        {/* Active orders quick view */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-foreground">Active orders</h2>
            <button onClick={() => navigate("/vendor/orders")} className="text-xs text-primary font-semibold">View all</button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-6 text-center">
              <p className="text-muted-foreground text-sm">No active orders right now</p>
              <p className="text-xs text-muted-foreground mt-1">New orders will appear here automatically</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-sm text-foreground">#{order.id} — {order.studentName}</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{order.items?.map((i) => `${i.menuItemName} x${i.quantity}`).join(", ")}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-bold text-sm text-primary">{formatKES(order.totalAmount)}</span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(order.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!vendorId && (
          <div className="bg-orange-50 border border-primary/20 rounded-xl p-4 mt-4">
            <p className="text-sm font-semibold text-foreground">No vendor profile found</p>
            <p className="text-xs text-muted-foreground mt-1">Contact admin to set up your vendor account</p>
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
