"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers";

export default function AdminLoginPage() {
  const router = useRouter();
  const { profile, isLoading, adminLogin } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && profile?.role === "admin") {
      router.replace("/admin/dashboard");
    }
  }, [isLoading, profile, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const nextProfile = await adminLogin({ email, password });
      if (nextProfile.role !== "admin") {
        throw new Error("This login is for admins only");
      }
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md rounded-[28px] border border-border bg-white px-6 py-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-4 h-12 w-52 overflow-hidden">
            <Image src="/logo.png" alt="CampusEats logo" fill className="object-contain" sizes="208px" />
          </div>
          <h1 className="text-3xl font-black text-foreground">Admin login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Secure access for campus operations</p>
        </div>

        {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@campuseats.co.ke"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-foreground">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <button disabled={submitting} className="w-full rounded-2xl bg-primary py-3.5 text-xl font-black text-white disabled:opacity-60">
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Student or vendor? <Link href="/auth" className="font-bold text-primary">Use shared login</Link>
        </p>
      </div>
    </main>
  );
}
