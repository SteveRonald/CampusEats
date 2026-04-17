"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatOrderDateTime, getStatusLabel, parseApiDate } from "@/lib/utils";

const ACTIVE_STATUSES = ["paid", "preparing", "ready"] as const;

function getCustomerType(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("campus")) return "Campus Student";
  return "Student";
}

function getMinutesSince(dateString: string) {
  const diffMs = Date.now() - parseApiDate(dateString).getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));

  return diffMins;
}

function getWaitingLabel(minutes: number) {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min waiting`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m waiting` : `${hours}h waiting`;
}

function getUrgencyMeta(minutes: number) {
  if (minutes >= 7) {
    return { tone: "text-red-700", dot: "bg-red-600" };
  }
  if (minutes >= 3) {
    return { tone: "text-orange-700", dot: "bg-orange-500" };
  }
  return { tone: "text-slate-700", dot: "bg-slate-400" };
}

export default function VendorDashboardPage() {
  const { profile } = useSession();
  const vendorId = profile?.vendorId;
  const [stats, setStats] = useState({ ordersToday: 0, earningsToday: 0, pendingOrders: 0, completedOrders: 0, totalPayout: 0 });
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<number[]>([]);
  const initializedOrderIdsRef = useRef(false);
  const knownOrderIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!vendorId) return;

    const load = async () => {
      try {
        setLoadError(null);
        const [nextStats, nextOrders] = await Promise.all([client.vendorOverview(vendorId), client.vendorOrders(vendorId)]);
        setStats(nextStats);
        setOrders(nextOrders);

        if (!initializedOrderIdsRef.current) {
          knownOrderIdsRef.current = new Set(nextOrders.map((order) => order.id));
          initializedOrderIdsRef.current = true;
          return;
        }

        const knownIds = knownOrderIdsRef.current;
        const incoming = nextOrders.filter((order) => !knownIds.has(order.id) && ACTIVE_STATUSES.includes(order.status as (typeof ACTIVE_STATUSES)[number]));
        knownOrderIdsRef.current = new Set(nextOrders.map((order) => order.id));

        if (incoming.length) {
          const incomingIds = incoming.map((order) => order.id);
          setNewOrderIds((current) => Array.from(new Set([...current, ...incomingIds])));
          incomingIds.forEach((id) => {
            setTimeout(() => {
              setNewOrderIds((current) => current.filter((orderId) => orderId !== id));
            }, 70000);
          });
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to fetch vendor dashboard");
      }
    };

    load();
    const interval = setInterval(() => {
      load();
    }, 10000);
    return () => clearInterval(interval);
  }, [vendorId]);

  if (!profile) {
    return null;
  }

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status as (typeof ACTIVE_STATUSES)[number]));
  const completedOrders = orders.filter((order) => order.status === "completed");
  const queuedOrders = orders.filter((order) => order.status === "paid").length;
  const preparingOrders = orders.filter((order) => order.status === "preparing").length;
  const readyOrders = orders.filter((order) => order.status === "ready").length;

  const pendingPreparation = orders.filter((order) => ["paid", "preparing"].includes(order.status)).length;

  const recentActivity = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const updateOrderStatus = async (orderId: number, nextStatus: string) => {
    const previous = orders;
    setUpdatingOrderId(orderId);
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status: nextStatus as OrderRecord["status"] } : order)));

    try {
      await client.updateOrderStatus(orderId, nextStatus);
    } catch (error) {
      setOrders(previous);
      setLoadError(error instanceof Error ? error.message : "Failed to update order status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <VendorLayout>
      <div className="bg-[#F8FAFC] px-4 pb-5 pt-4 md:px-6 lg:px-8" style={{ fontFamily: "Inter, 'Source Sans 3', system-ui, sans-serif" }}>
        <section className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Active Orders</p>
            <p className="mt-1 text-2xl font-black text-[#1F2937]">{activeOrders.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Pending Preparation</p>
            <p className="mt-1 text-2xl font-black text-[#1F2937]">{pendingPreparation}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Completed Today</p>
            <p className="mt-1 text-2xl font-black text-[#1F2937]">{stats.completedOrders}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Revenue Today</p>
            <p className="mt-1 text-2xl font-black text-[#1F2937]">{formatKES(stats.earningsToday)}</p>
          </div>
        </section>

        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-[#1F2937] md:text-xl">Active Orders</h1>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Queue</p>
              <p className="text-base font-bold text-[#1F2937]">{queuedOrders}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Preparing</p>
              <p className="text-base font-bold text-blue-700">{preparingOrders}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Ready</p>
              <p className="text-base font-bold text-green-700">{readyOrders}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Live Total</p>
              <p className="text-base font-bold text-[#1F2937]">{activeOrders.length}</p>
            </div>
          </div>

          {loadError && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}

          <div>
            {activeOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[#1F2937]">No active orders</p>
                <p className="mt-1 text-xs text-slate-500">Incoming orders will appear here immediately.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-slate-200 bg-white [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
                <div className="min-w-[760px] md:min-w-[860px] lg:min-w-[900px]">
                  <div className="grid grid-cols-[104px_150px_minmax(240px,1fr)_132px_100px_150px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                    <span>Order</span>
                    <span>Customer</span>
                    <span>Items</span>
                    <span>Price</span>
                    <span>Status</span>
                    <span className="text-right">Action</span>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {activeOrders.map((order) => {
                      const isUpdating = updatingOrderId === order.id;
                      const isNewOrder = newOrderIds.includes(order.id);
                      const customerType = getCustomerType(order.student_name);
                      const minutesSince = getMinutesSince(order.created_at);
                      const urgency = getUrgencyMeta(minutesSince);

                      return (
                        <article key={order.id} className={isNewOrder ? "bg-orange-50/40" : "bg-white"}>
                          <div className="grid grid-cols-[104px_150px_minmax(240px,1fr)_132px_100px_150px] items-center gap-2 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Order #{order.id}</p>
                              <p className="text-[11px] text-slate-500">{formatOrderDateTime(order.created_at)}</p>
                              <p className={`text-xs font-bold ${urgency.tone}`}>{getWaitingLabel(minutesSince)}</p>
                              {isNewOrder ? (
                                <span className="mt-1 inline-flex rounded-sm border border-[#FF6B00]/40 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B00]">
                                  New
                                </span>
                              ) : null}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#1F2937]">{customerType}</p>
                            </div>

                            <div className="min-w-0 space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  {item.menu_item_image_url ? (
                                    <img
                                      src={item.menu_item_image_url}
                                      alt={item.menu_item_name}
                                      onError={(event) => {
                                        event.currentTarget.src = "/favicon.png";
                                      }}
                                      className="h-8 w-8 rounded-md border border-slate-200 object-cover"
                                    />
                                  ) : (
                                    <div className="h-8 w-8 rounded-md border border-slate-200 bg-slate-100" aria-hidden="true" />
                                  )}
                                  <span className="block min-w-0 truncate text-sm text-[#1F2937]">{item.menu_item_name} x{item.quantity}</span>
                                </div>
                              ))}
                            </div>

                            <div className="min-w-0">
                              <p className="whitespace-nowrap text-sm font-black text-[#FF6B00]">
                                {formatKES(order.total_amount)} <span className="font-semibold text-slate-600">• Paid</span>
                              </p>
                            </div>

                            <div className="min-w-0">
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                {getStatusLabel(order.status)}
                              </span>
                            </div>

                            <div className="min-w-0 justify-self-end">
                              {order.status === "paid" ? (
                                <div className="space-y-1.5">
                                  <button
                                    type="button"
                                    disabled
                                    className="min-w-[104px] rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-700"
                                  >
                                    Current: Paid
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => updateOrderStatus(order.id, "preparing")}
                                    className="min-w-[104px] rounded-md bg-[#FF6B00] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {isUpdating ? "Updating..." : "Next: Accept"}
                                  </button>
                                </div>
                              ) : null}

                              {order.status === "preparing" ? (
                                <div className="space-y-1.5">
                                  <button
                                    type="button"
                                    disabled
                                    className="min-w-[104px] rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-blue-700"
                                  >
                                    Current: Preparing
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => updateOrderStatus(order.id, "ready")}
                                    className="min-w-[104px] rounded-md bg-[#FF6B00] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {isUpdating ? "Updating..." : "Next: Mark ready"}
                                  </button>
                                </div>
                              ) : null}

                              {order.status === "ready" ? (
                                <div className="space-y-1.5">
                                  <button
                                    type="button"
                                    disabled
                                    className="min-w-[104px] rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-green-700"
                                  >
                                    Current: Ready
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => updateOrderStatus(order.id, "completed")}
                                    className="min-w-[104px] rounded-md bg-[#FF6B00] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {isUpdating ? "Updating..." : "Next: Complete"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <aside className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1F2937]">Recent Activity</h2>
                <span className="text-[11px] text-slate-500">Live</span>
              </div>

              {recentActivity.length === 0 ? (
                <p className="text-xs text-slate-500">No activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentActivity.map((order) => (
                    <li key={`activity-${order.id}`} className="rounded-md border border-slate-200 px-2.5 py-2">
                      <p className="text-xs font-semibold text-[#1F2937]">Order #{order.id} - {getCustomerType(order.student_name)}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Status: {getStatusLabel(order.status)} • {getWaitingLabel(getMinutesSince(order.created_at))}</p>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setShowCompleted((current) => !current)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-bold text-[#1F2937]">Completed Orders ({completedOrders.length})</span>
            {showCompleted ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
          </button>

          {showCompleted ? (
            completedOrders.length === 0 ? (
              <div className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500">No completed orders yet.</div>
            ) : (
              <div className="overflow-x-auto border-t border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Order</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Total</th>
                      <th className="px-4 py-3 font-semibold">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrders.slice(0, 12).map((order) => (
                      <tr key={order.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-[#1F2937]">#{order.id}</td>
                        <td className="px-4 py-3 text-[#1F2937]">{getCustomerType(order.student_name)}</td>
                        <td className="px-4 py-3 font-bold text-[#FF6B00]">{formatKES(order.total_amount)}</td>
                        <td className="px-4 py-3 text-slate-500">{formatOrderDateTime(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </section>
      </div>
    </VendorLayout>
  );
}
