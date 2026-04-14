"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await client.adminOrders();
        setOrders(data);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to fetch orders");
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const visibleOrders = orders.filter((order) => {
    if (filter === "active") return ["paid", "preparing", "ready"].includes(order.status);
    if (filter === "completed") return order.status === "completed";
    return true;
  });

  return (
    <AdminLayout>
      <div className="pt-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-[#1F2937] md:text-2xl">All Orders</h1>
            <p className="text-sm text-slate-500">Monitor order volume, payment statuses, and fulfillment progress.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">{visibleOrders.length} shown</span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "completed", label: "Completed" }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key as "all" | "active" | "completed")}
              className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                filter === option.key ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-primary" />
            <p className="text-sm font-semibold text-[#1F2937]">Loading orders...</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
            <p className="text-sm font-semibold text-[#1F2937]">No orders found for this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[90px_190px_170px_minmax(250px,1fr)_120px_120px_170px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <span>Order</span>
                <span>Vendor</span>
                <span>Student</span>
                <span>Items</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Created</span>
              </div>

              <div className="divide-y divide-slate-200">
                {visibleOrders.map((order) => (
                  <article key={order.id} className="grid grid-cols-[90px_190px_170px_minmax(250px,1fr)_120px_120px_170px] items-center gap-3 px-4 py-3">
                    <p className="text-sm font-black text-[#1F2937]">#{order.id}</p>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1F2937]">{order.vendor_name}</p>
                      <p className="truncate text-xs text-slate-500">{order.vendor_location || "No location"}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1F2937]">{order.student_name}</p>
                      <p className="truncate text-xs text-slate-500">Pickup code: <span className="font-mono text-[#1F2937]">{order.pickup_code}</span></p>
                    </div>

                    <p className="truncate text-sm text-slate-600">{order.items.map((item) => `${item.menu_item_name} x${item.quantity}`).join(", ")}</p>

                    <p className="text-sm font-bold text-primary">{formatKES(order.total_amount)}</p>

                    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>

                    <p className="text-xs text-slate-500">{formatDate(order.created_at)}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
