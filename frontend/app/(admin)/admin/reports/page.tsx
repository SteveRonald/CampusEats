"use client";

import { useEffect, useState, useRef } from "react";
import { AdminLayout, AdminMenuButton } from "@/components/Layout";
import { client } from "@/lib/api";
import { formatKES } from "@/lib/utils";
import { Download, Loader2, BarChart3, TrendingUp } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type Period = "all" | "today" | "week" | "month" | "year";

interface ReportOrder {
  id: number;
  public_id: string;
  student_name: string;
  vendor_id: number;
  vendor_name: string;
  total_amount: string;
  transaction_amount: string;
  commission: string;
  vendor_payout: string;
  status: string;
  transaction_status: string;
  created_at: string;
  item_count: number;
}

interface ReportSummary {
  total_orders: number;
  vendor_count: number;
  total_amount: string;
  total_revenue: string;
  total_commission: string;
  total_payout: string;
}

export default function AdminReportsPage() {
  const [vendors, setVendors] = useState<Array<{ id: number; stall_name: string }>>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("all");
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load vendors on mount
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const vendorList = await client.vendors();
        setVendors(vendorList);
      } catch (_err) {
        console.error("Failed to load vendors");
      }
    };
    loadVendors();
  }, []);

  // Load report data when filters change
  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await client.ordersReport(
          selectedVendor === "all" ? undefined : selectedVendor,
          selectedPeriod
        );
        setOrders(data.orders);
        setSummary(data.summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [selectedVendor, selectedPeriod]);

  const exportPDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 210; // A4 landscape height in mm

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 210;
      }

      // Generate filename with period and vendor info
      const vendorName = selectedVendor === "all" 
        ? "all-vendors" 
        : vendors.find(v => String(v.id) === selectedVendor)?.stall_name?.replace(/\s+/g, "-") || "vendor";
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `orders-report-${vendorName}-${selectedPeriod}-${timestamp}.pdf`;

      pdf.save(filename);
    } catch (err) {
      setError("Failed to export PDF");
      console.error(err);
    }
  };

  const getPeriodLabel = (period: Period): string => {
    const labels: Record<Period, string> = {
      all: "All Time",
      today: "Today",
      week: "This Week",
      month: "This Month",
      year: "This Year"
    };
    return labels[period];
  };

  return (
    <AdminLayout>
      <div className="pt-4">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-[#1F2937] md:text-2xl">Orders Report</h1>
            <p className="text-sm text-slate-500">Analyze order trends, revenue, and vendor performance</p>
          </div>
          <AdminMenuButton />
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Vendor</label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="all">All Vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={String(vendor.id)}>
                    {vendor.stall_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as Period)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          <button
            onClick={exportPDF}
            disabled={loading || !orders.length}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-500"
          >
            <Download className="h-4 w-4" />
            Export as PDF
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-primary" />
            <p className="text-sm font-semibold text-[#1F2937]">Loading report data...</p>
          </div>
        ) : (
          <div ref={reportRef} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            {/* Report Header */}
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-[#1F2937]">CampusEats Order Report</h2>
              <p className="text-sm text-slate-600">
                Period: <span className="font-semibold">{getPeriodLabel(selectedPeriod)}</span>
                {selectedVendor !== "all" && (
                  <>
                    {" | "}
                    Vendor: <span className="font-semibold">{vendors.find(v => String(v.id) === selectedVendor)?.stall_name}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-500">Generated on {new Date().toLocaleString()}</p>
            </div>

            {/* Summary Cards */}
            {summary && (
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Total Orders</p>
                  <p className="text-xl font-black text-[#1F2937]">{summary.total_orders}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-amber-600">Total Amount</p>
                  <p className="text-xl font-black text-amber-900">{formatKES(Number(summary.total_amount))}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-blue-600">Total Revenue</p>
                  <p className="text-xl font-black text-blue-900">{formatKES(Number(summary.total_revenue))}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-green-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-green-600">Commission</p>
                  <p className="text-xl font-black text-green-900">{formatKES(Number(summary.total_commission))}</p>
                </div>
              </div>
            )}

            {/* Orders Table */}
            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Order ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Vendor</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Customer</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Amount</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Commission</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Vendor Payout</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{order.public_id}</td>
                        <td className="px-3 py-2 text-slate-900">{order.vendor_name}</td>
                        <td className="px-3 py-2 text-slate-900">{order.student_name}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          {formatKES(Number(order.total_amount))}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-green-700">
                          {formatKES(Number(order.commission))}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-blue-700">
                          {formatKES(Number(order.vendor_payout))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-[0.06em] ${
                              order.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : order.status === "paid"
                                  ? "bg-blue-100 text-blue-700"
                                  : order.status === "preparing"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : order.status === "ready"
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50">
                <BarChart3 className="h-8 w-8 text-slate-400" />
                <p className="text-sm font-semibold text-slate-600">No orders found for the selected filters</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
