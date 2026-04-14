"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { MenuItemRecord } from "@/lib/types";
import { formatKES } from "@/lib/utils";

type MenuFormState = {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
};

const emptyForm: MenuFormState = {
  name: "",
  description: "",
  price: "",
  category: "Quick Lunch",
  imageUrl: ""
};

export default function VendorMenuPage() {
  const { profile } = useSession();
  const vendorId = profile?.vendorId;
  const [menu, setMenu] = useState<MenuItemRecord[]>([]);
  const [form, setForm] = useState<MenuFormState>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vendorId) client.vendorMenu(vendorId).then(setMenu);
  }, [vendorId]);

  const editingItem = useMemo(() => menu.find((item) => item.id === editId) ?? null, [editId, menu]);

  const reload = async () => {
    if (vendorId) setMenu(await client.vendorMenu(vendorId));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setPreview(null);
    setEditId(null);
  };

  const uploadImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((current) => ({ ...current, imageUrl: result }));
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const startEdit = (item: MenuItemRecord) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      category: item.category,
      imageUrl: item.image_url ?? ""
    });
    setPreview(item.image_url ?? null);
  };

  const submitForm = async () => {
    if (!vendorId) return;
    setLoading(true);

    try {
      if (editId) {
        await client.updateMenuItem(editId, {
          name: form.name,
          description: form.description,
          price: form.price,
          category: form.category,
          imageUrl: form.imageUrl,
          isAvailable: editingItem?.is_available ?? true
        });
      } else {
        await client.createMenuItem(vendorId, {
          name: form.name,
          description: form.description,
          price: form.price,
          category: form.category,
          imageUrl: form.imageUrl
        });
      }

      resetForm();
      await reload();
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <VendorLayout>
      <div className="bg-[#F8FAFC] px-4 pt-4 space-y-4 md:px-6 lg:px-8" style={{ fontFamily: "Inter, 'Source Sans 3', system-ui, sans-serif" }}>
        <div>
          <h1 className="mb-1 text-lg font-bold text-[#1F2937] md:text-xl">Menu</h1>
          <p className="text-xs text-slate-500 md:text-sm">Manage your live catalog and pricing for student orders.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-4 lg:sticky lg:top-20">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-600">
              {editId ? "Edit Menu Item" : "Add Menu Item"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Food name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Price</label>
                  <input
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Category</label>
                  <input
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Food image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadImageFile}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-500">Upload an image file. It will be stored with the item.</p>
              </div>

              {preview ? (
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <img src={preview} alt="Food preview" className="h-36 w-full object-cover" />
                </div>
              ) : null}
            </div>
            <button
              onClick={submitForm}
              disabled={loading}
              className="mt-3 w-full rounded-md bg-primary py-2.5 text-sm font-bold text-white"
            >
              {loading ? "Saving..." : editId ? "Save changes" : "Add item"}
            </button>
            {editId ? (
              <button
                type="button"
                onClick={() => resetForm()}
                className="mt-2 w-full rounded-md border border-slate-200 bg-white py-2.5 text-sm font-bold text-[#1F2937]"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="space-y-2 lg:col-span-8">
            <div className="hidden grid-cols-[minmax(0,1.2fr)_110px_120px_220px] gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 md:grid">
              <span>Item</span>
              <span>Category</span>
              <span>Price</span>
              <span className="text-right">Actions</span>
            </div>

            {menu.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                <p className="text-sm font-semibold text-[#1F2937]">No menu items yet</p>
                <p className="mt-1 text-xs text-slate-500">Add your first item from the panel to start receiving orders.</p>
              </div>
            ) : null}

            {menu.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 bg-white p-4 md:grid md:grid-cols-[minmax(0,1.2fr)_110px_120px_220px] md:items-center md:gap-3">
                <div className="mb-2 md:mb-0">
                  <p className="text-sm font-bold text-[#1F2937]">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.description || "No description"}</p>
                  <p className="mt-1 text-[11px] text-slate-500 md:hidden">{item.category}</p>
                </div>

                <p className="hidden text-sm font-medium text-slate-600 md:block">{item.category}</p>

                <div className="mb-2 md:mb-0">
                  <p className="text-sm font-bold text-primary">{formatKES(item.price)}</p>
                  <p className="text-[11px] text-slate-500">{item.is_available ? "Published" : "Unpublished"}</p>
                </div>

                <div className="flex gap-2 md:justify-end">
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      await client.updateMenuItem(item.id, {
                        isAvailable: !item.is_available,
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        category: item.category,
                        imageUrl: item.image_url
                      });
                      await reload();
                    }}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    {item.is_available ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={async () => {
                      await client.deleteMenuItem(item.id);
                      await reload();
                    }}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </VendorLayout>
  );
}
