"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { AdminLayout, AdminMenuButton } from "@/components/Layout";
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

function getDeliveryLocationSummary(order: OrderRecord): string | null {
  if (order.order_type !== "delivery") return null;

  const details = order.delivery_details;
  const mode = details?.mode;

  if (mode === "hostel") {
    const hostel = details?.hostelName ?? order.hostel_name ?? "Hostel";
    const room = details?.roomNumber ?? order.room_number ?? "";
    return room ? `${hostel}, Room ${room}` : hostel;
  }

  if (mode === "off_campus") {
    const area = details?.serviceAreaName ?? order.service_area_name ?? "Service area";
    const label = details?.deliveryLocationLabel ?? "";
    const location = details?.deliveryLocation ?? "";
    return [area, label, location].filter(Boolean).join(" - ") || area;
  }

  if (mode === "other") {
    const place = details?.otherLocationName ?? "Other location";
    const extra = details?.otherLocationDetails ?? "";
    return extra ? `${place} - ${extra}` : place;
  }

  const fallback = details?.deliveryLocation || details?.deliveryLocationLabel || details?.hostelName || details?.serviceAreaName;
  return fallback ?? null;
}

function getDeliveryLocationDetails(order: OrderRecord): Array<{ label: string; value: string }> {
  const details: Array<{ label: string; value: string }> = [];
  const payload = order.delivery_details;

  if (!payload) {
    return details;
  }

  if (payload.mode) {
    details.push({ label: "Mode", value: payload.mode.replace(/_/g, " ") });
  }
  if (payload.hostelName || order.hostel_name) {
    details.push({ label: "Hostel", value: payload.hostelName ?? order.hostel_name ?? "-" });
  }
  if (payload.roomNumber || order.room_number) {
    details.push({ label: "Room", value: payload.roomNumber ?? order.room_number ?? "-" });
  }
  if (payload.serviceAreaName || order.service_area_name) {
    details.push({ label: "Service Area", value: payload.serviceAreaName ?? order.service_area_name ?? "-" });
  }
  if (payload.deliveryLocationLabel) {
    details.push({ label: "Location Label", value: payload.deliveryLocationLabel });
  }
  if (payload.deliveryLocation) {
    details.push({ label: "Location", value: payload.deliveryLocation });
  }
  if (payload.otherLocationName) {
    details.push({ label: "Other Place", value: payload.otherLocationName });
  }
  if (payload.otherLocationDetails) {
    details.push({ label: "Place Details", value: payload.otherLocationDetails });
  }

  return details;
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
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [selectedItemImage, setSelectedItemImage] = useState<{ src: string; alt: string } | null>(null);

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
          <div className="flex items-center gap-2">
            <AdminMenuButton />
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">{visibleOrders.length} shown</span>
          </div>
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
                <article
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("button, a, input, textarea")) return;
                    setSelectedOrder(order);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      const target = event.target as HTMLElement;
                      if (target.closest("button, a, input, textarea")) return;
                      event.preventDefault();
                      setSelectedOrder(order);
                    }
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
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
                      {getDeliveryLocationSummary(order) ? <p className="text-[11px] text-amber-700">Delivery: {getDeliveryLocationSummary(order)}</p> : null}
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      {order.items.map((item, index) => (
                        <span key={`${order.id}-${item.id}-${index}`} className="flex items-center gap-2 min-w-0">
                          {item.menu_item_image_url ? (
                            <img src={item.menu_item_image_url} alt={item.menu_item_name} className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-200 text-[10px] font-bold text-slate-500">N/A</span>
                          )}
                          <span className="truncate">{highlightMatch(`${item.menu_item_name} x${item.quantity}`, normalizedSearch)}</span>
                        </span>
                      ))}
                    </div>
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
                    <article
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest("button, a, input, textarea")) return;
                        setSelectedOrder(order);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          const target = event.target as HTMLElement;
                          if (target.closest("button, a, input, textarea")) return;
                          event.preventDefault();
                          setSelectedOrder(order);
                        }
                      }}
                      className="grid grid-cols-[84px_170px_150px_150px_minmax(220px,1fr)_110px_180px] items-center gap-2 px-3 py-3"
                    >
                      <p className="text-sm font-black text-[#1F2937]">#{highlightMatch(String(order.id), normalizedSearch)}</p>

                      <p className="text-xs text-slate-500">{formatOrderDateTime(order.created_at)}</p>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1F2937]">{highlightMatch(order.vendor_name, normalizedSearch)}</p>
                        <p className="truncate text-xs text-slate-500">{order.vendor_location || "No location"}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1F2937]">{highlightMatch(order.student_name, normalizedSearch)}</p>
                        <p className="truncate text-xs text-slate-500">Pickup code: <span className="font-mono text-[#1F2937]">{highlightMatch(order.pickup_code, normalizedSearch)}</span></p>
                        {getDeliveryLocationSummary(order) ? <p className="truncate text-[11px] text-amber-700">Delivery: {getDeliveryLocationSummary(order)}</p> : null}
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        {order.items.map((item, index) => (
                          <span key={`${order.id}-${item.id}-${index}`} className="flex max-w-full items-center gap-1.5 text-[11px] text-slate-600">
                            {item.menu_item_image_url ? (
                              <img src={item.menu_item_image_url} alt={item.menu_item_name} className="h-8 w-8 rounded-md object-cover" />
                            ) : (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-200 text-[9px] font-bold text-slate-500">N/A</span>
                            )}
                            <span className="truncate">{highlightMatch(`${item.menu_item_name} x${item.quantity}`, normalizedSearch)}</span>
                          </span>
                        ))}
                      </div>

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

            {selectedOrder ? (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-2 sm:items-center sm:p-4" onClick={() => setSelectedOrder(null)}>
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Order ${selectedOrder.id} details`}
                  className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
                    <div>
                      <p className="text-base font-black text-[#1F2937]">Order #{selectedOrder.id}</p>
                      <p className="text-xs text-slate-500">{formatOrderDateTime(selectedOrder.created_at)}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      Close
                    </button>
                  </div>

                  <div className="space-y-4 px-4 py-4 sm:px-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Vendor</p>
                        <p className="mt-1 text-sm font-semibold text-[#1F2937]">{selectedOrder.vendor_name}</p>
                        <p className="text-xs text-slate-600">{selectedOrder.vendor_location ?? "No location set"}</p>
                        <p className="text-xs text-slate-600">Phone: {selectedOrder.vendor_phone ?? "Not provided"}</p>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Customer</p>
                        <p className="mt-1 text-sm font-semibold text-[#1F2937]">{selectedOrder.student_name}</p>
                        <p className="text-xs text-slate-600">Phone: {selectedOrder.student_phone ?? "Not provided"}</p>
                        <p className="text-xs text-slate-600">Pickup code: <span className="font-mono">{selectedOrder.pickup_code}</span></p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Order Summary</p>
                      <div className="mt-1 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                        <p><span className="font-semibold text-[#1F2937]">Status:</span> {getStatusLabel(selectedOrder.status)}</p>
                        <p><span className="font-semibold text-[#1F2937]">Type:</span> {selectedOrder.order_type}</p>
                        <p><span className="font-semibold text-[#1F2937]">Total:</span> {formatKES(selectedOrder.total_amount)}</p>
                        <p><span className="font-semibold text-[#1F2937]">Placed:</span> {formatOrderDateTime(selectedOrder.created_at)}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Selected Delivery Location</p>
                      {getDeliveryLocationDetails(selectedOrder).length > 0 ? (
                        <div className="mt-2 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
                          {getDeliveryLocationDetails(selectedOrder).map((row) => (
                            <p key={`${row.label}-${row.value}`}>
                              <span className="font-semibold text-[#1F2937]">{row.label}:</span> {row.value}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">No delivery location details captured for this order.</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Items</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {selectedOrder.items.map((item, index) => (
                          <div key={`${selectedOrder.id}-${item.id}-${index}`} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                            {item.menu_item_image_url ? (
                              <button
                                type="button"
                                onClick={() => setSelectedItemImage({ src: item.menu_item_image_url as string, alt: item.menu_item_name })}
                                className="rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                                aria-label={`View ${item.menu_item_name} image`}
                              >
                                <img src={item.menu_item_image_url} alt={item.menu_item_name} className="h-14 w-14 rounded-md object-cover" />
                              </button>
                            ) : (
                              <span className="inline-flex h-14 w-14 items-center justify-center rounded-md bg-slate-200 text-xs font-bold text-slate-500">N/A</span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#1F2937]">{item.menu_item_name}</p>
                              <p className="text-xs text-slate-600">Qty: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedOrder.notes ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Customer Note</p>
                        <p className="mt-1 text-sm text-slate-700">{selectedOrder.notes}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedItemImage ? (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3" onClick={() => setSelectedItemImage(null)}>
                <div className="relative w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setSelectedItemImage(null)}
                    className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white"
                  >
                    Close
                  </button>
                  <img src={selectedItemImage.src} alt={selectedItemImage.alt} className="max-h-[85vh] w-full rounded-lg object-contain" />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
