import { useRoute, useLocation } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { StudentLayout } from "@/components/Layout";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { ArrowLeft, Clock, CheckCircle, Package, ChefHat } from "lucide-react";

const STATUS_STEPS = ["paid", "preparing", "ready", "completed"] as const;

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const [, navigate] = useLocation();
  const orderId = Number(params?.id);

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId, refetchInterval: 5000 },
  });

  const currentStep = order ? STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number]) : -1;

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="px-4 pt-4">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="bg-white rounded-xl border border-border p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!order) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="font-bold text-foreground mb-2">Order not found</h2>
          <button onClick={() => navigate("/orders")} className="text-primary font-semibold text-sm">Back to orders</button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="px-4 pt-4">
        <button onClick={() => navigate("/orders")} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to orders
        </button>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Order #{order.id}</h1>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>

        {/* Pickup code */}
        {order.pickupCode && (
          <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4 mb-4 text-center">
            <p className="text-xs text-primary font-semibold mb-1 uppercase tracking-wider">Pickup Code</p>
            <p className="text-4xl font-black text-primary tracking-widest">{order.pickupCode}</p>
            <p className="text-xs text-muted-foreground mt-1">Show this to the vendor</p>
          </div>
        )}

        {/* Status progress */}
        {order.status !== "cancelled" && (
          <div className="bg-white rounded-xl border border-border p-4 mb-4">
            <h3 className="font-semibold text-sm text-foreground mb-3">Order progress</h3>
            <div className="relative">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted" />
              <div
                className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-500"
                style={{ width: `${currentStep >= 0 ? (currentStep / (STATUS_STEPS.length - 1)) * 100 : 0}%` }}
              />
              <div className="flex justify-between relative z-10">
                {[
                  { step: "paid", label: "Paid", Icon: CheckCircle },
                  { step: "preparing", label: "Preparing", Icon: ChefHat },
                  { step: "ready", label: "Ready", Icon: Package },
                  { step: "completed", label: "Done", Icon: CheckCircle },
                ].map(({ step, label, Icon }, idx) => {
                  const done = currentStep >= idx;
                  return (
                    <div key={step} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-semibold ${done ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Vendor info */}
        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <h3 className="font-semibold text-sm text-foreground mb-2">From</h3>
          <p className="font-bold text-foreground">{order.vendor?.stallName}</p>
          {order.vendor?.location && <p className="text-sm text-muted-foreground">{order.vendor.location}</p>}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Est. {order.vendor?.pickupTimeMin ?? 10}–{order.vendor?.pickupTimeMax ?? 15} min</span>
          </div>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <h3 className="font-semibold text-sm text-foreground mb-3">Items</h3>
          <div className="space-y-2">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-foreground">{item.menuItemName} <span className="text-muted-foreground">x{item.quantity}</span></span>
                <span className="font-semibold text-foreground">{formatKES(Number(item.unitPrice) * item.quantity)}</span>
              </div>
            ))}
            {order.notes && (
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-xs text-muted-foreground">Note: {order.notes}</p>
              </div>
            )}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatKES(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mb-6">
          Ordered {formatDate(order.createdAt)}
        </p>
      </div>
    </StudentLayout>
  );
}
