"use client";

import { useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Store, CheckCircle } from "lucide-react";
import { AdminLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { formatKES } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalOrders: 0, ordersToday: 0, activeVendors: 0, totalRevenue: 0, totalCommission: 0, transactionsToday: 0 });

  useEffect(() => {
    client.adminSummary().then(setStats);
    const interval = setInterval(() => client.adminSummary().then(setStats), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout>
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-5">CampusEats system overview</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Total orders", value: stats.totalOrders, Icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
            { label: "Orders today", value: stats.ordersToday, Icon: TrendingUp, color: "bg-orange-50 text-primary" },
            { label: "Active vendors", value: stats.activeVendors, Icon: CheckCircle, color: "bg-green-50 text-secondary" },
            { label: "Transactions today", value: stats.transactionsToday, Icon: Store, color: "bg-yellow-50 text-yellow-700" },
            { label: "Total revenue", value: formatKES(stats.totalRevenue), Icon: DollarSign, color: "bg-green-50 text-secondary" },
            { label: "Commission earned", value: formatKES(stats.totalCommission), Icon: TrendingUp, color: "bg-yellow-50 text-yellow-600" }
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

        <div className="bg-orange-50 border border-primary/20 rounded-xl p-4 mt-4">
          <p className="text-sm font-bold text-foreground mb-1">Commission model</p>
          <p className="text-xs text-muted-foreground">Platform earns 10% on every order. 90% goes to vendor payout in the simulated IntaSend flow.</p>
          <p className="text-sm font-bold text-primary mt-1">{formatKES(stats.totalCommission)} earned total</p>
        </div>
      </div>
    </AdminLayout>
  );
}
