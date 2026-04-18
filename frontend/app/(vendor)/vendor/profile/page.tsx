"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { uploadCompressedImage } from "@/lib/storageUpload";
import { VendorBusinessProfile } from "@/lib/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-[#1F2937]">{value}</span>
    </div>
  );
}

export default function VendorProfilePage() {
  const { profile, refreshProfile } = useSession();
  const [business, setBusiness] = useState<VendorBusinessProfile | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [logoLocalPreview, setLogoLocalPreview] = useState<string | null>(null);
  const [proofLocalPreview, setProofLocalPreview] = useState<string | null>(null);
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
    imageUrl: "",
    locationProofImageUrl: "",
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
    if (draft.imageUrl.trim()) {
      try {
        new URL(draft.imageUrl.trim());
      } catch (_error) {
        return "Enter a valid logo image URL";
      }
    }
    if (draft.locationProofImageUrl.trim()) {
      try {
        new URL(draft.locationProofImageUrl.trim());
      } catch (_error) {
        return "Enter a valid location proof image URL";
      }
    }
    if (!Number.isFinite(minTime) || minTime < 5) return "Fastest pickup time must be at least 5 minutes";
    if (!Number.isFinite(maxTime) || maxTime < 5) return "Longest pickup time must be at least 5 minutes";
    if (minTime > maxTime) return "Fastest pickup time cannot be greater than longest pickup time";

    return null;
  };

  useEffect(() => {
    if (!profile?.vendorId) {
      setLoadingBusiness(false);
      return;
    }

    setLoadingBusiness(true);
    client
      .vendorProfile(profile.vendorId)
      .then(setBusiness)
      .catch(() => setBusiness(null))
      .finally(() => setLoadingBusiness(false));
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
      imageUrl: business.image_url ?? "",
      locationProofImageUrl: business.location_proof_image_url ?? "",
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
        draft.imageUrl.trim() !== (business.image_url ?? "") ||
        draft.locationProofImageUrl.trim() !== (business.location_proof_image_url ?? "") ||
        draft.pickupTimeMin !== String(business.pickup_time_min ?? 10) ||
        draft.pickupTimeMax !== String(business.pickup_time_max ?? 15)
      : false;

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [success]);

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
        imageUrl: draft.imageUrl,
        locationProofImageUrl: draft.locationProofImageUrl,
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

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.vendorId) return;

    const localPreview = URL.createObjectURL(file);
    setLogoLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return localPreview;
    });

    setUploadingLogo(true);
    setError(null);
    setSuccess(null);

    try {
      const uploaded = await uploadCompressedImage(file, "vendor-logos", String(profile.vendorId));
      setDraft((current) => ({ ...current, imageUrl: uploaded.url }));
      setSuccess("Logo uploaded. Save changes to apply.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload logo image");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleProofUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.vendorId) return;

    const localPreview = URL.createObjectURL(file);
    setProofLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return localPreview;
    });

    setUploadingProof(true);
    setError(null);
    setSuccess(null);

    try {
      const uploaded = await uploadCompressedImage(file, "vendor-location-proof", String(profile.vendorId));
      setDraft((current) => ({ ...current, locationProofImageUrl: uploaded.url }));
      setSuccess("Location proof uploaded. Save changes to apply.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload location proof image");
    } finally {
      setUploadingProof(false);
    }
  };

  useEffect(() => {
    return () => {
      if (logoLocalPreview) URL.revokeObjectURL(logoLocalPreview);
      if (proofLocalPreview) URL.revokeObjectURL(proofLocalPreview);
    };
  }, [logoLocalPreview, proofLocalPreview]);

  const resetFormFromBusiness = () => {
    setDraft({
      ownerName: business?.owner_name ?? profile.name ?? "",
      ownerEmail: business?.owner_email ?? profile.email ?? "",
      ownerPhone: business?.owner_phone ?? profile.phone ?? "",
      stallName: business?.stall_name ?? "",
      description: business?.description ?? "",
      mpesaNumber: business?.mpesa_number ?? "",
      location: business?.location ?? "",
      imageUrl: business?.image_url ?? "",
      locationProofImageUrl: business?.location_proof_image_url ?? "",
      pickupTimeMin: String(business?.pickup_time_min ?? 10),
      pickupTimeMax: String(business?.pickup_time_max ?? 15)
    });
  };

  const verificationStatusLabel = loadingBusiness
    ? "Checking..."
    : business?.verification_status === "approved"
      ? "Approved"
      : business?.verification_status === "rejected"
        ? "Rejected"
        : "Pending review";

  const verificationStatusClass = loadingBusiness
    ? "border-slate-200 bg-slate-50 text-slate-600"
    : business?.verification_status === "approved"
      ? "border-green-200 bg-green-50 text-green-700"
      : business?.verification_status === "rejected"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-800";
  const logoPreviewSrc = logoLocalPreview ?? draft.imageUrl ?? null;
  const proofPreviewSrc = proofLocalPreview ?? draft.locationProofImageUrl ?? null;

  if (!profile) return null;

  return (
    <VendorLayout>
      <div className="bg-[#F8FAFC] px-4 pt-4 md:px-6 lg:px-8 space-y-4" style={{ fontFamily: "Inter, 'Source Sans 3', system-ui, sans-serif" }}>
        <div>
          <h1 className="text-lg font-bold text-[#1F2937] md:text-xl">Business Profile</h1>
          <p className="text-xs text-slate-500 md:text-sm">Keep vendor identity, payout, and pickup details up to date.</p>
        </div>

        <div className={`rounded-md border px-3 py-2 text-sm font-semibold ${verificationStatusClass}`}>
          Verification status: {verificationStatusLabel}
          {business?.verification_notes ? <p className="mt-1 text-xs font-medium">Admin note: {business.verification_notes}</p> : null}
        </div>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

        <form onSubmit={handleSave} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          {editing ? (
            <>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Owner name</label>
                <input
                  value={draft.ownerName}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, ownerName: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                  required
                />
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Owner email</label>
                <input
                  type="email"
                  value={draft.ownerEmail}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, ownerEmail: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                  required
                />
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Business phone</label>
                <input
                  value={draft.ownerPhone}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, ownerPhone: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                  placeholder="07XX XXX XXX"
                />
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Business name</label>
                <input
                  value={draft.stallName}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, stallName: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                  required
                />
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Business location</label>
                <input
                  value={draft.location}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, location: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                />
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Business description</label>
                <textarea
                  value={draft.description}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, description: event.target.value }));
                  }}
                  className="w-full resize-none text-sm font-semibold text-[#1F2937] outline-none"
                  rows={2}
                />
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Business logo image URL</label>
                <input
                  type="url"
                  value={draft.imageUrl}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, imageUrl: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                  placeholder="https://..."
                />
                {business?.image_url ? (
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">Current logo is saved. Leaving this blank keeps the existing image.</p>
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {uploadingLogo ? "Compressing and uploading logo..." : "Auto-compressed upload to Supabase storage."}
                </p>
                {logoPreviewSrc ? (
                  <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
                    <img src={logoPreviewSrc} alt="Business logo preview" className="h-24 w-24 object-cover" />
                  </div>
                ) : null}
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Location proof image URL</label>
                <input
                  type="url"
                  value={draft.locationProofImageUrl}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, locationProofImageUrl: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                  placeholder="https://..."
                />
                {business?.location_proof_image_url ? (
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">Current location proof is locked in records. Leaving this blank keeps the existing image.</p>
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  disabled={uploadingProof}
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {uploadingProof
                    ? "Compressing and uploading location proof..."
                    : "Used by admin to verify your location before account approval. Auto-compressed before upload. Clearing this field keeps your existing proof image."}
                </p>
                {proofPreviewSrc ? (
                  <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
                    <img src={proofPreviewSrc} alt="Location proof preview" className="h-36 w-full object-cover" />
                  </div>
                ) : null}
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">M-Pesa number</label>
                <input
                  value={draft.mpesaNumber}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((c) => ({ ...c, mpesaNumber: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Fastest pickup (mins)</label>
                  <input
                    type="number"
                    min={5}
                    value={draft.pickupTimeMin}
                    onChange={(event) => {
                      setError(null);
                      setSuccess(null);
                      setDraft((c) => ({ ...c, pickupTimeMin: event.target.value }));
                    }}
                    className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                  />
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Longest pickup (mins)</label>
                  <input
                    type="number"
                    min={5}
                    value={draft.pickupTimeMax}
                    onChange={(event) => {
                      setError(null);
                      setSuccess(null);
                      setDraft((c) => ({ ...c, pickupTimeMax: event.target.value }));
                    }}
                    className="w-full text-sm font-semibold text-[#1F2937] outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {business?.image_url ? (
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Business logo</p>
                  <img src={business.image_url} alt="Business logo" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
                </div>
              ) : null}
              {business?.location_proof_image_url ? (
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Location proof image</p>
                  <img src={business.location_proof_image_url} alt="Location proof" className="h-36 w-full rounded-lg border border-slate-200 object-cover" />
                </div>
              ) : null}
              <Row label="Full name" value={profile.name} />
              <Row label="Email" value={profile.email} />
              <Row label="Business phone" value={business?.owner_phone ?? profile.phone ?? "-"} />
              <Row label="Business name" value={business?.stall_name ?? "-"} />
              <Row label="Business location" value={business?.location ?? "-"} />
              <Row label="Business description" value={business?.description ?? "-"} />
              <Row label="M-Pesa number" value={business?.mpesa_number ?? "-"} />
              <Row label="Pickup estimate" value={business ? `${business.pickup_time_min}-${business.pickup_time_max} mins` : "-"} />
              <Row label="Verification" value={verificationStatusLabel} />
              <Row label="Business status" value={business ? (business.is_active ? "Active" : "Paused") : "-"} />
              <Row label="Role" value={profile.role} />
              <Row label="Account ID" value={profile.publicId ?? "-"} />
            </>
          )}

          {editing ? <p className="px-1 text-xs text-slate-500">Role and Account ID are read-only.</p> : null}

          <div className="pt-2 flex gap-2">
            {editing ? (
              <>
                <button
                  type="submit"
                  disabled={submitting || uploadingLogo || uploadingProof || !hasChanges}
                  className="flex-1 rounded-md bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {uploadingLogo || uploadingProof ? "Uploading image..." : submitting ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    setSuccess(null);
                    resetFormFromBusiness();
                  }}
                  className="flex-1 rounded-md border border-slate-200 bg-white py-2.5 text-sm font-bold text-[#1F2937]"
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
                className="w-full rounded-md bg-primary py-2.5 text-sm font-bold text-white"
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
