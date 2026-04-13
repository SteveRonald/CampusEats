import { Link, useLocation } from "wouter";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  ShoppingCart,
  Home,
  ClipboardList,
  User,
  LogOut,
  LayoutDashboard,
  Store,
  ChefHat,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

/* ─── Shared sidebar link ─────────────────────────────────────────── */
function SideLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <span
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer",
          active
            ? "bg-primary text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{label}</span>
      </span>
    </Link>
  );
}

/* ─── Student Layout ─────────────────────────────────────────────── */
export function StudentLayout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/cart", icon: ShoppingCart, label: "Cart" },
    { href: "/orders", icon: ClipboardList, label: "My Orders" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-border fixed top-0 left-0 h-screen z-40 px-4 py-6">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 px-1">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-foreground">CampusEats</span>
            <p className="text-[10px] text-muted-foreground leading-none">Moi University</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {navLinks.map(({ href, icon, label }) => (
            <div key={href} className="relative">
              <SideLink
                href={href}
                icon={icon}
                label={label}
                active={href === "/" ? location === "/" : location.startsWith(href)}
              />
              {href === "/cart" && totalItems > 0 && (
                <span className="absolute right-3 top-2 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* User */}
        {user ? (
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center gap-3 px-1 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        ) : (
          <Link href="/login">
            <span className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-primary text-white font-medium hover:bg-primary/90 transition-colors cursor-pointer">
              <User className="w-4 h-4" /> Sign in
            </span>
          </Link>
        )}
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col md:ml-60">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base text-foreground">CampusEats</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cart">
              <span className="relative text-muted-foreground">
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </span>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
          <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
            {navLinks.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <button
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors relative",
                    (href === "/" ? location === "/" : location.startsWith(href))
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {href === "/cart" && totalItems > 0 && (
                    <span className="absolute top-1 right-2.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                  <span className="text-xs font-medium">{label}</span>
                </button>
              </Link>
            ))}
            <Link href={user ? "#" : "/login"}>
              <button className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg text-muted-foreground transition-colors">
                <User className="w-5 h-5" />
                <span className="text-xs font-medium">{user ? user.name.split(" ")[0] : "Login"}</span>
              </button>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

/* ─── Vendor Layout ──────────────────────────────────────────────── */
export function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  const navLinks = [
    { href: "/vendor/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/vendor/orders", icon: ClipboardList, label: "Orders" },
    { href: "/vendor/menu", icon: ChefHat, label: "Menu" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-border fixed top-0 left-0 h-screen z-40 px-4 py-6">
        <div className="flex items-center gap-2 mb-8 px-1">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-foreground">Vendor Portal</span>
            <p className="text-[10px] text-muted-foreground leading-none">CampusEats</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navLinks.map(({ href, icon, label }) => (
            <SideLink
              key={href}
              href={href}
              icon={icon}
              label={label}
              active={location.startsWith(href)}
            />
          ))}
        </nav>

        {user && (
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center gap-3 px-1 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col md:ml-60">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground">Vendor Portal</span>
              {user && <p className="text-xs text-muted-foreground">{user.name}</p>}
            </div>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
          <div className="flex items-center justify-around py-2">
            {navLinks.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <button
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors",
                    location.startsWith(href) ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

/* ─── Admin Layout ───────────────────────────────────────────────── */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  const navLinks = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/vendors", icon: Store, label: "Vendors" },
    { href: "/admin/orders", icon: ClipboardList, label: "All Orders" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-border fixed top-0 left-0 h-screen z-40 px-4 py-6">
        <div className="flex items-center gap-2 mb-8 px-1">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-foreground">Admin Panel</span>
            <p className="text-[10px] text-muted-foreground leading-none">CampusEats</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navLinks.map(({ href, icon, label }) => (
            <SideLink
              key={href}
              href={href}
              icon={icon}
              label={label}
              active={location.startsWith(href)}
            />
          ))}
        </nav>

        {user && (
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center gap-3 px-1 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col md:ml-60">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground">Admin Panel</span>
              {user && <p className="text-xs text-muted-foreground">{user.email}</p>}
            </div>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 pb-20 md:pb-0 px-4 md:px-8 py-4 md:py-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
          <div className="flex items-center justify-around py-2">
            {navLinks.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <button
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors",
                    location.startsWith(href) ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label.split(" ")[0]}</span>
                </button>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
