import { useGetAdminStats, useListVendors } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/Layout";
import { formatKES } from "@/lib/utils";
import { TrendingUp, Users, ShoppingBag, DollarSign, Store, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats({ query: { refetchInterval: 30000 } });
  const { data: vendors } = useListVendors({ query: {} });
  const [, navigate] = useLocation();

  return (
    <AdminLayout>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">CampusEats system overview</p>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total orders", value: stats?.totalOrders ?? 0, Icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
              { label: "Orders today", value: stats?.ordersToday ?? 0, Icon: TrendingUp, color: "bg-orange-50 text-primary" },
              { label: "Total vendors", value: stats?.totalVendors ?? 0, Icon: Store, color: "bg-purple-50 text-purple-600" },
              { label: "Active vendors", value: stats?.activeVendors ?? 0, Icon: CheckCircle, color: "bg-green-50 text-secondary" },
              { label: "Total revenue", value: formatKES(stats?.totalRevenue ?? 0), Icon: DollarSign, color: "bg-green-50 text-secondary" },
              { label: "Commission earned", value: formatKES(stats?.totalCommission ?? 0), Icon: TrendingUp, color: "bg-yellow-50 text-yellow-600" },
            ].map(({ label, value, Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-border p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-black text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-foreground">Vendors</h2>
            <button onClick={() => navigate("/admin/vendors")} className="text-xs text-primary font-semibold">View all</button>
          </div>
          <div className="space-y-2">
            {vendors?.slice(0, 4).map((vendor) => (
              <div key={vendor.id} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{vendor.stallName}</p>
                  <p className="text-xs text-muted-foreground">{vendor.location || "No location set"}</p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${vendor.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {vendor.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-orange-50 border border-primary/20 rounded-xl p-4 mt-4">
          <p className="text-sm font-bold text-foreground mb-1">Commission model</p>
          <p className="text-xs text-muted-foreground">Platform earns 10% on every order. 90% goes directly to vendor M-Pesa via IntaSend.</p>
          <p className="text-sm font-bold text-primary mt-1">{formatKES(stats?.totalCommission ?? 0)} earned total</p>
        </div>
      </div>
    </AdminLayout>
  );
}
