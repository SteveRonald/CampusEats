"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function AdminProfilePage() {
  const { profile, refreshProfile } = useSession();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? ""
  });

  const validate = () => {
    const name = draft.name.trim();
    const email = draft.email.trim();
    const phone = draft.phone.trim();

    if (name.length < 2) return "Name must be at least 2 characters";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
    if (phone && !/^(?:\+?254|0)?7\d{8}$/.test(phone.replace(/\s+/g, ""))) {
      return "Enter a valid phone number (e.g. 07XXXXXXXX or +2547XXXXXXXX)";
    }

    return null;
  };

  useEffect(() => {
    if (!success && !error) return;
    const timer = setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [success, error]);

  useEffect(() => {
    if (!profile || editing) return;
    setDraft({
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? ""
    });
  }, [profile, editing]);

  const hasChanges =
    editing && profile
      ? draft.name.trim() !== profile.name || draft.email.trim() !== profile.email || draft.phone.trim() !== (profile.phone ?? "")
      : false;

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await client.updateProfile({ name: draft.name, email: draft.email, phone: draft.phone });
      await refreshProfile();
      setSuccess("Profile updated successfully");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile) return null;

  return (
    <AdminLayout>
      <div className="pt-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground">Admin account details</p>
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

        <form onSubmit={handleSave} className="space-y-2">
          {editing ? (
            <>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">Full name</label>
                <input
                  value={draft.name}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((current) => ({ ...current, name: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-foreground outline-none"
                  required
                />
              </div>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((current) => ({ ...current, email: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-foreground outline-none"
                  required
                />
              </div>
              <div className="rounded-xl border border-border bg-white px-4 py-3">
                <label className="mb-1 block text-sm text-muted-foreground">Phone</label>
                <input
                  value={draft.phone}
                  onChange={(event) => {
                    setError(null);
                    setSuccess(null);
                    setDraft((current) => ({ ...current, phone: event.target.value }));
                  }}
                  className="w-full text-sm font-semibold text-foreground outline-none"
                  placeholder="07XX XXX XXX"
                />
              </div>
              <p className="px-1 text-xs text-muted-foreground">Role and Account ID are read-only.</p>
              <Row label="Role" value={profile.role} />
              <Row label="Account ID" value={profile.publicId ?? "-"} />
            </>
          ) : (
            <>
              <Row label="Full name" value={profile.name} />
              <Row label="Email" value={profile.email} />
              <Row label="Phone" value={profile.phone ?? "-"} />
              <Row label="Role" value={profile.role} />
              <Row label="Account ID" value={profile.publicId ?? "-"} />
            </>
          )}

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
                    setDraft({ name: profile.name, email: profile.email, phone: profile.phone ?? "" });
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
                  setDraft({ name: profile.name, email: profile.email, phone: profile.phone ?? "" });
                }}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white"
              >
                Edit profile
              </button>
            )}
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
