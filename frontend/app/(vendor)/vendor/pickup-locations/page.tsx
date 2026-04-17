"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { VendorDeliveryLocation, VendorDeliveryLocationRecommendation, VendorServiceArea } from "@/lib/types";

type DraftLocation = {
  serviceAreaId: number;
  label: string;
  location: string;
  isDefault: boolean;
};

const emptyDraft = (): DraftLocation => ({
  serviceAreaId: 0,
  label: "",
  location: "",
  isDefault: false
});

export default function VendorPickupLocationsPage() {
  const { profile } = useSession();
  const vendorId = profile?.vendorId;
  const [serviceAreas, setServiceAreas] = useState<VendorServiceArea[]>([]);
  const [locations, setLocations] = useState<VendorDeliveryLocation[]>([]);
  const [recommendations, setRecommendations] = useState<VendorDeliveryLocationRecommendation[]>([]);
  const [recommendationAreas, setRecommendationAreas] = useState<Record<number, number>>({});
  const [draft, setDraft] = useState<DraftLocation>(emptyDraft());
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [savingAreas, setSavingAreas] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [reviewingRecommendationId, setReviewingRecommendationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;

    const load = async () => {
      try {
        setError(null);
        const [nextAreas, nextLocations, nextRecommendations] = await Promise.all([
          client.vendorServiceAreas(vendorId),
          client.vendorDeliveryLocations(vendorId),
          client.vendorDeliveryLocationRecommendations(vendorId)
        ]);
        setServiceAreas(nextAreas);
        setLocations(nextLocations);
        setRecommendations(nextRecommendations);
        setRecommendationAreas((current) => {
          const next = { ...current };
          const defaultAreaId = nextAreas.find((area) => area.selected && area.is_active)?.id ?? 0;

          for (const recommendation of nextRecommendations) {
            if (next[recommendation.id]) continue;
            next[recommendation.id] = recommendation.service_area_id ?? defaultAreaId;
          }

          return next;
        });

        setDraft((current) => {
          if (current.serviceAreaId) {
            return current;
          }

          const defaultArea = nextAreas.find((area) => area.selected && area.is_active);
          if (!defaultArea) {
            return current;
          }

          return { ...current, serviceAreaId: defaultArea.id };
        });
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load delivery locations");
      }
    };

    load();
  }, [vendorId]);

  const selectedServiceAreaIds = useMemo(() => serviceAreas.filter((area) => area.selected).map((area) => area.id), [serviceAreas]);
  const activeServiceAreas = serviceAreas.filter((area) => area.is_active);
  const selectedAreas = activeServiceAreas.filter((area) => area.selected);

  const reloadDeliverySetup = async () => {
    if (!vendorId) return;

    const [nextLocations, nextRecommendations] = await Promise.all([
      client.vendorDeliveryLocations(vendorId),
      client.vendorDeliveryLocationRecommendations(vendorId)
    ]);

    setLocations(nextLocations);
    setRecommendations(nextRecommendations);
  };

  const toggleServiceArea = (serviceAreaId: number) => {
    setServiceAreas((current) => current.map((area) => (area.id === serviceAreaId ? { ...area, selected: !area.selected } : area)));
  };

  const saveServiceAreas = async () => {
    if (!vendorId) return;
    setSavingAreas(true);
    setError(null);
    setSuccess(null);

    try {
      const nextAreas = await client.updateVendorServiceAreas(vendorId, selectedServiceAreaIds);
      setServiceAreas(nextAreas);
      setSuccess("Service areas updated.");
      if (draft.serviceAreaId && !nextAreas.some((area) => area.id === draft.serviceAreaId && area.selected)) {
        setDraft((current) => ({ ...current, serviceAreaId: nextAreas.find((area) => area.selected)?.id ?? 0 }));
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update service areas");
    } finally {
      setSavingAreas(false);
    }
  };

  const resetDraft = () => {
    const nextAreaId = selectedAreas[0]?.id ?? 0;
    setDraft({ ...emptyDraft(), serviceAreaId: nextAreaId });
    setEditingLocationId(null);
  };

  const editLocation = (location: VendorDeliveryLocation) => {
    setDraft({
      serviceAreaId: location.service_area_id ?? 0,
      label: location.label,
      location: location.location,
      isDefault: location.is_default
    });
    setEditingLocationId(location.id);
  };

  const submitLocation = async () => {
    if (!vendorId || !draft.serviceAreaId || !draft.label.trim() || !draft.location.trim()) return;

    setSavingLocation(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingLocationId) {
        await client.updateVendorDeliveryLocation(editingLocationId, draft);
        setSuccess("Delivery location updated.");
      } else {
        await client.createVendorDeliveryLocation(vendorId, draft);
        setSuccess("Delivery location created.");
      }

      await reloadDeliverySetup();
      resetDraft();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save delivery location");
    } finally {
      setSavingLocation(false);
    }
  };

  const removeLocation = async (locationId: number) => {
    if (!vendorId) return;

    setSavingLocation(true);
    setError(null);
    setSuccess(null);

    try {
      await client.deleteVendorDeliveryLocation(locationId);
      await reloadDeliverySetup();
      if (editingLocationId === locationId) {
        resetDraft();
      }
      setSuccess("Delivery location removed.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete delivery location");
    } finally {
      setSavingLocation(false);
    }
  };

  if (!profile) {
    return null;
  }

  const acceptRecommendation = async (recommendationId: number) => {
    const selectedAreaId = recommendationAreas[recommendationId];
    if (!selectedAreaId) {
      setError("Select a service area before accepting this recommendation.");
      return;
    }

    setReviewingRecommendationId(recommendationId);
    setError(null);
    setSuccess(null);

    try {
      await client.acceptVendorDeliveryLocationRecommendation(recommendationId, selectedAreaId);
      await reloadDeliverySetup();
      setSuccess("Recommendation accepted and added to your delivery locations.");
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Failed to accept recommendation");
    } finally {
      setReviewingRecommendationId(null);
    }
  };

  const ignoreRecommendation = async (recommendationId: number) => {
    setReviewingRecommendationId(recommendationId);
    setError(null);
    setSuccess(null);

    try {
      await client.ignoreVendorDeliveryLocationRecommendation(recommendationId);
      await reloadDeliverySetup();
      setSuccess("Recommendation ignored.");
    } catch (ignoreError) {
      setError(ignoreError instanceof Error ? ignoreError.message : "Failed to ignore recommendation");
    } finally {
      setReviewingRecommendationId(null);
    }
  };

  return (
    <VendorLayout>
      <div className="space-y-4 px-4 py-4 md:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Vendor delivery setup</p>
              <h1 className="mt-1 text-xl font-black text-[#1F2937] md:text-2xl">Manage delivery locations</h1>
              <p className="mt-1 text-sm text-slate-600">Choose the admin-created service areas you serve, then add the delivery points students can use there.</p>
            </div>
            <div className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-semibold text-[#FF6B00]">
              {selectedAreas.length} service area{selectedAreas.length === 1 ? "" : "s"} selected
            </div>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">Service areas</h2>
                <p className="text-sm text-slate-500">Only active areas created by admin are shown here.</p>
              </div>
              <button
                type="button"
                onClick={saveServiceAreas}
                disabled={savingAreas}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FF6B00] px-3 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {savingAreas ? "Saving..." : "Save areas"}
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {activeServiceAreas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500 sm:col-span-2">
                  No service areas are available yet.
                </p>
              ) : (
                activeServiceAreas.map((area) => (
                  <button
                    type="button"
                    key={area.id}
                    onClick={() => toggleServiceArea(area.id)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      area.selected ? "border-[#FF6B00] bg-orange-50" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-bold text-[#1F2937]">{area.name}</span>
                      <span className="block text-xs text-slate-500">{area.selected ? "Selected for delivery" : "Not selected"}</span>
                    </span>
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${area.selected ? "bg-[#FF6B00] text-white" : "bg-slate-100 text-slate-400"}`}>
                      {area.selected ? <Check className="h-4 w-4" /> : null}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">Delivery point</h2>
                <p className="text-sm text-slate-500">Create one for each service area you serve.</p>
              </div>
              {editingLocationId ? (
                <button
                  type="button"
                  onClick={resetDraft}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-[#1F2937]">
                Service area
                <select
                  value={draft.serviceAreaId}
                  onChange={(event) => setDraft((current) => ({ ...current, serviceAreaId: Number(event.target.value) }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FF6B00]"
                >
                  <option value={0}>Select a service area</option>
                  {selectedAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-[#1F2937]">
                Pickup label
                <input
                  value={draft.label}
                  onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Main gate, Hostel point, etc."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FF6B00]"
                />
              </label>

              <label className="block text-sm font-semibold text-[#1F2937]">
                Location details
                <textarea
                  value={draft.location}
                  onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Street, landmark, or delivery instructions"
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FF6B00]"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
                <input
                  type="checkbox"
                  checked={draft.isDefault}
                  onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                />
                Default delivery location
              </label>

              <button
                type="button"
                onClick={submitLocation}
                disabled={savingLocation || !draft.serviceAreaId || !draft.label.trim() || !draft.location.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {editingLocationId ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {savingLocation ? "Saving..." : editingLocationId ? "Update delivery location" : "Create delivery location"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#1F2937]">Your delivery locations</h2>
              <p className="text-sm text-slate-500">These appear to students when they order from your selected service areas.</p>
            </div>
            <div className="text-sm font-semibold text-slate-500">{locations.length} location{locations.length === 1 ? "" : "s"}</div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {locations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 lg:col-span-2">
                No delivery locations created yet.
              </p>
            ) : (
              locations.map((location) => (
                <article key={location.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#1F2937]">{location.label}</p>
                      <p className="text-xs text-slate-500">{location.service_area_name ?? "Service area"}</p>
                    </div>
                    {location.is_default ? <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B00]">Default</span> : null}
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{location.location}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editLocation(location)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLocation(location.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#1F2937]">Suggested from student "Other" places</h2>
              <p className="text-sm text-slate-500">Accept to add as a delivery location, or ignore to hide from this list.</p>
            </div>
            <div className="text-sm font-semibold text-slate-500">{recommendations.length} pending</div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {recommendations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 lg:col-span-2">
                No pending recommendations right now.
              </p>
            ) : (
              recommendations.map((recommendation) => (
                <article key={recommendation.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#1F2937]">{recommendation.place_name}</p>
                      <p className="text-xs text-slate-500">Order suggestion #{recommendation.source_order_id ?? "-"}</p>
                    </div>
                    {recommendation.service_area_name ? (
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B00]">
                        {recommendation.service_area_name}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{recommendation.place_details}</p>

                  <div className="mt-3">
                    <label className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Delivery service area</label>
                    <select
                      value={recommendationAreas[recommendation.id] ?? ""}
                      onChange={(event) =>
                        setRecommendationAreas((current) => ({
                          ...current,
                          [recommendation.id]: Number(event.target.value)
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FF6B00]"
                    >
                      <option value="">Select service area</option>
                      {selectedAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => acceptRecommendation(recommendation.id)}
                      disabled={reviewingRecommendationId === recommendation.id || selectedAreas.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6B00] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#e35e00] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Check className="h-4 w-4" />
                      {reviewingRecommendationId === recommendation.id ? "Saving..." : "Accept"}
                    </button>
                    <button
                      type="button"
                      onClick={() => ignoreRecommendation(recommendation.id)}
                      disabled={reviewingRecommendationId === recommendation.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Ignore
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </VendorLayout>
  );
}