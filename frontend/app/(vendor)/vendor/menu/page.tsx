"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { uploadCompressedImage } from "@/lib/storageUpload";
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
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;

    client
      .vendorMenu(vendorId)
      .then((items) => {
        setMenu(items);
        setErrorMessage(null);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Failed to fetch menu items");
      });
  }, [vendorId]);

  const editingItem = useMemo(() => menu.find((item) => item.id === editId) ?? null, [editId, menu]);

  const reload = async () => {
    if (!vendorId) return;
    const items = await client.vendorMenu(vendorId);
    setMenu(items);
    setErrorMessage(null);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setPreview(null);
    setLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setEditId(null);
  };

  const uploadImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!vendorId) {
      setErrorMessage("Vendor account is not available for upload");
      return;
    }

    const immediatePreview = URL.createObjectURL(file);
    setLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return immediatePreview;
    });

    setUploadingImage(true);
    setErrorMessage(null);

    try {
      const uploaded = await uploadCompressedImage(file, "menu-items", String(vendorId));
      setForm((current) => ({ ...current, imageUrl: uploaded.url }));
      setPreview(uploaded.url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
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
    setLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setPreview(item.image_url ?? null);
  };

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const submitForm = async () => {
    if (!vendorId) return;
    setLoading(true);
    setErrorMessage(null);

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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save menu item");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <VendorLayout>
      <div className="bg-[#F8FAFC] px-4 pb-6 pt-4 space-y-4 md:px-6 lg:px-8" style={{ fontFamily: "Inter, 'Source Sans 3', system-ui, sans-serif" }}>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  disabled={uploadingImage}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {uploadingImage ? "Compressing and uploading image..." : "Images are automatically compressed before upload to save storage."}
                </p>
              </div>

              {localPreview ? (
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <img src={localPreview} alt="Food local preview" className="h-36 w-full object-cover" />
                </div>
              ) : null}

              {preview ? (
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <img src={preview} alt="Food preview" className="h-36 w-full object-cover" />
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:items-center">
              <button
                onClick={submitForm}
                disabled={loading || uploadingImage}
                className="w-full rounded-md bg-primary py-2.5 text-sm font-bold text-white sm:w-[220px]"
              >
                {uploadingImage ? "Uploading image..." : loading ? "Saving..." : editId ? "Save changes" : "Add item"}
              </button>
              {editId ? (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="w-full rounded-md border border-slate-200 bg-white py-2.5 text-sm font-bold text-[#1F2937] sm:w-[220px]"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 lg:col-span-8">
            {errorMessage ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}

            {menu.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                <p className="text-sm font-semibold text-[#1F2937]">No menu items yet</p>
                <p className="mt-1 text-xs text-slate-500">Add your first item from the panel to start receiving orders.</p>
              </div>
            ) : null}

            {menu.length > 0 ? (
              <>
                <div className="space-y-3 md:hidden">
                  {menu.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-start gap-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
                            onError={(event) => {
                              event.currentTarget.src = "/favicon.png";
                            }}
                          />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-md border border-slate-200 bg-slate-100" aria-hidden="true" />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#1F2937]">{item.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{item.description || "No description"}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Category</p>
                          <p className="text-sm font-semibold text-slate-700">{item.category}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Price</p>
                          <p className="text-sm font-bold text-primary">{formatKES(item.price)}</p>
                          <p className="text-[11px] text-slate-500">{item.is_available ? "Published" : "Unpublished"}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-md border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              setErrorMessage(null);
                              await client.updateMenuItem(item.id, {
                                isAvailable: !item.is_available,
                                name: item.name,
                                description: item.description,
                                price: item.price,
                                category: item.category,
                                imageUrl: item.image_url
                              });
                              await reload();
                            } catch (error) {
                              setErrorMessage(error instanceof Error ? error.message : "Failed to update menu item");
                            }
                          }}
                          className="rounded-md border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700"
                        >
                          {item.is_available ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              setErrorMessage(null);
                              await client.deleteMenuItem(item.id);
                              await reload();
                            } catch (error) {
                              setErrorMessage(error instanceof Error ? error.message : "Failed to delete menu item");
                            }
                          }}
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-xs font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto rounded-md border border-slate-200 bg-white [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] md:block">
                  <div className="min-w-[780px] lg:min-w-[860px]">
                    <div className="grid grid-cols-[84px_minmax(230px,1.2fr)_110px_120px_220px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 lg:grid-cols-[90px_minmax(260px,1.2fr)_130px_140px_240px]">
                      <span>Image</span>
                      <span>Item</span>
                      <span>Category</span>
                      <span>Price</span>
                      <span className="text-right">Actions</span>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {menu.map((item) => (
                        <div key={item.id} className="grid grid-cols-[84px_minmax(230px,1.2fr)_110px_120px_220px] items-center gap-3 px-4 py-3 lg:grid-cols-[90px_minmax(260px,1.2fr)_130px_140px_240px]">
                          <div>
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-12 w-12 rounded-md border border-slate-200 object-cover"
                                onError={(event) => {
                                  event.currentTarget.src = "/favicon.png";
                                }}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-md border border-slate-200 bg-slate-100" aria-hidden="true" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#1F2937]">{item.name}</p>
                            <p className="truncate text-xs text-slate-500">{item.description || "No description"}</p>
                          </div>

                          <p className="text-sm font-medium text-slate-600">{item.category}</p>

                          <div>
                            <p className="text-sm font-bold text-primary">{formatKES(item.price)}</p>
                            <p className="text-[11px] text-slate-500">{item.is_available ? "Published" : "Unpublished"}</p>
                          </div>

                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="rounded-md border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 md:px-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  setErrorMessage(null);
                                  await client.updateMenuItem(item.id, {
                                    isAvailable: !item.is_available,
                                    name: item.name,
                                    description: item.description,
                                    price: item.price,
                                    category: item.category,
                                    imageUrl: item.image_url
                                  });
                                  await reload();
                                } catch (error) {
                                  setErrorMessage(error instanceof Error ? error.message : "Failed to update menu item");
                                }
                              }}
                              className="rounded-md border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 md:px-3"
                            >
                              {item.is_available ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  setErrorMessage(null);
                                  await client.deleteMenuItem(item.id);
                                  await reload();
                                } catch (error) {
                                  setErrorMessage(error instanceof Error ? error.message : "Failed to delete menu item");
                                }
                              }}
                              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 md:px-3"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </VendorLayout>
  );
}
