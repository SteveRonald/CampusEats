"use client";

import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
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

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return <>{text}</>;
  }

  const normalizedText = text.toLowerCase();
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex < 0) {
    return <>{text}</>;
  }

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = text.slice(matchIndex + normalizedQuery.length);

  return (
    <>
      {before}
      <mark className="rounded bg-orange-100 px-0.5 font-semibold text-[#1F2937]">{match}</mark>
      {after}
    </>
  );
}

function buildVendorOrderMessage(order: OrderRecord): string {
  const itemSummary = order.items.map((item) => `${item.menu_item_name} x${item.quantity}`).join(", ");
  return [
    `Hi ${order.student_name},`,
    `This is an update for your CampusEats order #${order.id}.`,
    `Status: ${getStatusLabel(order.status)}`,
    `Pickup code: ${order.pickup_code}`,
    `Items: ${itemSummary}`,
    `Total: ${formatKES(order.total_amount)}`
  ].join("\n");
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12.04 2C6.5 2 2 6.49 2 12.03c0 1.77.46 3.5 1.33 5.02L2 22l5.09-1.31a10.02 10.02 0 0 0 4.95 1.27h.01c5.54 0 10.04-4.49 10.04-10.03A10.02 10.02 0 0 0 12.04 2Zm0 18.26h-.01c-1.5 0-2.97-.4-4.25-1.15l-.3-.18-3.02.78.8-2.95-.2-.31a8.28 8.28 0 0 1-1.27-4.41c0-4.57 3.72-8.29 8.3-8.29a8.3 8.3 0 0 1 8.28 8.29c0 4.57-3.72 8.29-8.33 8.29Zm4.56-6.17c-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.56.13-.17.25-.65.82-.8.98-.14.17-.3.19-.55.06-.25-.13-1.06-.39-2.03-1.24a7.6 7.6 0 0 1-1.4-1.73c-.14-.25-.02-.39.11-.52.12-.12.25-.3.37-.45.12-.14.16-.25.25-.42.08-.17.04-.31-.02-.44-.07-.13-.56-1.35-.77-1.85-.2-.48-.41-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.02 2.61.13.17 1.79 2.73 4.33 3.83.61.26 1.08.42 1.45.54.61.19 1.17.16 1.61.1.49-.07 1.5-.61 1.72-1.2.21-.59.21-1.1.15-1.2-.06-.1-.22-.16-.46-.29Z"
      />
    </svg>
  );
}

const STATUS_ACTIONS: Record<string, { next: string; label: string; btnClass: string }> = {
  paid: { next: "preparing", label: "Start preparing", btnClass: "bg-yellow-500 text-white" },
  preparing: { next: "ready", label: "Mark ready", btnClass: "bg-secondary text-white" },
  ready: { next: "completed", label: "Mark completed", btnClass: "bg-gray-700 text-white" }
};

