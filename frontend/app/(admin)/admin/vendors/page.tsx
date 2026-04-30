"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { AdminLayout, AdminMenuButton } from "@/components/Layout";
import { client } from "@/lib/api";
import { VendorRecord } from "@/lib/types";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingVendorId, setUpdatingVendorId] = useState<number | null>(null);
  const [expandedVendorId, setExpandedVendorId] = useState<number | null>(null);
  const [activeImage, setActiveImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await client.vendors();
        setVendors(data);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to fetch vendors");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const toggleVendor = async (vendor: VendorRecord) => {
    setUpdatingVendorId(vendor.id);
    try {
      const updated = await client.toggleVendor(vendor.id);
      setVendors((current) => current.map((item) => (item.id === vendor.id ? updated : item)));
      setError(null);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update vendor status");
    } finally {
      setUpdatingVendorId(null);
    }
  };

  const updateVerification = async (vendor: VendorRecord, status: "pending" | "approved" | "rejected") => {
    setUpdatingVendorId(vendor.id);
    try {
      const updated = await client.updateVendorVerification(vendor.id, {
        status,
        notes: status === "approved" ? "Vendor verification approved by admin." : status === "rejected" ? "Verification rejected. Please update proof images." : ""
      });
      setVendors((current) => current.map((item) => (item.id === vendor.id ? updated : item)));
      setError(null);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Failed to update verification");
    } finally {
      setUpdatingVendorId(null);
    }
  };

  const verificationBadge = (status: VendorRecord["verification_status"]) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-800";
  };

  return (
    <AdminLayout>
      <div className="pt-4">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-[#1F2937] md:text-2xl">Vendors</h1>
            <p className="text-sm text-slate-500">Manage vendor access, payout numbers, and operational readiness.</p>
          </div>
          <div className="flex items-center gap-2">
            <AdminMenuButton />
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">{vendors.length} vendors</span>
          </div>
        </div>

        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-primary" />
            <p className="text-sm font-semibold text-[#1F2937]">Loading vendors...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
            <p className="text-sm font-semibold text-[#1F2937]">No vendors found</p>
            <p className="mt-1 text-xs text-slate-500">Vendors will appear here after onboarding.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
            <div className="min-w-[1060px]">
              <div className="grid grid-cols-[minmax(240px,1.1fr)_170px_170px_120px_140px_150px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <span>Vendor</span>
                <span>Contact</span>
                <span>Payout</span>
                <span>Verification</span>
                <span>Status</span>
                <span className="text-right">Action</span>
              </div>

              <div className="divide-y divide-slate-200">
                {vendors.map((vendor) => (
                  <div key={vendor.id}>
                    <div className="grid grid-cols-[minmax(240px,1.1fr)_170px_170px_120px_140px_150px] items-center gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-orange-50">
                            {vendor.image_url ? (
                              <img src={vendor.image_url} alt={vendor.stall_name} className="h-12 w-12 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Store className="h-5 w-5 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold text-[#1F2937]">{vendor.stall_name}</p>
                            <p className="break-words text-xs text-slate-500">{vendor.description || "No description"}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#1F2937]">{vendor.location || "No location"}</p>
                        <p className="text-xs text-slate-500">Delivery estimate {vendor.pickup_time_min}-{vendor.pickup_time_max} min</p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#1F2937]">{vendor.mpesa_number}</p>
                        <p className="text-xs text-slate-500">M-Pesa destination</p>
                      </div>

                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${verificationBadge(vendor.verification_status)}`}>
                          {vendor.verification_status}
                        </span>
                      </div>

                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${vendor.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {vendor.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="text-right">
                        <button
                          onClick={() => setExpandedVendorId((current) => (current === vendor.id ? null : vendor.id))}
                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#1F2937] hover:bg-slate-50"
                        >
                          {expandedVendorId === vendor.id ? "Hide" : "Review"}
                        </button>
                      </div>
                    </div>

                    {expandedVendorId === vendor.id ? (
                      <div className="grid grid-cols-3 gap-4 border-t border-slate-100 bg-slate-50 px-4 py-4">
                        <div className="space-y-2 text-sm">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Owner details</p>
                          <p className="break-words font-semibold text-[#1F2937]">{vendor.owner_name || "-"}</p>
                          <p className="break-words text-slate-600">{vendor.owner_email || "-"}</p>
                          <p className="break-words text-slate-600">{vendor.owner_phone || "-"}</p>
                          <p className="break-words text-xs text-slate-500">{vendor.verification_notes || "No admin note yet"}</p>
                        </div>

                        <div className="space-y-2 text-sm">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Vendor details</p>
                          <p className="break-words text-slate-700"><span className="font-semibold text-[#1F2937]">Business:</span> {vendor.stall_name || "-"}</p>
                          <p className="break-words text-slate-700"><span className="font-semibold text-[#1F2937]">Description:</span> {vendor.description || "-"}</p>
                          <p className="break-words text-slate-700"><span className="font-semibold text-[#1F2937]">Location:</span> {vendor.location || "-"}</p>
                          <p className="break-words text-slate-700"><span className="font-semibold text-[#1F2937]">M-Pesa:</span> {vendor.mpesa_number || "-"}</p>
                          <p className="break-words text-slate-700">
                            <span className="font-semibold text-[#1F2937]">Delivery estimate:</span> {vendor.pickup_time_min}-{vendor.pickup_time_max} min
                          </p>
                          <p className="break-words text-slate-700"><span className="font-semibold text-[#1F2937]">Verification:</span> {vendor.verification_status}</p>
                          <p className="break-words text-slate-700"><span className="font-semibold text-[#1F2937]">Account status:</span> {vendor.is_active ? "Active" : "Inactive"}</p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Business logo</p>
                          {vendor.image_url ? (
                            <button type="button" onClick={() => setActiveImage({ src: vendor.image_url ?? "", alt: `${vendor.stall_name} logo` })}>
                              <img src={vendor.image_url} alt={`${vendor.stall_name} logo`} className="h-28 w-28 rounded-lg border border-slate-200 object-cover" />
                            </button>
                          ) : (
                            <p className="text-sm text-slate-500">No logo uploaded</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Location proof</p>
                          {vendor.location_proof_image_url ? (
                            <button type="button" onClick={() => setActiveImage({ src: vendor.location_proof_image_url ?? "", alt: `${vendor.stall_name} location proof` })}>
                              <img src={vendor.location_proof_image_url} alt={`${vendor.stall_name} location proof`} className="h-28 w-full rounded-lg border border-slate-200 object-cover" />
                            </button>
                          ) : (
                            <p className="text-sm text-slate-500">No location proof uploaded</p>
                          )}
                        </div>

                        <div className="col-span-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updateVerification(vendor, "approved")}
                              disabled={updatingVendorId === vendor.id}
                              className="rounded-md bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                            >
                              Approve vendor
                            </button>
                            <button
                              onClick={() => updateVerification(vendor, "rejected")}
                              disabled={updatingVendorId === vendor.id}
                              className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                            >
                              Reject vendor
                            </button>
                            <button
                              onClick={() => updateVerification(vendor, "pending")}
                              disabled={updatingVendorId === vendor.id}
                              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-60"
                            >
                              Mark pending
                            </button>
                          </div>

                          <button
                            onClick={() => toggleVendor(vendor)}
                            disabled={updatingVendorId === vendor.id}
                            className={`rounded-md px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              vendor.is_active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {updatingVendorId === vendor.id ? "Updating..." : vendor.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeImage ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" onClick={() => setActiveImage(null)}>
            <img src={activeImage.src} alt={activeImage.alt} className="max-h-[90vh] max-w-[90vw] rounded-lg border border-white/20 object-contain" />
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
