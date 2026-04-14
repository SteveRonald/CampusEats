"use client";

import Link from "next/link";
import { StudentLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { profile } = useSession();

  if (!profile) {
    return (
      <StudentLayout>
        <div className="px-4 pt-10">
          <div className="rounded-3xl border border-border bg-white p-6 text-center">
            <h1 className="text-xl font-bold text-foreground mb-2">Sign in to view your profile</h1>
            <p className="text-sm text-muted-foreground mb-5">Your account details are available after sign in.</p>
            <Link href="/auth?returnTo=/profile" className="inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white">
              Sign in
            </Link>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="px-4 pt-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground">Your account details</p>
        </div>

        <div className="space-y-2">
          <Row label="Full name" value={profile.name} />
          <Row label="Email" value={profile.email} />
          <Row label="Role" value={profile.role} />
          <Row label="Account ID" value={profile.publicId ?? "-"} />
          {profile.vendorId ? <Row label="Vendor ID" value={String(profile.vendorId)} /> : null}
        </div>
      </div>
    </StudentLayout>
  );
}
