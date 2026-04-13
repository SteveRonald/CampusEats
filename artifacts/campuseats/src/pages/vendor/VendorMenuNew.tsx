import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCreateMenuItem, useListVendors } from "@workspace/api-client-react";
import { VendorLayout } from "@/components/Layout";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getListMenuItemsQueryKey } from "@workspace/api-client-react";

const CATEGORIES = ["Rice", "Ugali", "Snacks", "Drinks", "Chapati", "Stew", "Soup", "Sandwich", "Fruit", "Other"];

export default function VendorMenuNew() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "Rice", imageUrl: "", isAvailable: true });
  const qc = useQueryClient();

  const { data: vendors } = useListVendors({ query: { enabled: !!user } });
  useEffect(() => {
    if (vendors && user) {
      const v = vendors.find((v) => v.userId === user.id);
      if (v) setVendorId(v.id);
    }
  }, [vendors, user]);

  const createItem = useCreateMenuItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({ vendor_id: vendorId ?? undefined }) });
        navigate("/vendor/menu");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;
    createItem.mutate({
      data: {
        vendorId,
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        category: form.category,
        imageUrl: form.imageUrl || undefined,
        isAvailable: form.isAvailable,
      },
    });
  };

  return (
    <VendorLayout>
      <div className="px-4 md:px-8 pt-6 max-w-2xl">
        <button onClick={() => navigate("/vendor/menu")} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to menu
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-5">Add menu item</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: "name", label: "Item name *", placeholder: "e.g. Ugali + Beef Stew", type: "text", required: true },
            { key: "price", label: "Price (KES) *", placeholder: "e.g. 120", type: "number", required: true },
            { key: "description", label: "Description", placeholder: "Briefly describe the item", type: "text", required: false },
            { key: "imageUrl", label: "Image URL (optional)", placeholder: "https://...", type: "url", required: false },
          ].map(({ key, label, placeholder, type, required }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>
              <input
                type={type}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                required={required}
                min={type === "number" ? 1 : undefined}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between bg-white border border-border rounded-xl p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Available now</p>
              <p className="text-xs text-muted-foreground">Students can order this item</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })}
              className={`w-12 h-6 rounded-full transition-all relative ${form.isAvailable ? "bg-secondary" : "bg-muted"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${form.isAvailable ? "left-6" : "left-0.5"}`} />
            </button>
          </div>

          <button
            type="submit"
            disabled={createItem.isPending || !vendorId}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
          >
            {createItem.isPending ? "Adding..." : "Add to menu"}
          </button>
        </form>
      </div>
    </VendorLayout>
  );
}
