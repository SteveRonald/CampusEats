import { useListVendors, useToggleVendorStatus } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/Layout";
import { Store } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListVendorsQueryKey } from "@workspace/api-client-react";

export default function AdminVendors() {
  const { data: vendors, isLoading } = useListVendors({ query: {} });
  const qc = useQueryClient();
  const toggle = useToggleVendorStatus({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListVendorsQueryKey() }) },
  });

  return (
    <AdminLayout>
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-5">Vendors</h1>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : !vendors || vendors.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-bold text-foreground">No vendors yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="bg-white rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    {vendor.imageUrl ? (
                      <img src={vendor.imageUrl} alt={vendor.stallName} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <Store className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-bold text-foreground truncate">{vendor.stallName}</p>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${vendor.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {vendor.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {vendor.description && <p className="text-xs text-muted-foreground truncate mb-1">{vendor.description}</p>}
                    <p className="text-xs text-muted-foreground">M-Pesa: {vendor.mpesaNumber}</p>
                    {vendor.location && <p className="text-xs text-muted-foreground">{vendor.location}</p>}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => toggle.mutate({ id: vendor.id })}
                    disabled={toggle.isPending}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                      vendor.isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {vendor.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
