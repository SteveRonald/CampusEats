import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Home from "@/pages/Home";
import Cart from "@/pages/Cart";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VendorDashboard from "@/pages/vendor/VendorDashboard";
import VendorOrders from "@/pages/vendor/VendorOrders";
import VendorMenu from "@/pages/vendor/VendorMenu";
import VendorMenuNew from "@/pages/vendor/VendorMenuNew";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminVendors from "@/pages/admin/AdminVendors";
import AdminOrders from "@/pages/admin/AdminOrders";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10000,
    },
  },
});

function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">🍽️</div>
      <h1 className="text-3xl font-black text-foreground mb-2">Page not found</h1>
      <p className="text-muted-foreground mb-6">Looks like this page wandered off the menu</p>
      <button
        onClick={() => navigate("/")}
        className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90"
      >
        Back to marketplace
      </button>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) return null;

  if (!user) {
    navigate("/login");
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    navigate("/");
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/cart" component={Cart} />
      <Route path="/orders" component={Orders} />
      <Route path="/orders/:id" component={OrderDetail} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/vendor/dashboard">
        <ProtectedRoute requiredRole="vendor"><VendorDashboard /></ProtectedRoute>
      </Route>
      <Route path="/vendor/orders">
        <ProtectedRoute requiredRole="vendor"><VendorOrders /></ProtectedRoute>
      </Route>
      <Route path="/vendor/menu/new">
        <ProtectedRoute requiredRole="vendor"><VendorMenuNew /></ProtectedRoute>
      </Route>
      <Route path="/vendor/menu">
        <ProtectedRoute requiredRole="vendor"><VendorMenu /></ProtectedRoute>
      </Route>
      <Route path="/admin/dashboard">
        <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/admin/vendors">
        <ProtectedRoute requiredRole="admin"><AdminVendors /></ProtectedRoute>
      </Route>
      <Route path="/admin/orders">
        <ProtectedRoute requiredRole="admin"><AdminOrders /></ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
