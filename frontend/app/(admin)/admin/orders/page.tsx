"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { AdminLayout } from "@/components/Layout";
import { useToast } from "@/components/providers";
import { client } from "@/lib/api";
import { OrderRecord } from "@/lib/types";
import { formatKES, formatOrderDateTime, getStatusColor, getStatusLabel } from "@/lib/utils";

function toWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("254")) return digits;
  if (digits.length === 10 && digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
  return digits;
}

function buildAdminOrderMessage(order: OrderRecord): string {
  const itemSummary = order.items.map((item) => `${item.menu_item_name} x${item.quantity}`).join(", ");
  return [
    `Hi ${order.student_name},`,
    `This is a CampusEats update for your order #${order.id}.`,
    `Status: ${getStatusLabel(order.status)}`,
    `Pickup code: ${order.pickup_code}`,
    `Items: ${itemSummary}`,
    `Total: ${formatKES(order.total_amount)}`
  ].join("\n");
}

const STATUS_ACTIONS: Record<string, { next: string; label: string; btnClass: string }> = {
  paid: { next: "preparing", label: "Start preparing", btnClass: "bg-yellow-500 text-white" },
  preparing: { next: "ready", label: "Mark ready", btnClass: "bg-secondary text-white" },
  ready: { next: "completed", label: "Mark completed", btnClass: "bg-gray-700 text-white" }
};

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string | null | undefined, query: string): ReactNode {
  const value = text ?? "";
  const trimmed = query.trim();
  if (!value || !trimmed) return value;

  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, "ig");
  const parts = value.split(pattern);

  return parts.map((part, index) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-100 px-0.5 text-[#1F2937]">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [search, setSearch] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await client.adminOrders();
        setOrders(data);
        setError(null);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to fetch orders";
        setError(message);
        toast({ title: "Could not load orders", description: message, tone: "error" });
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleOrders = orders.filter((order) => {
    if (filter === "active") return ["paid", "preparing", "ready"].includes(order.status);
    if (filter === "completed") return order.status === "completed";
    return true;
  }).filter((order) => {
    if (!normalizedSearch) return true;

    const searchableParts = [
      String(order.id),
      order.public_id ?? "",
      order.vendor_name,
      order.student_name,
      order.status,
      getStatusLabel(order.status),
      order.pickup_code,
      order.vendor_location ?? "",
      order.hostel_name ?? "",
      order.service_area_name ?? "",
      ...(order.items?.map((item) => item.menu_item_name) ?? [])
    ];

    const haystack = searchableParts.join(" ").toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  const updateOrderStatus = async (orderId: number, nextStatus: string) => {
    const previous = orders;
    setUpdatingOrderId(orderId);
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status: nextStatus as OrderRecord["status"] } : order)));

    try {
      await client.updateOrderStatus(orderId, nextStatus);
      toast({ title: "Order updated", description: `Order #${orderId} is now ${getStatusLabel(nextStatus)}`, tone: "success" });
    } catch (updateError) {
      setOrders(previous);
      const message = updateError instanceof Error ? updateError.message : "Failed to update order status";
      setError(message);
      toast({ title: "Update failed", description: message, tone: "error" });
    } finally {
      setUpdatingOrderId(null);
    }
  };

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

        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order #, vendor, student, status, pickup code, item"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-primary" />
            <p className="text-sm font-semibold text-[#1F2937]">Loading order activity...</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
            <p className="text-sm font-semibold text-[#1F2937]">No orders found for this filter</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 xl:hidden">
              {visibleOrders.map((order) => (
                <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#1F2937]">#{highlightMatch(String(order.id), normalizedSearch)}</p>
                      <p className="text-xs text-slate-500">{highlightMatch(order.vendor_name, normalizedSearch)}</p>
                      <p className="text-[11px] text-slate-500">{order.vendor_location || "No location"}</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{formatKES(order.total_amount)}</p>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm">
                    <div>
                      <p className="font-semibold text-[#1F2937]">{highlightMatch(order.student_name, normalizedSearch)}</p>
                      <p className="text-[11px] text-slate-500">{formatOrderDateTime(order.created_at)}</p>
                      <p className="text-xs text-slate-500">Pickup code: <span className="font-mono text-[#1F2937]">{highlightMatch(order.pickup_code, normalizedSearch)}</span></p>
                      {order.delivery_details?.mode === "other" ? (
                        <p className="text-[11px] text-amber-700">Other place: {order.delivery_details.otherLocationName ?? "Unspecified"}</p>
                      ) : null}
                    </div>

                    <p className="text-sm text-slate-600">{highlightMatch(order.items.map((item) => `${item.menu_item_name} x${item.quantity}`).join(", "), normalizedSearch)}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>

                    {toWhatsAppPhone(order.student_phone) ? (
                      <a
                        href={`https://wa.me/${toWhatsAppPhone(order.student_phone)}?text=${encodeURIComponent(buildAdminOrderMessage(order))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Message ${order.student_name} on WhatsApp`}
                        className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-3 py-2 text-xs font-bold text-white"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Customer phone number not available"
                        aria-label="Customer phone number not available"
                        className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs font-bold text-muted-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </button>
                    )}
                  </div>

                  {STATUS_ACTIONS[order.status] ? (
                    <div className="mt-3 space-y-2">
                      <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-700">
                        Current: {getStatusLabel(order.status)}
                      </div>
                      <button
                        disabled={updatingOrderId === order.id}
                        onClick={async () => {
                          await updateOrderStatus(order.id, STATUS_ACTIONS[order.status].next);
                        }}
                        className={`w-full rounded-md px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.06em] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${STATUS_ACTIONS[order.status].btnClass}`}
                      >
                        {updatingOrderId === order.id ? "Updating..." : `Next: ${STATUS_ACTIONS[order.status].label}`}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] xl:block">
              <div className="min-w-[1120px]">
                <div className="grid grid-cols-[84px_170px_150px_150px_minmax(220px,1fr)_110px_180px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  <span>Order</span>
                  <span>Date/Time</span>
                  <span>Vendor</span>
                  <span>Student</span>
                  <span>Items</span>
                  <span>Amount</span>
                  <span>Actions</span>
                </div>

                <div className="divide-y divide-slate-200">
                  {visibleOrders.map((order) => (
                    <article key={order.id} className="grid grid-cols-[84px_170px_150px_150px_minmax(220px,1fr)_110px_180px] items-center gap-2 px-3 py-3">
                      <p className="text-sm font-black text-[#1F2937]">#{highlightMatch(String(order.id), normalizedSearch)}</p>

                      <p className="text-xs text-slate-500">{formatOrderDateTime(order.created_at)}</p>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1F2937]">{highlightMatch(order.vendor_name, normalizedSearch)}</p>
                        <p className="truncate text-xs text-slate-500">{order.vendor_location || "No location"}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1F2937]">{highlightMatch(order.student_name, normalizedSearch)}</p>
                        <p className="truncate text-xs text-slate-500">Pickup code: <span className="font-mono text-[#1F2937]">{highlightMatch(order.pickup_code, normalizedSearch)}</span></p>
                        {order.delivery_details?.mode === "other" ? (
                          <p className="truncate text-[11px] text-amber-700">Other place: {order.delivery_details.otherLocationName ?? "Unspecified"}</p>
                        ) : null}
                      </div>

                      <p className="truncate text-sm text-slate-600">{highlightMatch(order.items.map((item) => `${item.menu_item_name} x${item.quantity}`).join(", "), normalizedSearch)}</p>

                      <p className="text-sm font-bold text-primary">{formatKES(order.total_amount)}</p>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {toWhatsAppPhone(order.student_phone) ? (
                          <a
                            href={`https://wa.me/${toWhatsAppPhone(order.student_phone)}?text=${encodeURIComponent(buildAdminOrderMessage(order))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Message ${order.student_name} on WhatsApp`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#25D366] text-white"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title="Customer phone number not available"
                            aria-label="Customer phone number not available"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {STATUS_ACTIONS[order.status] ? (
                          <div className="space-y-1.5 text-right">
                            <span className="inline-flex min-w-[92px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-700">
                              Current: {getStatusLabel(order.status)}
                            </span>
                            <button
                              disabled={updatingOrderId === order.id}
                              onClick={async () => {
                                await updateOrderStatus(order.id, STATUS_ACTIONS[order.status].next);
                              }}
                              className={`min-w-[92px] rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${STATUS_ACTIONS[order.status].btnClass}`}
                            >
                              {updatingOrderId === order.id ? "Updating..." : `Next: ${STATUS_ACTIONS[order.status].label}`}
                            </button>
                          </div>
                        ) : (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">No action</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
