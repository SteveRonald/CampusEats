import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useListOrders } from "@workspace/api-client-react";
import { StudentLayout } from "@/components/Layout";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { Clock, ChevronRight } from "lucide-react";

export default function Orders() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: orders, isLoading } = useListOrders(
    { student_id: user?.id },
    { query: { enabled: true, refetchInterval: 10000 } },
  );

  if (!user) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Sign in to view orders</h2>
          <p className="text-sm text-muted-foreground mb-6">Track your order status and history</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold"
          >
            Sign in
          </button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="px-4 md:px-8 pt-6 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Your orders</h1>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🧾</div>
            <h3 className="font-bold text-foreground mb-1">No orders yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Your order history will appear here</p>
            <button
              onClick={() => navigate("/")}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold"
            >
              Order food
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="w-full bg-white rounded-xl border border-border p-4 text-left hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{order.vendor?.stallName ?? "Vendor"}</p>
                    <p className="text-xs text-muted-foreground">{order.items?.map((i) => i.menuItemName).join(", ")}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">{formatKES(order.totalAmount)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(order.createdAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
