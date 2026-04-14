"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { AdminLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { VendorRecord } from "@/lib/types";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingVendorId, setUpdatingVendorId] = useState<number | null>(null);

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

  return (
    <AdminLayout>
      <div className="pt-4">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-[#1F2937] md:text-2xl">Vendors</h1>
            <p className="text-sm text-slate-500">Manage vendor access, payout numbers, and operational readiness.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">{vendors.length} vendors</span>
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
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[minmax(260px,1.2fr)_180px_180px_120px_140px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <span>Vendor</span>
                <span>Contact</span>
                <span>Payout</span>
                <span>Status</span>
                <span className="text-right">Action</span>
              </div>

              <div className="divide-y divide-slate-200">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="grid grid-cols-[minmax(260px,1.2fr)_180px_180px_120px_140px] items-center gap-3 px-4 py-3">
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
                          <p className="truncate text-sm font-bold text-[#1F2937]">{vendor.stall_name}</p>
                          <p className="truncate text-xs text-slate-500">{vendor.description || "No description"}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{vendor.location || "No location"}</p>
                      <p className="text-xs text-slate-500">Pickup {vendor.pickup_time_min}-{vendor.pickup_time_max} min</p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{vendor.mpesa_number}</p>
                      <p className="text-xs text-slate-500">M-Pesa destination</p>
                    </div>

                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${vendor.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {vendor.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="text-right">
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
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
