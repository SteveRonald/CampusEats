"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { AdminMenuReviewRecord } from "@/lib/types";
import { formatKES } from "@/lib/utils";
import { X } from "lucide-react";

export default function AdminMenuReviewPage() {
  const [items, setItems] = useState<AdminMenuReviewRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [activeImage, setActiveImage] = useState<{ src: string; alt: string } | null>(null);
  const [notesByItemId, setNotesByItemId] = useState<Record<number, string>>({});
  const [editingItem, setEditingItem] = useState<AdminMenuReviewRecord | null>(null);
  const [viewingItem, setViewingItem] = useState<AdminMenuReviewRecord | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    is_available: true
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await client.adminMenuReview(search, status, undefined, page, pageSize);
        setItems(data.items);
        setTotal(data.total);
        setNotesByItemId((current) => {
          const next = { ...current };
          for (const item of data.items) {
            if (next[item.id] === undefined) {
              next[item.id] = item.verification_notes ?? "";
            }
          }
          return next;
        });
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to fetch menu review items");
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [search, status, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, status, pageSize]);

  const updateStatus = async (item: AdminMenuReviewRecord, nextStatus: "pending" | "approved" | "rejected") => {
    setUpdatingItemId(item.id);
    try {
      const noteValue = (notesByItemId[item.id] ?? "").trim();
      await client.updateMenuVerification(item.id, {
        status: nextStatus,
        notes: noteValue || (nextStatus === "approved" ? "Menu item approved by admin." : nextStatus === "rejected" ? "Rejected. Update details and re-submit." : "")
      });
      const refreshed = await client.adminMenuReview(search, status, undefined, page, pageSize);
      setItems(refreshed.items);
      setTotal(refreshed.total);
      setError(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update menu verification");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const openEditModal = (item: AdminMenuReviewRecord) => {
    setEditingItem(item);
    setEditFormData({
      name: item.name,
      description: item.description || "",
      price: item.price,
      category: item.category,
      is_available: item.is_available
    });
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    setUpdatingItemId(editingItem.id);
    try {
      await client.updateMenuItem(editingItem.id, {
        name: editFormData.name,
        description: editFormData.description || null,
        price: editFormData.price,
        category: editFormData.category,
        is_available: editFormData.is_available
      });

      const refreshed = await client.adminMenuReview(search, status, undefined, page, pageSize);
      setItems(refreshed.items);
      setTotal(refreshed.total);
      setEditingItem(null);
      setError(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update menu item");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleUnpublish = async (item: AdminMenuReviewRecord) => {
    setUpdatingItemId(item.id);
    try {
      await client.updateMenuItem(item.id, {
        name: item.name,
        description: item.description || null,
        price: item.price,
        category: item.category,
        is_available: false
      });

      const refreshed = await client.adminMenuReview(search, status, undefined, page, pageSize);
      setItems(refreshed.items);
      setTotal(refreshed.total);
      setError(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to unpublish menu item");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const badgeClass = useMemo(
    () => ({
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    }),
    []
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageButtons = useMemo(() => {
    const visibleButtons = 5;
    const start = Math.max(1, page - Math.floor(visibleButtons / 2));
    const end = Math.min(totalPages, start + visibleButtons - 1);
    const adjustedStart = Math.max(1, end - visibleButtons + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [page, totalPages]);

  return (
    <AdminLayout>
      <div className="pt-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-[#1F2937] md:text-2xl">Menu Review</h1>
            <p className="text-sm text-slate-500">Approve vendor menu items before they appear to students.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">{total} items</span>
        </div>

        <div className="mb-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by item, category, or vendor"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "approved", label: "Approved" },
              { key: "rejected", label: "Rejected" }
            ] as const).map((option) => (
              <button
                key={option.key}
                onClick={() => setStatus(option.key)}
                className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                  status === option.key ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-primary" />
            <p className="text-sm font-semibold text-[#1F2937]">Loading menu review items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
            <p className="text-sm font-semibold text-[#1F2937]">No menu items found for this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
            <div className="min-w-[1160px]">
              <div className="grid grid-cols-[78px_180px_minmax(220px,1fr)_120px_110px_180px_220px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <span>Image</span>
                <span>Vendor</span>
                <span>Item</span>
                <span>Admin note</span>
                <span>Status</span>
                <span>Price</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y divide-slate-200">
                {items.map((item) => {
                  const statusKey = item.verification_status ?? "pending";
                  return (
                    <div key={item.id} className="grid grid-cols-[78px_180px_minmax(220px,1fr)_120px_110px_180px_220px] items-center gap-3 px-4 py-3">
                      <div>
                        {item.image_url ? (
                          <button
                            type="button"
                            onClick={() => setActiveImage({ src: item.image_url ?? "", alt: `${item.name} image` })}
                            className="rounded-md border border-slate-200"
                          >
                            <img src={item.image_url} alt={item.name} className="h-12 w-12 rounded-md object-cover" />
                          </button>
                        ) : (
                          <div className="h-12 w-12 rounded-md border border-slate-200 bg-slate-100" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-[#1F2937]">{item.vendor_name}</p>
                        {item.vendor_image_url ? (
                          <button
                            type="button"
                            onClick={() => setActiveImage({ src: item.vendor_image_url ?? "", alt: `${item.vendor_name} logo` })}
                            className="mt-1 text-xs font-semibold text-primary underline underline-offset-2"
                          >
                            View vendor logo
                          </button>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-[#1F2937]">{item.name}</p>
                        <p className="break-words text-xs text-slate-500">{item.description || "No description"}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">{item.category}</p>
                      </div>

                      <div>
                        <textarea
                          value={notesByItemId[item.id] ?? ""}
                          onChange={(event) =>
                            setNotesByItemId((current) => ({
                              ...current,
                              [item.id]: event.target.value
                            }))
                          }
                          rows={2}
                          placeholder="Optional note"
                          className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none"
                        />
                      </div>

                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeClass[statusKey]}`}>{statusKey}</span>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-primary">{formatKES(item.price)}</p>
                        <p className="text-[11px] text-slate-500">{item.is_available ? "Live" : "Hidden"}</p>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => setViewingItem(item)}
                          disabled={updatingItemId === item.id}
                          className="rounded-md bg-purple-600 px-2.5 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          disabled={updatingItemId === item.id}
                          className="rounded-md bg-blue-600 px-2.5 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => updateStatus(item, "approved")}
                          disabled={updatingItemId === item.id}
                          className="rounded-md bg-green-600 px-2.5 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(item, "rejected")}
                          disabled={updatingItemId === item.id}
                          className="rounded-md bg-red-600 px-2.5 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleUnpublish(item)}
                          disabled={updatingItemId === item.id || !item.is_available}
                          className="rounded-md bg-slate-600 px-2.5 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Unpublish
                        </button>
                        <button
                          onClick={() => updateStatus(item, "pending")}
                          disabled={updatingItemId === item.id}
                          className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-800 disabled:opacity-60"
                        >
                          Pending
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!loading && total > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </p>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                Size
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none"
                >
                  {[6, 12, 24, 48].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              {pageButtons.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPage(value)}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                    value === page ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {value}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {/* View Details Modal */}
        {viewingItem ? (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <h2 className="text-lg font-bold text-[#1F2937]">Menu Item Details</h2>
                <button
                  onClick={() => setViewingItem(null)}
                  className="rounded-lg p-1 hover:bg-slate-100"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <div className="max-h-[80vh] overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Item Image */}
                  {viewingItem.image_url && (
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Item Image</h3>
                      <button
                        onClick={() => {
                          setActiveImage({ src: viewingItem.image_url ?? "", alt: viewingItem.name });
                        }}
                        className="rounded-lg border border-slate-200"
                      >
                        <img
                          src={viewingItem.image_url}
                          alt={viewingItem.name}
                          className="h-48 w-full rounded-lg object-cover"
                        />
                      </button>
                    </div>
                  )}

                  {/* Vendor Information */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Vendor Information</h3>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-4">
                        {viewingItem.vendor_image_url && (
                          <button
                            onClick={() => {
                              setActiveImage({
                                src: viewingItem.vendor_image_url ?? "",
                                alt: viewingItem.vendor_name
                              });
                            }}
                          >
                            <img
                              src={viewingItem.vendor_image_url}
                              alt={viewingItem.vendor_name}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          </button>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#1F2937]">{viewingItem.vendor_name}</p>
                          <p className="text-xs text-slate-600">Vendor ID: {viewingItem.vendor_id}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item Details */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Item Details</h3>
                    <div className="space-y-3">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Name</p>
                        <p className="mt-1 text-sm font-semibold text-[#1F2937]">{viewingItem.name}</p>
                      </div>

                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Description</p>
                        <p className="mt-1 text-sm text-[#1F2937]">{viewingItem.description || "No description provided"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-200 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Price</p>
                          <p className="mt-1 text-lg font-bold text-primary">{formatKES(viewingItem.price)}</p>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Category</p>
                          <p className="mt-1 text-sm font-semibold text-[#1F2937]">{viewingItem.category}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Information */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Status Information</h3>
                    <div className="space-y-3">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Verification Status</p>
                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              viewingItem.verification_status === "approved"
                                ? "bg-green-100 text-green-700"
                                : viewingItem.verification_status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {viewingItem.verification_status || "pending"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Availability</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              viewingItem.is_available ? "bg-green-600" : "bg-slate-400"
                            }`}
                          />
                          <p className="text-sm font-semibold text-[#1F2937]">
                            {viewingItem.is_available ? "Published (visible to students)" : "Unpublished (hidden)"}
                          </p>
                        </div>
                      </div>

                      {viewingItem.verification_notes && (
                        <div className="rounded-lg border border-slate-200 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Verification Notes</p>
                          <p className="mt-1 text-sm text-[#1F2937]">{viewingItem.verification_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta Information */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Meta Information</h3>
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Order Count:</span>
                        <span className="text-sm font-semibold text-[#1F2937]">{viewingItem.order_count}</span>
                      </div>
                      {viewingItem.verified_at && (
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-600">Verified At:</span>
                          <span className="text-sm font-semibold text-[#1F2937]">
                            {new Date(viewingItem.verified_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  onClick={() => setViewingItem(null)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Edit Modal */}
        {editingItem ? (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#1F2937]">Edit Menu Item</h2>
                <button
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg p-1 hover:bg-slate-100"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">Item Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">Description</label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">Price (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.price}
                      onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">Category</label>
                    <input
                      type="text"
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={editFormData.is_available}
                    onChange={(e) => setEditFormData({ ...editFormData, is_available: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                  />
                  <label htmlFor="isAvailable" className="text-sm font-semibold text-foreground">
                    Publish (make visible to students)
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={updatingItemId === editingItem.id}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                >
                  {updatingItemId === editingItem.id ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {activeImage ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" onClick={() => setActiveImage(null)}>
            <img src={activeImage.src} alt={activeImage.alt} className="max-h-[90vh] max-w-[90vw] rounded-lg border border-white/20 object-contain" />
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
