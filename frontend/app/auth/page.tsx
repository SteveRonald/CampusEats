"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentLayout } from "@/components/Layout";
import { useSession } from "@/components/providers";

type Mode = "login" | "signup";
type SignupRole = "student" | "vendor";

function destinationForRole(role: "student" | "vendor" | "admin") {
  if (role === "vendor") return "/vendor/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/";
}

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isLoading, login, register } = useSession();
  const returnTo = searchParams.get("returnTo");

  const safeReturnTo = returnTo && returnTo.startsWith("/") ? returnTo : null;

  const [mode, setMode] = useState<Mode>("login");
  const [signupRole, setSignupRole] = useState<SignupRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    stallName: "",
    mpesaNumber: "",
    description: "",
    location: "",
    pickupTimeMin: "",
    pickupTimeMax: ""
  });

  const handleSignupRoleChange = (nextRole: SignupRole) => {
    setSignupRole(nextRole);
    setError(null);

    setSignupForm((current) => {
      if (nextRole === "student") {
        return {
          ...current,
          stallName: "",
          mpesaNumber: "",
          description: "",
          location: "",
          pickupTimeMin: "",
          pickupTimeMax: ""
        };
      }

      return {
        ...current,
        // If they already typed a phone, prefill M-Pesa once to reduce retyping.
        mpesaNumber: current.mpesaNumber || current.phone
      };
    });
  };

  useEffect(() => {
    if (!isLoading && profile) {
      router.replace(safeReturnTo ?? destinationForRole(profile.role));
    }
  }, [isLoading, profile, router, safeReturnTo]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const nextProfile = await login(loginForm);
      router.replace(safeReturnTo ?? destinationForRole(nextProfile.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const nextProfile = await register({
        role: signupRole,
        name: signupForm.name,
        email: signupForm.email,
        phone: signupRole === "vendor" ? signupForm.phone || signupForm.mpesaNumber : signupForm.phone,
        password: signupForm.password,
        stallName: signupRole === "vendor" ? signupForm.stallName : undefined,
        mpesaNumber: signupRole === "vendor" ? signupForm.mpesaNumber : undefined,
        description: signupRole === "vendor" ? signupForm.description : undefined,
        location: signupRole === "vendor" ? signupForm.location : undefined,
        pickupTimeMin: signupRole === "vendor" ? Number(signupForm.pickupTimeMin) : undefined,
        pickupTimeMax: signupRole === "vendor" ? Number(signupForm.pickupTimeMax) : undefined
      });
      router.replace(safeReturnTo ?? destinationForRole(nextProfile.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create account failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
          <div className="h-8 w-8 rounded-full border-2 border-orange-200 border-t-primary animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-[28px] border border-border bg-white px-6 py-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-5 h-12 w-52 overflow-hidden">
            <Image src="/logo.png" alt="CampusEats logo" fill className="object-contain" sizes="208px" />
          </div>
          <p className="text-[22px] font-bold text-foreground">
            {mode === "login" ? "Welcome back" : "Create account"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Campus food, delivered fast" : "Join CampusEats today"}
          </p>
        </div>

        {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">Email</label>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="mt-2 text-right">
                <Link href="/auth/forgot-password" className="text-sm font-semibold text-primary">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button disabled={submitting} className="mt-1 w-full rounded-2xl bg-primary py-3.5 text-xl font-black text-white disabled:opacity-60">
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">Full name</label>
              <input
                required
                placeholder="John Doe"
                value={signupForm.name}
                onChange={(event) => setSignupForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">Email</label>
              <input
                required
                type="email"
                placeholder="your@email.com"
                value={signupForm.email}
                onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {signupRole === "student" && (
              <div>
                <label className="mb-1.5 block text-sm font-bold text-foreground">Phone number</label>
                <input
                  placeholder="07XX XXX XXX"
                  value={signupForm.phone}
                  onChange={(event) => setSignupForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">Password</label>
              <input
                required
                type="password"
                placeholder="Min 6 characters"
                value={signupForm.password}
                onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-bold text-foreground">I am a</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSignupRoleChange("student")}
                  className={`rounded-2xl border px-4 py-3 text-base font-bold transition-colors ${
                    signupRole === "student" ? "border-primary bg-orange-50 text-primary" : "border-border bg-white text-muted-foreground"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => handleSignupRoleChange("vendor")}
                  className={`rounded-2xl border px-4 py-3 text-base font-bold transition-colors ${
                    signupRole === "vendor" ? "border-primary bg-orange-50 text-primary" : "border-border bg-white text-muted-foreground"
                  }`}
                >
                  Vendor
                </button>
              </div>
            </div>

            {signupRole === "vendor" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-foreground">Stall name</label>
                  <input
                    required
                    placeholder="Mama Njeri Kitchen"
                    value={signupForm.stallName}
                    onChange={(event) => setSignupForm((current) => ({ ...current, stallName: event.target.value }))}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-foreground">M-Pesa number</label>
                  <input
                    required
                    placeholder="07XX XXX XXX"
                    value={signupForm.mpesaNumber}
                    onChange={(event) => setSignupForm((current) => ({ ...current, mpesaNumber: event.target.value }))}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-foreground">Stall location</label>
                  <input
                    placeholder="Main campus"
                    value={signupForm.location}
                    onChange={(event) => setSignupForm((current) => ({ ...current, location: event.target.value }))}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-foreground">Stall description</label>
                  <textarea
                    rows={2}
                    placeholder="Tell students what you serve"
                    value={signupForm.description}
                    onChange={(event) => setSignupForm((current) => ({ ...current, description: event.target.value }))}
                    className="w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-foreground">Fastest delivery estimate (minutes)</label>
                    <input
                      type="number"
                      min={5}
                      placeholder="Example: 10"
                      value={signupForm.pickupTimeMin}
                      onChange={(event) => setSignupForm((current) => ({ ...current, pickupTimeMin: event.target.value }))}
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">If things are moving quickly, what is your shortest delivery estimate?</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-foreground">Longest delivery estimate (minutes)</label>
                    <input
                      type="number"
                      min={5}
                      placeholder="Example: 25"
                      value={signupForm.pickupTimeMax}
                      onChange={(event) => setSignupForm((current) => ({ ...current, pickupTimeMax: event.target.value }))}
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">During busy periods, what is your longest delivery estimate?</p>
                  </div>
                </div>
                <p className="-mt-1 text-xs text-muted-foreground">Use a range like 10 to 25 minutes so students understand the likely delivery window.</p>
              </>
            )}

            <button disabled={submitting} className="mt-1 w-full rounded-2xl bg-primary py-3.5 text-xl font-black text-white disabled:opacity-60">
              {submitting ? "Creating..." : "Create account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[16px] text-muted-foreground">
          {mode === "login" ? "New student? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="font-black text-primary"
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>

      </div>
      </div>
    </StudentLayout>
  );
}
