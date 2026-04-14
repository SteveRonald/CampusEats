"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudentLayout } from "@/components/Layout";
import { client } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      router.push("/auth");
    }, 1500);
    return () => clearTimeout(timer);
  }, [success, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await client.forgotPassword({ email, newPassword });
      setSuccess(result.message || "Password reset successful. You can now sign in.");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout>
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-[28px] border border-border bg-white px-6 py-8 shadow-sm">
          <h1 className="text-[22px] font-bold text-foreground text-center">Reset password</h1>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            Enter your account email and choose a new password.
          </p>

          {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {success && <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success} Redirecting to login...</p>}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">Email</label>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">New password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button disabled={submitting} className="w-full rounded-2xl bg-primary py-3.5 text-xl font-black text-white disabled:opacity-60">
              {submitting ? "Resetting..." : "Reset password"}
            </button>
          </form>

          <p className="mt-6 text-center text-[16px] text-muted-foreground">
            Remembered your password? <Link href="/auth" className="font-black text-primary">Sign in</Link>
          </p>
        </div>
      </div>
    </StudentLayout>
  );
}
