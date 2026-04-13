"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Home, ClipboardList, LayoutDashboard, Store, ChefHat } from "lucide-react";
import clsx from "clsx";
import { useCart, useSession } from "@/components/providers";

function RoleSwitcher() {
  const { profile, profiles, setProfile } = useSession();

  return (
    <select
      value={profile.email}
      onChange={(event) => {
        const match = profiles.find((entry) => entry.email === event.target.value);
        if (match) setProfile(match);
      }}
      className="rounded-full border border-orange-100 bg-white px-3 py-2 text-[11px] font-semibold text-muted-foreground outline-none"
    >
      {profiles.map((entry) => (
        <option key={entry.email} value={entry.email}>
          {entry.role.toUpperCase()} - {entry.name}
        </option>
      ))}
    </select>
  );
}

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground">CampusEats</span>
        </div>
        <RoleSwitcher />
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          <NavLink href="/" active={pathname === "/"} icon={<Home className="w-5 h-5" />} label="Home" />
          <NavLink href="/cart" active={pathname === "/cart"} icon={<ShoppingCart className="w-5 h-5" />} label={totalItems > 0 ? `Cart (${totalItems})` : "Cart"} />
          <NavLink href="/orders" active={pathname.startsWith("/orders")} icon={<ClipboardList className="w-5 h-5" />} label="Orders" />
        </div>
      </nav>
    </div>
  );
}

export function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">Vendor Portal</span>
        </div>
        <RoleSwitcher />
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          <NavLink href="/vendor/dashboard" active={pathname === "/vendor/dashboard"} icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
          <NavLink href="/vendor/orders" active={pathname === "/vendor/orders"} icon={<ClipboardList className="w-5 h-5" />} label="Orders" />
          <NavLink href="/vendor/menu" active={pathname.startsWith("/vendor/menu")} icon={<ChefHat className="w-5 h-5" />} label="Menu" />
        </div>
      </nav>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-2xl mx-auto relative">
      <header className="sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">Admin Panel</span>
        </div>
        <RoleSwitcher />
      </header>
      <main className="flex-1 pb-20 px-4">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          <NavLink href="/admin/dashboard" active={pathname === "/admin/dashboard"} icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
          <NavLink href="/admin/vendors" active={pathname === "/admin/vendors"} icon={<Store className="w-5 h-5" />} label="Vendors" />
          <NavLink href="/admin/orders" active={pathname === "/admin/orders"} icon={<ClipboardList className="w-5 h-5" />} label="Orders" />
        </div>
      </nav>
    </div>
  );
}

function NavLink({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors text-xs font-medium",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
