"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Store, CheckCircle, ArrowUpRight, ClipboardList } from "lucide-react";
import { AdminLayout, AdminMenuButton } from "@/components/Layout";
import { client } from "@/lib/api";
import { formatKES } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalOrders: 0, ordersToday: 0, activeVendors: 0, totalRevenue: 0, totalCommission: 0, transactionsToday: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await client.adminSummary();
        setStats(data);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load admin summary");
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout>
      <div className="pt-4">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-[#1F2937] md:text-2xl">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Track platform health, vendor operations, and order activity.</p>
          </div>
          <AdminMenuButton />
        </div>

        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-primary" />
            <p className="text-sm font-semibold text-[#1F2937]">Loading admin metrics...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "Total orders", value: stats.totalOrders, Icon: ShoppingBag, tone: "bg-blue-50 text-blue-700" },
                { label: "Orders today", value: stats.ordersToday, Icon: TrendingUp, tone: "bg-orange-50 text-primary" },
                { label: "Active vendors", value: stats.activeVendors, Icon: CheckCircle, tone: "bg-green-50 text-green-700" },
                { label: "Transactions today", value: stats.transactionsToday, Icon: Store, tone: "bg-yellow-50 text-yellow-700" },
                { label: "Total revenue", value: formatKES(stats.totalRevenue), Icon: DollarSign, tone: "bg-emerald-50 text-emerald-700" },
                { label: "Commission earned", value: formatKES(stats.totalCommission), Icon: TrendingUp, tone: "bg-orange-50 text-primary" }
              ].map(({ label, value, Icon, tone }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-black text-[#1F2937] md:text-xl">{value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2 md:p-5">
                <h2 className="mb-1 text-sm font-bold uppercase tracking-[0.1em] text-slate-500">Revenue Snapshot</h2>
                <p className="text-2xl font-black text-[#1F2937]">{formatKES(stats.totalRevenue)}</p>
                <p className="text-xs text-slate-500">Commission contribution: <span className="font-bold text-primary">{formatKES(stats.totalCommission)}</span></p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Order Throughput</p>
                    <p className="text-base font-black text-[#1F2937]">{stats.totalOrders} total</p>
                    <p className="text-xs text-slate-500">{stats.ordersToday} new today</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Vendor Capacity</p>
                    <p className="text-base font-black text-[#1F2937]">{stats.activeVendors} active</p>
                    <p className="text-xs text-slate-500">Live transaction count: {stats.transactionsToday}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-slate-500">Quick Actions</h2>
                <div className="space-y-2">
                  <Link
                    href="/admin/vendors"
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-[#1F2937] transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    Manage vendors
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </Link>
                  <Link
                    href="/admin/orders"
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-[#1F2937] transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    Review all orders
                    <ClipboardList className="h-4 w-4 text-primary" />
                  </Link>
                  <Link
                    href="/admin/service-areas"
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-[#1F2937] transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    Manage service areas
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </Link>
                  <Link
                    href="/admin/hostels"
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-[#1F2937] transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    Manage hostels
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </Link>
                </div>
                <p className="mt-3 text-xs text-slate-500">CampusEats commission model is preserved: 10% platform share, vendor payout flow managed by payment pipeline.</p>
              </section>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
