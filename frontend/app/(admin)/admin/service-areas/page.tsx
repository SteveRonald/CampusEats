"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { ServiceArea } from "@/lib/types";

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string | null | undefined, query: string): ReactNode {
  const value = text ?? "";
  const trimmed = query.trim();
  if (!value || !trimmed) return value;

  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, "ig");
  const parts = value.split(pattern);

  return parts.map((part, index) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-100 px-0.5 text-[#1F2937]">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

export default function AdminServiceAreasPage() {
  const [items, setItems] = useState<ServiceArea[]>([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | "create" | null>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleItems = items.filter((item) => {
    if (!normalizedSearch) return true;
    const statusLabel = item.is_active ? "active" : "inactive";
    const haystack = `${item.id} ${item.name} ${statusLabel}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  const load = async () => {
    try {
      setError(null);
      const data = await client.adminServiceAreas();
      setItems(data);
      setDrafts(Object.fromEntries(data.map((item) => [item.id, item.name])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load service areas");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSavingId("create");
    try {
      await client.createServiceArea(name.trim());
      setName("");
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create service area");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="pt-4 px-4 md:px-6 lg:px-8 space-y-4">
        <div>
          <h1 className="text-xl font-black text-[#1F2937] md:text-2xl">Service Areas</h1>
          <p className="text-sm text-slate-500">Manage delivery areas used to filter vendors during checkout.</p>
        </div>

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <label className="block text-sm font-semibold text-[#1F2937]">Add service area</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Kesses Town"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleCreate}
              disabled={savingId === "create"}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {savingId === "create" ? "Saving..." : "Add area"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="mb-1 block text-sm font-semibold text-[#1F2937]">Search service areas</label>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by area name, id, or status"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-3">
          {visibleItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Area name</label>
                  <input
                    value={drafts[item.id] ?? item.name}
                    onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {normalizedSearch ? <p className="mt-1 text-xs text-slate-500">ID: {highlightMatch(String(item.id), normalizedSearch)} | Name: {highlightMatch(item.name, normalizedSearch)}</p> : null}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    onClick={async () => {
                      setSavingId(item.id);
                      try {
                        await client.updateServiceArea(item.id, { name: drafts[item.id] ?? item.name, isActive: !item.is_active });
                        await load();
                      } catch (updateError) {
                        setError(updateError instanceof Error ? updateError.message : "Failed to update service area");
                      } finally {
                        setSavingId(null);
                      }
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-[#1F2937]"
                  >
                    {savingId === item.id ? "Saving..." : item.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={async () => {
                      setSavingId(item.id);
                      try {
                        await client.updateServiceArea(item.id, { name: drafts[item.id] ?? item.name, isActive: item.is_active });
                        await load();
                      } catch (updateError) {
                        setError(updateError instanceof Error ? updateError.message : "Failed to update service area");
                      } finally {
                        setSavingId(null);
                      }
                    }}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white"
                  >
                    Save name
                  </button>
                  <button
                    onClick={async () => {
                      setSavingId(item.id);
                      try {
                        await client.deleteServiceArea(item.id);
                        await load();
                      } catch (deleteError) {
                        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete service area");
                      } finally {
                        setSavingId(null);
                      }
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
