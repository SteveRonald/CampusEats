"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, Home, ClipboardList, LayoutDashboard, Store, ChefHat, LogOut, User, Bell } from "lucide-react";
import clsx from "clsx";
import { useCart, useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { Role } from "@/lib/types";

function SessionActions({ hideLabels = false }: { hideLabels?: boolean }) {
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
    <div className="flex shrink-0 items-center gap-2 pl-2">
      <div className="hidden md:block px-1 text-[11px] font-semibold text-primary">{profile.name}</div>
      <Link
        href={profilePath}
        className="inline-flex items-center gap-1 px-1 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <User className="h-3.5 w-3.5" />
        {hideLabels ? null : <span>Profile</span>}
      </Link>
      <button
        onClick={() => {
          const nextPath = profile.role === "admin" ? "/admin/login" : "/auth";
          logout();
          router.replace(nextPath);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground md:px-3"
      >
        <LogOut className="h-3.5 w-3.5" />
        {hideLabels ? null : <span>Logout</span>}
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

function PublicFooter() {
  return (
    <footer className="mt-8 border-t border-border bg-slate-50/70 px-4 py-6 text-sm text-slate-600 md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/" aria-label="Go to home" className="inline-flex items-center">
            <Image src="/logo.png" alt="CampusEats" width={128} height={34} className="h-8 w-auto" />
          </Link>
          <p className="mt-1 max-w-md text-xs text-slate-500">Campus food ordering built for speed, trust, and reliable delivery windows.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-600">
          <Link href="/about" className="hover:text-primary">About</Link>
          <Link href="/contact" className="hover:text-primary">Contact Us</Link>
          <Link href="/terms" className="hover:text-primary">Terms</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy</Link>
        </div>
      </div>
    </footer>
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

        <main className="flex-1 pb-20">{children}</main>
        <div className="pb-20">
          <PublicFooter />
        </div>

        <nav className="pointer-events-none fixed bottom-0 left-1/2 z-50 w-full max-w-[1320px] -translate-x-1/2 border-t border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="pointer-events-auto flex items-center justify-around py-2">
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
            ) : profile.role === "vendor" ? (
              <NavLink
                href="/vendor/orders"
                active={pathname.startsWith("/vendor/orders")}
                icon={<ClipboardList className="h-5 w-5" />}
                label="Orders"
              />
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
  const [hasDeliveryLocation, setHasDeliveryLocation] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "approved" | "rejected" | null>(null);

  useEffect(() => {
    if (!profile || profile.role !== "vendor" || !profile.vendorId) return;

    client
      .vendorDeliveryLocations(profile.vendorId)
      .then((locations) => {
        setHasDeliveryLocation(locations.length > 0);
      })
      .catch(() => {
        setHasDeliveryLocation(true);
      });
  }, [profile]);

  useEffect(() => {
    if (!profile || profile.role !== "vendor" || !profile.vendorId) return;

    client
      .vendorProfile(profile.vendorId)
      .then((vendor) => {
        setVerificationStatus(vendor.verification_status ?? (vendor.is_active ? "approved" : "pending"));
      })
      .catch(() => {
        setVerificationStatus(null);
      });
  }, [profile]);

  if (isLoading || !profile || profile.role !== "vendor") {
    return <LoadingShell />;
  }

  const vendorLinks = [
    { href: "/vendor/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, active: pathname === "/vendor/dashboard" },
    { href: "/vendor/orders", label: "Orders", icon: <ClipboardList className="h-4 w-4" />, active: pathname === "/vendor/orders" },
    { href: "/vendor/menu", label: "Menu", icon: <ChefHat className="h-4 w-4" />, active: pathname.startsWith("/vendor/menu") },
    { href: "/vendor/pickup-locations", label: "Delivery Locations", icon: <Home className="h-4 w-4" />, active: pathname.startsWith("/vendor/pickup-locations") },
    { href: "/vendor/profile", label: "Business Profile", icon: <User className="h-4 w-4" />, active: pathname === "/vendor/profile" }
  ];

  const pageTitle =
    pathname === "/vendor/orders"
      ? "Orders"
      : pathname.startsWith("/vendor/menu")
        ? "Menu"
        : pathname.startsWith("/vendor/pickup-locations")
          ? "Delivery Locations"
          : pathname === "/vendor/profile"
            ? "Business Profile"
            : "Dashboard";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col bg-[#F8FAFC] md:flex-row md:border-x md:border-border md:shadow-sm">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-white md:flex lg:w-64">
          <div className="border-b border-border px-5 py-4">
            <Link href="/" aria-label="Go to home" className="flex items-center">
              <Image src="/logo.png" alt="CampusEats" width={132} height={36} className="h-8 w-auto" />
            </Link>
          </div>

          <div className="px-4 py-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Vendor Workspace</p>
            <nav className="space-y-1">
              {vendorLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    link.active ? "bg-orange-50 text-primary" : "text-foreground hover:bg-muted"
                  )}
                >
                  <span className={clsx("inline-flex h-7 w-7 items-center justify-center rounded-md", link.active ? "bg-orange-100" : "bg-muted")}>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-50 border-b border-border bg-white">
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
              <div className="flex items-center gap-3 md:hidden">
                <Link href="/" aria-label="Go to home" className="flex items-center">
                  <Image src="/logo.png" alt="CampusEats" width={132} height={36} className="h-8 w-auto" />
                </Link>
              </div>

              <div className="hidden flex-1 items-center gap-3 md:flex">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Vendor</p>
                  <p className="text-sm font-semibold text-foreground">{pageTitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" aria-label="Notifications" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground md:inline-flex">
                  <Bell className="h-4 w-4" />
                </button>
                <SessionActions />
              </div>
            </div>
          </header>

          <main className="flex-1 pb-20 md:pb-6">
            {verificationStatus !== null && verificationStatus !== "approved" && !pathname.startsWith("/vendor/profile") ? (
              <div className="mx-4 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 md:mx-6 lg:mx-8">
                <p className="text-sm font-bold text-rose-900">Admin verification required before vendor actions</p>
                <p className="mt-1 text-sm text-rose-800">
                  Upload your business logo and location proof in Business Profile so admin can approve your account.
                  <Link href="/vendor/profile" className="ml-1 font-bold underline decoration-rose-700 underline-offset-2">
                    Go to Business Profile
                  </Link>
                </p>
              </div>
            ) : null}
            {!hasDeliveryLocation && !pathname.startsWith("/vendor/pickup-locations") ? (
              <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 md:mx-6 lg:mx-8">
                <p className="text-sm font-bold text-amber-900">Setup required before vendor actions</p>
                <p className="mt-1 text-sm text-amber-800">
                  Add at least one delivery location to continue with order updates and menu changes.
                  <Link href="/vendor/pickup-locations" className="ml-1 font-bold underline decoration-amber-700 underline-offset-2">
                    Go to Delivery Locations
                  </Link>
                </p>
              </div>
            ) : null}
            {children}
          </main>
          <div className="px-4 pb-20 md:px-6 md:pb-6 lg:px-8">
            <PublicFooter />
          </div>
        </div>

        <nav className="pointer-events-none fixed bottom-0 left-1/2 z-50 w-full max-w-[1320px] -translate-x-1/2 border-t border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden">
          <div className="pointer-events-auto flex items-center justify-around py-2">
            <NavLink
              href="/vendor/dashboard"
              active={pathname === "/vendor/dashboard"}
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Dashboard"
            />
            <NavLink href="/vendor/orders" active={pathname === "/vendor/orders"} icon={<ClipboardList className="h-5 w-5" />} label="Orders" />
            <NavLink href="/vendor/menu" active={pathname.startsWith("/vendor/menu")} icon={<ChefHat className="h-5 w-5" />} label="Menu" />
            <NavLink
              href="/vendor/pickup-locations"
              active={pathname.startsWith("/vendor/pickup-locations")}
              icon={<Home className="h-5 w-5" />}
              label="Delivery"
            />
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

  const adminLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, active: pathname === "/admin/dashboard" },
    { href: "/admin/vendors", label: "Vendors", icon: <Store className="h-4 w-4" />, active: pathname === "/admin/vendors" },
    { href: "/admin/menu-review", label: "Menu Review", icon: <ChefHat className="h-4 w-4" />, active: pathname.startsWith("/admin/menu-review") },
    { href: "/admin/orders", label: "Orders", icon: <ClipboardList className="h-4 w-4" />, active: pathname === "/admin/orders" },
    { href: "/admin/service-areas", label: "Service Areas", icon: <Home className="h-4 w-4" />, active: pathname.startsWith("/admin/service-areas") },
    { href: "/admin/hostels", label: "Hostels", icon: <User className="h-4 w-4" />, active: pathname.startsWith("/admin/hostels") }
  ];

  const pageTitle =
    pathname === "/admin/vendors"
      ? "Vendors"
      : pathname.startsWith("/admin/menu-review")
        ? "Menu Review"
      : pathname === "/admin/orders"
        ? "Orders"
        : pathname.startsWith("/admin/service-areas")
          ? "Service Areas"
          : pathname.startsWith("/admin/hostels")
            ? "Hostels"
            : "Dashboard";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col bg-[#F8FAFC] md:flex-row md:border-x md:border-border md:shadow-sm">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-white md:flex lg:w-64">
          <div className="border-b border-border px-5 py-4">
            <Link href="/" aria-label="Go to home" className="flex items-center">
              <Image src="/logo.png" alt="CampusEats" width={132} height={36} className="h-8 w-auto" />
            </Link>
          </div>

          <div className="px-4 py-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Admin Workspace</p>
            <nav className="space-y-1">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    link.active ? "bg-orange-50 text-primary" : "text-foreground hover:bg-muted"
                  )}
                >
                  <span className={clsx("inline-flex h-7 w-7 items-center justify-center rounded-md", link.active ? "bg-orange-100" : "bg-muted")}>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-50 border-b border-border bg-white">
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
              <div className="flex items-center gap-3 md:hidden">
                <Link href="/" aria-label="Go to home" className="flex items-center">
                  <Image src="/logo.png" alt="CampusEats" width={132} height={36} className="h-8 w-auto" />
                </Link>
              </div>

              <div className="hidden flex-1 items-center gap-3 md:flex">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Admin</p>
                  <p className="text-sm font-semibold text-foreground">{pageTitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" aria-label="Notifications" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground md:inline-flex">
                  <Bell className="h-4 w-4" />
                </button>
                <SessionActions />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 pb-20 md:px-6 md:pb-6 lg:px-8">{children}</main>
          <div className="px-4 pb-20 md:px-6 md:pb-6 lg:px-8">
            <PublicFooter />
          </div>
        </div>

        <nav className="pointer-events-none fixed bottom-0 left-1/2 z-50 w-full max-w-[1320px] -translate-x-1/2 border-t border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden">
          <div className="pointer-events-auto flex items-center justify-around py-2">
            <NavLink
              href="/admin/dashboard"
              active={pathname === "/admin/dashboard"}
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Dashboard"
            />
            <NavLink href="/admin/vendors" active={pathname === "/admin/vendors"} icon={<Store className="h-5 w-5" />} label="Vendors" />
            <NavLink href="/admin/menu-review" active={pathname.startsWith("/admin/menu-review")} icon={<ChefHat className="h-5 w-5" />} label="Menu" />
            <NavLink href="/admin/orders" active={pathname === "/admin/orders"} icon={<ClipboardList className="h-5 w-5" />} label="Orders" />
            <NavLink href="/admin/service-areas" active={pathname.startsWith("/admin/service-areas")} icon={<Home className="h-5 w-5" />} label="Areas" />
          </div>
        </nav>
      </div>
    </div>
  );
}
