import { Link, useLocation } from "wouter";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ShoppingCart, Home, ClipboardList, User, LogOut, LayoutDashboard, Store, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground">CampusEats</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <button onClick={() => { logout(); navigate("/login"); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          <Link href="/">
            <button className={cn("flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors", location === "/" ? "text-primary" : "text-muted-foreground")}>
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">Home</span>
            </button>
          </Link>
          <Link href="/cart">
            <button className={cn("flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors relative", location === "/cart" ? "text-primary" : "text-muted-foreground")}>
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 right-2 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">{totalItems}</span>
              )}
              <span className="text-xs font-medium">Cart</span>
            </button>
          </Link>
          <Link href="/orders">
            <button className={cn("flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors", location.startsWith("/orders") ? "text-primary" : "text-muted-foreground")}>
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs font-medium">Orders</span>
            </button>
          </Link>
          <Link href={user ? "#" : "/login"}>
            <button className={cn("flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors", "text-muted-foreground")}>
              <User className="w-5 h-5" />
              <span className="text-xs font-medium">{user ? user.name.split(" ")[0] : "Login"}</span>
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
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

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          <Link href="/vendor/dashboard">
            <button className={cn("flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors", location === "/vendor/dashboard" ? "text-primary" : "text-muted-foreground")}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs font-medium">Dashboard</span>
            </button>
          </Link>
          <Link href="/vendor/orders">
            <button className={cn("flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors", location === "/vendor/orders" ? "text-primary" : "text-muted-foreground")}>
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs font-medium">Orders</span>
            </button>
          </Link>
          <Link href="/vendor/menu">
            <button className={cn("flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors", location.startsWith("/vendor/menu") ? "text-primary" : "text-muted-foreground")}>
              <ChefHat className="w-5 h-5" />
              <span className="text-xs font-medium">Menu</span>
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-2xl mx-auto relative">
      <header className="sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
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

      <main className="flex-1 pb-20 px-4">{children}</main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          <Link href="/admin/dashboard">
            <button className={cn("flex flex-col items-center gap-0.5 px-6 py-2 rounded-lg transition-colors", location === "/admin/dashboard" ? "text-primary" : "text-muted-foreground")}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs font-medium">Dashboard</span>
            </button>
          </Link>
          <Link href="/admin/vendors">
            <button className={cn("flex flex-col items-center gap-0.5 px-6 py-2 rounded-lg transition-colors", location === "/admin/vendors" ? "text-primary" : "text-muted-foreground")}>
              <Store className="w-5 h-5" />
              <span className="text-xs font-medium">Vendors</span>
            </button>
          </Link>
          <Link href="/admin/orders">
            <button className={cn("flex flex-col items-center gap-0.5 px-6 py-2 rounded-lg transition-colors", location === "/admin/orders" ? "text-primary" : "text-muted-foreground")}>
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs font-medium">Orders</span>
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
