import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGetVendorOrders, useUpdateOrderStatus, useListVendors } from "@workspace/api-client-react";
import { VendorLayout } from "@/components/Layout";
import { formatKES, getStatusColor, getStatusLabel, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getGetVendorOrdersQueryKey } from "@workspace/api-client-react";

const STATUS_ACTIONS: Record<string, { next: string; label: string; btnClass: string }> = {
  paid: { next: "preparing", label: "Start preparing", btnClass: "bg-yellow-500 text-white" },
  preparing: { next: "ready", label: "Mark ready", btnClass: "bg-secondary text-white" },
  ready: { next: "completed", label: "Mark completed", btnClass: "bg-gray-700 text-white" },
};

export default function VendorOrders() {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("active");
  const qc = useQueryClient();

  const { data: vendors } = useListVendors({ query: { enabled: !!user } });
  useEffect(() => {
    if (vendors && user) {
      const v = vendors.find((v) => v.userId === user.id);
      if (v) setVendorId(v.id);
    }
  }, [vendors, user]);

  const statusParam = filter === "active" ? undefined : filter === "completed" ? "completed" : undefined;

  const { data: orders, isLoading } = useGetVendorOrders(
    vendorId!,
    statusParam ? { status: statusParam as "completed" } : {},
    { query: { enabled: !!vendorId, refetchInterval: 5000 } },
  );

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetVendorOrdersQueryKey(vendorId!) });
      },
    },
  });

  const filtered = orders?.filter((o) => {
    if (filter === "active") return ["paid", "preparing", "ready"].includes(o.status);
    if (filter === "completed") return o.status === "completed";
    return true;
  }) ?? [];

  return (
    <VendorLayout>
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Auto-refreshes</span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: "active", label: "Active" },
            { key: "completed", label: "Completed" },
            { key: "all", label: "All" },
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

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-semibold text-foreground">No {filter} orders</p>
            <p className="text-sm text-muted-foreground mt-1">Orders will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const action = STATUS_ACTIONS[order.status];
              return (
                <div key={order.id} className="bg-white rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-foreground">Order #{order.id}</p>
                      <p className="text-xs text-muted-foreground">{order.studentName} · {formatDate(order.createdAt)}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5 mb-3">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs py-0.5">
                        <span className="text-foreground">{item.menuItemName}</span>
                        <span className="text-muted-foreground">x{item.quantity}</span>
                      </div>
                    ))}
                    {order.notes && <p className="text-xs text-muted-foreground mt-1 border-t border-border pt-1">Note: {order.notes}</p>}
                  </div>
                  {order.pickupCode && (
                    <p className="text-xs text-muted-foreground mb-2">Pickup code: <strong className="text-foreground font-mono">{order.pickupCode}</strong></p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{formatKES(order.totalAmount)}</span>
                    {action && (
                      <button
                        onClick={() => updateStatus.mutate({ id: order.id, data: { status: action.next as "preparing" | "ready" | "completed" } })}
                        disabled={updateStatus.isPending}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${action.btnClass}`}
                      >
                        {action.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
