"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, Home, ClipboardList, LayoutDashboard, Store, ChefHat, LogOut, User } from "lucide-react";
import clsx from "clsx";
import { useCart, useSession } from "@/components/providers";
import { Role } from "@/lib/types";

function SessionActions() {
  const { profile, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (!profile) {
    return (
      <Link
        href={`/auth?returnTo=${encodeURIComponent(pathname)}`}
        className="rounded-full border border-primary/20 bg-orange-50 px-3 py-2 text-[11px] font-semibold text-primary"
      >
        Login
      </Link>
    );
  }

  const profilePath = profile.role === "admin" ? "/admin/profile" : profile.role === "vendor" ? "/vendor/profile" : "/profile";

  return (
    <div className="flex items-center gap-3 pl-2">
      <div className="hidden sm:block rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-primary">
        {profile.role.toUpperCase()} - {profile.name}
      </div>
      <Link
        href={profilePath}
        className="inline-flex items-center gap-1 px-1 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <User className="h-3.5 w-3.5" />
        Profile
      </Link>
      <button
        onClick={() => {
          const nextPath = profile.role === "admin" ? "/admin/login" : "/auth";
          logout();
          router.replace(nextPath);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
        Logout
      </button>
    </div>
  );
}

function useRoleGuard(role: Role) {
  const { profile, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!profile) {
      router.replace(role === "admin" ? "/admin/login" : "/auth");
      return;
    }

    if (profile.role === role) return;

    if (profile.role === "student") {
      router.replace("/");
      return;
    }

    if (profile.role === "vendor") {
      router.replace("/vendor/dashboard");
      return;
    }

    router.replace("/admin/dashboard");
  }, [isLoading, profile, role, router]);

  return { profile, isLoading };
}

function useSessionState() {
  const { profile } = useSession();
  return { profile };
}

function LoadingShell() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-3 bg-white md:border-x md:border-border md:shadow-sm">
        <div className="h-8 w-8 rounded-full border-2 border-orange-200 border-t-primary animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Loading</p>
      </div>
    </div>
  );
}

function NavLink({ href, active, icon, label, badge }: { href: string; active: boolean; icon: React.ReactNode; label: string; badge?: number }) {
  const badgeValue = typeof badge === "number" && badge > 99 ? "99+" : badge;

  return (
    <Link
      href={href}
      className={clsx(
        "flex min-w-[70px] flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        {icon}
        {typeof badge === "number" && badge > 0 && (
          <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-none text-white">
            {badgeValue}
          </span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const pathname = usePathname();
  const { profile } = useSessionState();
  const isGuest = !profile;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col bg-white md:border-x md:border-border md:shadow-sm">
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-white px-4 py-3 shadow-sm md:px-6">
          <Link href="/" aria-label="Go to home" className="flex items-center">
            <Image src="/logo.png" alt="CampusEats" width={170} height={44} className="h-9 w-auto md:h-10" priority />
          </Link>
          <SessionActions />
        </header>

        <main className="flex-1 pb-20 md:pb-24">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-6xl -translate-x-1/2 border-t border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="flex items-center justify-around py-2">
            <NavLink href="/" active={pathname === "/"} icon={<Home className="h-5 w-5" />} label="Home" />
            <NavLink
              href="/cart"
              active={pathname === "/cart"}
              icon={<ShoppingCart className="h-5 w-5" />}
              label="Cart"
              badge={totalItems > 0 ? totalItems : undefined}
            />
            {isGuest ? (
              <NavLink href="/auth" active={pathname === "/auth"} icon={<User className="h-5 w-5" />} label="Login" />
            ) : (
              <NavLink href="/orders" active={pathname.startsWith("/orders")} icon={<ClipboardList className="h-5 w-5" />} label="Orders" />
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, isLoading } = useRoleGuard("vendor");

  if (isLoading || !profile || profile.role !== "vendor") {
    return <LoadingShell />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col bg-white md:border-x md:border-border md:shadow-sm">
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-white px-4 py-3 shadow-sm md:px-6">
          <div className="flex items-center">
            <Link href="/" aria-label="Go to home" className="flex items-center">
              <Image src="/logo.png" alt="CampusEats" width={132} height={36} className="h-8 w-auto md:h-9" />
            </Link>
          </div>
          <SessionActions />
        </header>

        <main className="flex-1 pb-20 md:pb-24">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-6xl -translate-x-1/2 border-t border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="flex items-center justify-around py-2">
            <NavLink
              href="/vendor/dashboard"
              active={pathname === "/vendor/dashboard"}
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Dashboard"
            />
            <NavLink href="/vendor/orders" active={pathname === "/vendor/orders"} icon={<ClipboardList className="h-5 w-5" />} label="Orders" />
            <NavLink href="/vendor/menu" active={pathname.startsWith("/vendor/menu")} icon={<ChefHat className="h-5 w-5" />} label="Menu" />
          </div>
        </nav>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, isLoading } = useRoleGuard("admin");

  if (isLoading || !profile || profile.role !== "admin") {
    return <LoadingShell />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col bg-white md:border-x md:border-border md:shadow-sm">
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-white px-4 py-3 shadow-sm md:px-6">
          <div className="flex flex-col items-start">
            <Link href="/" aria-label="Go to home" className="flex items-center">
              <Image src="/logo.png" alt="CampusEats" width={132} height={36} className="h-8 w-auto md:h-9" />
            </Link>
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Admin Panel</span>
          </div>
          <SessionActions />
        </header>

        <main className="flex-1 px-4 pb-20 md:px-6 lg:px-8">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-6xl -translate-x-1/2 border-t border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="flex items-center justify-around py-2">
            <NavLink
              href="/admin/dashboard"
              active={pathname === "/admin/dashboard"}
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Dashboard"
            />
            <NavLink href="/admin/vendors" active={pathname === "/admin/vendors"} icon={<Store className="h-5 w-5" />} label="Vendors" />
            <NavLink href="/admin/orders" active={pathname === "/admin/orders"} icon={<ClipboardList className="h-5 w-5" />} label="Orders" />
          </div>
        </nav>
      </div>
    </div>
  );
}
