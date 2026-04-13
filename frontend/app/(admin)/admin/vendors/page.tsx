"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { AdminLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { VendorRecord } from "@/lib/types";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);

  useEffect(() => {
    client.vendors().then(setVendors);
  }, []);

  return (
    <AdminLayout>
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-5">Vendors</h1>
        <div className="space-y-3">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  {vendor.image_url ? (
                    <img src={vendor.image_url} alt={vendor.stall_name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <Store className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-bold text-foreground truncate">{vendor.stall_name}</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${vendor.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {vendor.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {vendor.description && <p className="text-xs text-muted-foreground truncate mb-1">{vendor.description}</p>}
                  <p className="text-xs text-muted-foreground">M-Pesa: {vendor.mpesa_number}</p>
                  {vendor.location && <p className="text-xs text-muted-foreground">{vendor.location}</p>}
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={async () => {
                    await client.toggleVendor(vendor.id);
                    setVendors(await client.vendors());
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    vendor.is_active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {vendor.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
