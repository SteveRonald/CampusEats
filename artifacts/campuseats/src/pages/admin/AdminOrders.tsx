import { useState } from "react";
import { useAdminListOrders } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/Layout";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

const STATUS_OPTIONS = ["all", "paid", "preparing", "ready", "completed", "cancelled"];

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders, isLoading } = useAdminListOrders(
    { status: statusFilter === "all" ? undefined : statusFilter, limit: 50 },
    { query: { refetchInterval: 10000 } },
  );

  return (
    <AdminLayout>
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">All Orders</h1>

        <div className="overflow-x-auto flex gap-2 pb-2 mb-4 scrollbar-none -mx-4 px-4">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                statusFilter === s ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-bold text-foreground">No orders found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p className="font-bold text-sm text-foreground">#{order.id} — {order.vendor?.stallName}</p>
                    <p className="text-xs text-muted-foreground">{order.studentName}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  {order.items?.map((i) => `${i.menuItemName} x${i.quantity}`).join(", ")}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-primary">{formatKES(order.totalAmount)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