export default function VendorOrdersPage() {
  const { profile } = useSession();
  const vendorId = profile?.vendorId;
  const [filter, setFilter] = useState<string>("active");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    const load = async () => {
      try {
        setLoadError(null);
        setOrders(await client.vendorOrders(vendorId));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to fetch vendor orders");
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [vendorId]);

  if (!profile) {
    return null;
  }

  const filtered = orders.filter((order) => {
    if (filter === "active") return ["paid", "preparing", "ready"].includes(order.status);
    if (filter === "completed") return order.status === "completed";
    return true;
  });

  const searchTerm = search.trim().toLowerCase();
  const hasSearch = searchTerm.length > 0;
  const visibleOrders = filtered.filter((order) => {
    if (!searchTerm) return true;

    const itemText = order.items.map((item) => item.menu_item_name).join(" ").toLowerCase();
    const phone = (order.student_phone ?? "").toLowerCase();
    const pickupCode = (order.pickup_code ?? "").toLowerCase();
    const name = (order.student_name ?? "").toLowerCase();
    const orderId = String(order.id);

    return (
      phone.includes(searchTerm) ||
      pickupCode.includes(searchTerm) ||
      name.includes(searchTerm) ||
      itemText.includes(searchTerm) ||
      orderId.includes(searchTerm)
    );
  });

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
        <div className="mb-4">
          <div>
            <h1 className="text-lg font-bold text-[#1F2937] md:text-xl">Orders</h1>
            <p className="text-xs text-slate-500">Track incoming orders and update progress quickly.</p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 md:p-4">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Search orders</label>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="hidden text-xs font-semibold text-slate-500 sm:inline">Phone or pickup code</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by phone, pickup code, name, item, or order number"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#1F2937] outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "active", label: "Active" },
            { key: "completed", label: "Completed" },
            { key: "all", label: "All" }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-md border px-3 py-2 text-xs font-semibold transition-all ${
                filter === key ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loadError && <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}

        {visibleOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
            <p className="text-sm font-semibold text-[#1F2937]">No orders in this view</p>
            <p className="mt-1 text-xs text-slate-500">Switch filters or adjust your search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
            <div className="min-w-[760px] md:min-w-[860px] lg:min-w-[920px]">
              <div className="grid grid-cols-[110px_150px_minmax(220px,1fr)_100px_100px_180px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 md:grid-cols-[115px_165px_minmax(240px,1fr)_110px_110px_195px] md:px-4 lg:grid-cols-[120px_180px_minmax(0,1fr)_120px_120px_210px]">
                <span>Order</span>
                <span>Customer</span>
                <span>Items</span>
                <span>Price</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y divide-slate-200">
                {visibleOrders.map((order) => {
                  const action = STATUS_ACTIONS[order.status];
                  const isUpdating = updatingOrderId === order.id;
                  const isHighlightedBySearch = hasSearch;

                  return (
                    <article
                      key={order.id}
                      className={`grid grid-cols-[110px_150px_minmax(220px,1fr)_100px_100px_180px] items-center gap-3 px-3 py-3 md:grid-cols-[115px_165px_minmax(240px,1fr)_110px_110px_195px] md:px-4 lg:grid-cols-[120px_180px_minmax(0,1fr)_120px_120px_210px] ${
                        isHighlightedBySearch ? "bg-orange-50/60" : "bg-white"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-[#1F2937]"><HighlightMatch text={`#${order.id}`} query={search} /></p>
                        <p className="text-[11px] text-slate-500">{formatOrderDateTime(order.created_at)}</p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#1F2937]"><HighlightMatch text={order.student_name} query={search} /></p>
                        <p className="text-[11px] text-slate-500">Pickup Code: <span className="font-mono text-[#1F2937]">{order.pickup_code}</span></p>
                        {order.delivery_details?.mode === "other" ? (
                          <p className="mt-0.5 text-[11px] text-amber-700">
                            Other place: {order.delivery_details.otherLocationName ?? "Unspecified"}
                          </p>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-x-1 gap-y-1 text-sm text-[#1F2937]">
                          {order.items.map((item, index) => {
                            const itemLabel = `${item.menu_item_name} x${item.quantity}`;

                            return (
                              <span key={`${order.id}-${item.id}`} className="whitespace-nowrap">
                                <HighlightMatch text={itemLabel} query={search} />
                                {index < order.items.length - 1 ? <span className="text-slate-400">,</span> : null}
                              </span>
                            );
                          })}
                        </div>
                        {order.notes ? <p className="truncate text-[11px] text-slate-500">Note: {order.notes}</p> : null}
                      </div>

                      <div>
                        <p className="text-sm font-bold text-primary">{formatKES(order.total_amount)}</p>
                      </div>

                      <div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {toWhatsAppPhone(order.student_phone) ? (
                          <a
                            href={`https://wa.me/${toWhatsAppPhone(order.student_phone)}?text=${encodeURIComponent(buildVendorOrderMessage(order))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Message ${order.student_name} on WhatsApp`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#25D366] text-white"
                          >
                            <WhatsAppIcon />
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title="Customer phone number not available"
                            aria-label="Customer phone number not available"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground"
                          >
                            <WhatsAppIcon />
                          </button>
                        )}
                        {action ? (
                          <div className="space-y-1.5 text-right">
                            <span className="inline-flex min-w-[104px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-700">
                              Current: {getStatusLabel(order.status)}
                            </span>
                            <button
                              disabled={isUpdating}
                              onClick={async () => {
                                await updateOrderStatus(order.id, action.next);
                              }}
                              className={`min-w-[104px] rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${action.btnClass}`}
                            >
                              {isUpdating ? "Updating..." : `Next: ${action.label}`}
                            </button>
                          </div>
                        ) : (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">No action</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
