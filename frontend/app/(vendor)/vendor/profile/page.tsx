"use client";

import { FormEvent, useEffect, useState } from "react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { VendorBusinessProfile } from "@/lib/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function VendorProfilePage() {
  const { profile, refreshProfile } = useSession();
  const [business, setBusiness] = useState<VendorBusinessProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    stallName: "",
    description: "",
    mpesaNumber: "",
    location: "",
    pickupTimeMin: "10",
    pickupTimeMax: "15"
  });

  const validate = () => {
    const ownerName = draft.ownerName.trim();
    const ownerEmail = draft.ownerEmail.trim();
    const ownerPhone = draft.ownerPhone.trim();
    const stallName = draft.stallName.trim();
    const mpesaNumber = draft.mpesaNumber.trim();
    const minTime = Number(draft.pickupTimeMin);
    const maxTime = Number(draft.pickupTimeMax);

    if (ownerName.length < 2) return "Owner name must be at least 2 characters";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return "Enter a valid owner email address";
    if (ownerPhone && !/^(?:\+?254|0)?7\d{8}$/.test(ownerPhone.replace(/\s+/g, ""))) {
      return "Enter a valid business phone number";
    }
    if (stallName.length < 2) return "Business name must be at least 2 characters";
    if (!/^(?:\+?254|0)?[17]\d{8}$/.test(mpesaNumber.replace(/\s+/g, ""))) {
      return "Enter a valid M-Pesa number";
    }
    if (!Number.isFinite(minTime) || minTime < 5) return "Fastest pickup time must be at least 5 minutes";
    if (!Number.isFinite(maxTime) || maxTime < 5) return "Longest pickup time must be at least 5 minutes";
    if (minTime > maxTime) return "Fastest pickup time cannot be greater than longest pickup time";

    return null;
  };

  useEffect(() => {
    if (!profile?.vendorId) return;
    client.vendorProfile(profile.vendorId).then(setBusiness).catch(() => setBusiness(null));
  }, [profile?.vendorId]);

  useEffect(() => {
    if (!business) return;
    if (editing) return;
    setDraft({
      ownerName: business.owner_name ?? "",
      ownerEmail: business.owner_email ?? "",
      ownerPhone: business.owner_phone ?? "",
      stallName: business.stall_name ?? "",
      description: business.description ?? "",
      mpesaNumber: business.mpesa_number ?? "",
      location: business.location ?? "",
      pickupTimeMin: String(business.pickup_time_min ?? 10),
      pickupTimeMax: String(business.pickup_time_max ?? 15)
    });
  }, [business, editing]);

  const hasChanges =
    editing &&
    business
      ? draft.ownerName.trim() !== (business.owner_name ?? "") ||
        draft.ownerEmail.trim() !== (business.owner_email ?? "") ||
        draft.ownerPhone.trim() !== (business.owner_phone ?? "") ||
        draft.stallName.trim() !== (business.stall_name ?? "") ||
        draft.description.trim() !== (business.description ?? "") ||
        draft.mpesaNumber.trim() !== (business.mpesa_number ?? "") ||
        draft.location.trim() !== (business.location ?? "") ||
        draft.pickupTimeMin !== String(business.pickup_time_min ?? 10) ||
        draft.pickupTimeMax !== String(business.pickup_time_max ?? 15)
      : false;

  useEffect(() => {
    if (!success && !error) return;
    const timer = setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [success, error]);

  if (!profile) return null;

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile.vendorId) return;
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const next = await client.updateVendorProfile(profile.vendorId, {
        ownerName: draft.ownerName,
        ownerEmail: draft.ownerEmail,
        ownerPhone: draft.ownerPhone,
        stallName: draft.stallName,
        description: draft.description,
        mpesaNumber: draft.mpesaNumber,
        location: draft.location,
        pickupTimeMin: Number(draft.pickupTimeMin),
        pickupTimeMax: Number(draft.pickupTimeMax)
      });
      setBusiness(next);
      await refreshProfile();
      setSuccess("Profile updated successfully");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormFromBusiness = () => {
    setDraft({
      ownerName: business?.owner_name ?? profile.name ?? "",
      ownerEmail: business?.owner_email ?? profile.email ?? "",
      ownerPhone: business?.owner_phone ?? profile.phone ?? "",
      stallName: business?.stall_name ?? "",
      description: business?.description ?? "",
      mpesaNumber: business?.mpesa_number ?? "",
      location: business?.location ?? "",
      pickupTimeMin: String(business?.pickup_time_min ?? 10),
      pickupTimeMax: String(business?.pickup_time_max ?? 15)
    });
  };

  return (
    <VendorLayout>
      <div className="px-4 pt-4 md:px-6 lg:px-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground">Vendor account and business details</p>
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

        <form onSubmit={handleSave} className="space-y-2">
          {editing ? (
            <>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">Owner name</label>
                <input
                  value={draft.ownerName}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, ownerName: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-foreground outline-none"
                  required
                />
              </div>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">Owner email</label>
                <input
                  type="email"
                  value={draft.ownerEmail}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, ownerEmail: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-foreground outline-none"
                  required
                />
              </div>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">Business phone</label>
                <input
                  value={draft.ownerPhone}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, ownerPhone: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-foreground outline-none"
                  placeholder="07XX XXX XXX"
                />
              </div>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">Business name</label>
                <input
                  value={draft.stallName}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, stallName: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-foreground outline-none"
                  required
                />
              </div>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">Business location</label>
                <input
                  value={draft.location}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, location: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-foreground outline-none"
                />
              </div>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">Business description</label>
                <textarea
                  value={draft.description}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, description: event.target.value }));
                  }}
                  className="w-full resize-none text-sm font-semibold text-foreground outline-none"
                  rows={2}
                />
              </div>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">M-Pesa number</label>
                <input
                  value={draft.mpesaNumber}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, mpesaNumber: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-foreground outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-white px-4 py-3">
                  <label className="mb-1 block text-sm text-muted-foreground">Fastest pickup (mins)</label>
                  <input
                    type="number"
                    min={5}
                    value={draft.pickupTimeMin}
                    onChange={(event) => {
                      setError(null);
                      setSuccess(null);
                      setDraft((c) => ({ ...c, pickupTimeMin: event.target.value }));
                    }}
                    className="w-full text-sm font-semibold text-foreground outline-none"
                  />
                </div>
                <div className="rounded-xl border border-border bg-white px-4 py-3">
                  <label className="mb-1 block text-sm text-muted-foreground">Longest pickup (mins)</label>
                  <input
                    type="number"
                    min={5}
                    value={draft.pickupTimeMax}
                    onChange={(event) => {
                      setError(null);
                      setSuccess(null);
                      setDraft((c) => ({ ...c, pickupTimeMax: event.target.value }));
                    }}
                    className="w-full text-sm font-semibold text-foreground outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <Row label="Full name" value={profile.name} />
              <Row label="Email" value={profile.email} />
              <Row label="Business phone" value={business?.owner_phone ?? profile.phone ?? "-"} />
              <Row label="Business name" value={business?.stall_name ?? "-"} />
              <Row label="Business location" value={business?.location ?? "-"} />
              <Row label="Business description" value={business?.description ?? "-"} />
              <Row label="M-Pesa number" value={business?.mpesa_number ?? "-"} />
              <Row label="Pickup estimate" value={business ? `${business.pickup_time_min}-${business.pickup_time_max} mins` : "-"} />
              <Row label="Business status" value={business ? (business.is_active ? "Active" : "Paused") : "-"} />
              <Row label="Role" value={profile.role} />
              <Row label="Account ID" value={profile.publicId ?? "-"} />
              <Row label="Vendor ID" value={String(business?.id ?? profile.vendorId ?? "-")} />
            </>
          )}

          {editing ? <p className="text-xs text-muted-foreground px-1">Role, Account ID, and Vendor ID are read-only.</p> : null}

          <div className="pt-2 flex gap-2">
            {editing ? (
              <>
                <button type="submit" disabled={submitting || !hasChanges} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  {submitting ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    setSuccess(null);
                    resetFormFromBusiness();
                  }}
                  className="flex-1 rounded-xl border border-border bg-white py-2.5 text-sm font-bold text-foreground"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setError(null);
                  setSuccess(null);
                  resetFormFromBusiness();
                }}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white"
              >
                Edit profile
              </button>
            )}
          </div>
        </form>
      </div>
    </VendorLayout>
  );
}
