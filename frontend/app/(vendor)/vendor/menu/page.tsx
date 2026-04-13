"use client";

import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { MenuItemRecord } from "@/lib/types";
import { formatKES } from "@/lib/utils";

export default function VendorMenuPage() {
  const { profile } = useSession();
  const [menu, setMenu] = useState<MenuItemRecord[]>([]);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "Quick Lunch", imageUrl: "" });

  useEffect(() => {
    if (profile.vendorId) client.vendorMenu(profile.vendorId).then(setMenu);
  }, [profile.vendorId]);

  const reload = async () => {
    if (profile.vendorId) setMenu(await client.vendorMenu(profile.vendorId));
  };

  return (
    <VendorLayout>
      <div className="px-4 pt-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Menu</h1>
          <p className="text-sm text-muted-foreground">Add, edit, and control what students see in the marketplace.</p>
        </div>

        <div className="bg-white rounded-xl border border-border p-4 space-y-3">
          <h2 className="font-semibold text-foreground">Add a menu item</h2>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Meal name" className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none" />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Short description" className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Price" className="border border-border rounded-lg px-3 py-2 text-sm outline-none" />
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" className="border border-border rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="Image URL" className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none" />
          <button
            onClick={async () => {
              if (!profile.vendorId) return;
              await client.createMenuItem(profile.vendorId, {
                name: form.name,
                description: form.description,
                price: form.price,
                category: form.category,
                imageUrl: form.imageUrl
              });
              setForm({ name: "", description: "", price: "", category: "Quick Lunch", imageUrl: "" });
              await reload();
            }}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold"
          >
            Add item
          </button>
        </div>

        <div className="space-y-3">
          {menu.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatKES(item.price)}</p>
                  <p className="text-[11px] text-muted-foreground">{item.is_available ? "Available" : "Hidden"}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={async () => {
                    await client.updateMenuItem(item.id, { isAvailable: !item.is_available });
                    await reload();
                  }}
                  className="flex-1 border border-border rounded-lg py-2 text-xs font-semibold"
                >
                  {item.is_available ? "Hide" : "Show"}
                </button>
                <button
                  onClick={async () => {
                    await client.deleteMenuItem(item.id);
                    await reload();
                  }}
                  className="flex-1 bg-red-50 text-red-700 rounded-lg py-2 text-xs font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </VendorLayout>
  );
}
