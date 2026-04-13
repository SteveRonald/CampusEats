import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useListMenuItems, useUpdateMenuItem, useDeleteMenuItem, useListVendors } from "@workspace/api-client-react";
import { VendorLayout } from "@/components/Layout";
import { formatKES } from "@/lib/utils";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getListMenuItemsQueryKey } from "@workspace/api-client-react";

export default function VendorMenu() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [vendorId, setVendorId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: vendors } = useListVendors({ query: { enabled: !!user } });
  useEffect(() => {
    if (vendors && user) {
      const v = vendors.find((v) => v.userId === user.id);
      if (v) setVendorId(v.id);
    }
  }, [vendors, user]);

  const { data: items, isLoading } = useListMenuItems(
    { vendor_id: vendorId ?? undefined },
    { query: { enabled: !!vendorId } },
  );

  const updateItem = useUpdateMenuItem({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({ vendor_id: vendorId ?? undefined }) }),
    },
  });

  const deleteItem = useDeleteMenuItem({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({ vendor_id: vendorId ?? undefined }) }),
    },
  });

  const toggleAvailability = (id: number, current: boolean) => {
    updateItem.mutate({ id, data: { isAvailable: !current } });
  };

  return (
    <VendorLayout>
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-foreground">Menu</h1>
          <button
            onClick={() => navigate("/vendor/menu/new")}
            className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🍽️</div>
            <h3 className="font-bold text-foreground mb-1">No menu items yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first menu item to start receiving orders</p>
            <button
              onClick={() => navigate("/vendor/menu/new")}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold shadow-sm"
            >
              Add first item
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className={`bg-white rounded-xl border border-border p-3 flex gap-3 ${!item.isAvailable ? "opacity-60" : ""}`}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🍽️</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                      <p className="font-semibold text-primary text-sm mt-0.5">{formatKES(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleAvailability(item.id, item.isAvailable)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title={item.isAvailable ? "Mark unavailable" : "Mark available"}
                      >
                        {item.isAvailable ? (
                          <ToggleRight className="w-5 h-5 text-secondary" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this item?")) deleteItem.mutate({ id: item.id });
                        }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.orderCount} orders</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
