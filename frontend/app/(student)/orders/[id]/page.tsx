"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, Package, ChefHat } from "lucide-react";
import { StudentLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatOrderDateTime, getStatusColor, getStatusLabel } from "@/lib/utils";

const STATUS_STEPS = ["paid", "preparing", "ready", "completed"] as const;

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const orderId = params.id;
    setOrder(null);
    setError(null);
    setLoading(true);

    const load = async () => {
      try {
        const nextOrder = await client.order(orderId);
        if (!active) return;
        setOrder(nextOrder);
        setError(null);
      } catch (loadError) {
        if (!active) return;
        setOrder(null);
        setError(loadError instanceof Error ? loadError.message : "Failed to load order");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [params.id]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[60vh] items-center justify-center px-4 pt-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-primary" />
            <p className="text-sm font-semibold text-[#1F2937]">Loading order details...</p>
            <p className="mt-1 text-xs text-slate-500">Please wait while we fetch the latest status.</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    const isAccessIssue = error.toLowerCase().includes("forbidden") || error.toLowerCase().includes("not found");

    return (
      <StudentLayout>
        <div className="flex min-h-[60vh] items-center justify-center px-4 pt-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-[#1F2937]">{isAccessIssue ? "Order unavailable" : "Could not load order"}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {isAccessIssue
                ? "This order does not belong to your account or no longer exists."
                : error}
            </p>
            <button onClick={() => router.push("/orders")} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
              Back to orders
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!order) {
    return null;
  }

  const currentStep = STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number]);

  return (
    <StudentLayout>
      <div className="px-4 pt-4">
        <button onClick={() => router.push("/orders")} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to orders
        </button>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Order #{order.id}</h1>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>

        <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4 mb-4 text-center">
          <p className="text-xs text-primary font-semibold mb-1 uppercase tracking-wider">Pickup Code</p>
          <p className="text-4xl font-black text-primary tracking-widest">{order.pickup_code}</p>
          <p className="text-xs text-muted-foreground mt-1">Show this to the vendor</p>
        </div>

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
                { step: "completed", label: "Done", Icon: CheckCircle }
              ].map(({ step, label, Icon }, index) => {
                const done = currentStep >= index;
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

        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <h3 className="font-semibold text-sm text-foreground mb-2">From</h3>
          <p className="font-bold text-foreground">{order.vendor_name}</p>
          {order.vendor_location && <p className="text-sm text-muted-foreground">{order.vendor_location}</p>}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Est. {order.pickup_time_min}-{order.pickup_time_max} min</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <h3 className="font-semibold text-sm text-foreground mb-2">Fulfillment</h3>
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              Type: <span className="font-semibold">{order.order_type === "delivery" ? "Delivery" : "Dine-in"}</span>
            </p>
            {order.pickup_location ? (
              <p className="text-foreground">
                Location: <span className="font-semibold">{order.pickup_location}</span>
              </p>
            ) : null}
            {order.delivery_details?.mode === "hostel" ? (
              <p className="text-muted-foreground">
                Hostel: {order.delivery_details.hostelName ?? order.hostel_name ?? "-"} • Room {order.delivery_details.roomNumber ?? order.room_number ?? "-"}
              </p>
            ) : null}
            {order.delivery_details?.mode === "off_campus" ? (
              <p className="text-muted-foreground">
                Area: {order.delivery_details.serviceAreaName ?? order.service_area_name ?? "-"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <h3 className="font-semibold text-sm text-foreground mb-3">Items</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-foreground">{item.menu_item_name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                <span className="font-semibold text-foreground">{formatKES(Number(item.unit_price) * item.quantity)}</span>
              </div>
            ))}
            {order.notes && (
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-xs text-muted-foreground">Note: {order.notes}</p>
              </div>
            )}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatKES(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mb-6">
          Ordered {formatOrderDateTime(order.created_at)}
        </p>
      </div>
    </StudentLayout>
  );
}
