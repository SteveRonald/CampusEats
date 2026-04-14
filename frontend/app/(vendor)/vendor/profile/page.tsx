"use client";

import { VendorLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function VendorProfilePage() {
  const { profile } = useSession();

  if (!profile) return null;

  return (
    <VendorLayout>
      <div className="px-4 pt-4 md:px-6 lg:px-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground">Vendor account details</p>
        </div>

        <div className="space-y-2">
          <Row label="Full name" value={profile.name} />
          <Row label="Email" value={profile.email} />
          <Row label="Role" value={profile.role} />
          <Row label="Account ID" value={profile.publicId ?? "-"} />
          <Row label="Vendor ID" value={String(profile.vendorId ?? "-")} />
        </div>
      </div>
    </VendorLayout>
  );
}
