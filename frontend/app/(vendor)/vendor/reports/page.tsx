"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Download } from "lucide-react";
import { VendorLayout, VendorMenuButton } from "@/components/Layout";
import { useSession } from "@/components/providers";
import { client } from "@/lib/api";
import { formatKES } from "@/lib/utils";

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

function getPeriodLabel(period: Period) {
  const labels: Record<Period, string> = {
    all: "All Time",
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year"
  };
  return labels[period];
}

export default function VendorReportsPage() {
  const { profile } = useSession();
  const vendorId = profile?.role === "vendor" ? profile.vendorId : undefined;

  const [selectedPeriod, setSelectedPeriod] = useState<Period>("all");
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vendorId) return;

    const loadReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await client.vendorOrdersReport(vendorId, selectedPeriod);
        setOrders(data.orders);
        setSummary(data.summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [selectedPeriod, vendorId]);

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

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 210;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 210;
      }

      const vendorName = (orders[0]?.vendor_name ?? "vendor").replace(/\s+/g, "-");
      const timestamp = new Date().toISOString().split("T")[0];
      pdf.save(`vendor-report-${vendorName}-${selectedPeriod}-${timestamp}.pdf`);
    } catch (_err) {
      setError("Failed to export PDF");
    }
  };

  return (
    <VendorLayout>
      <div className="pt-4">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-[#1F2937] md:text-2xl">Business Report</h1>
            <p className="text-sm text-slate-500">Review your orders, revenue, and payouts</p>
          </div>
          <VendorMenuButton />
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="flex items-end">
              <button
                onClick={exportPDF}
                disabled={loading || !orders.length}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-500 md:w-auto"
              >
                <Download className="h-4 w-4" />
                Export as PDF
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-primary" />
            <p className="text-sm font-semibold text-[#1F2937]">Loading report...</p>
          </div>
        ) : (
          <div ref={reportRef} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-[#1F2937]">Vendor Report</h2>
              <p className="text-sm text-slate-600">
                Period: <span className="font-semibold">{getPeriodLabel(selectedPeriod)}</span>
              </p>
            </div>

            {summary ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Total Orders</p>
                  <p className="mt-1 text-2xl font-black text-[#1F2937]">{summary.total_orders}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Gross Sales</p>
                  <p className="mt-1 text-2xl font-black text-[#1F2937]">{formatKES(summary.total_amount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Commission</p>
                  <p className="mt-1 text-2xl font-black text-[#1F2937]">{formatKES(summary.total_commission)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Payout</p>
                  <p className="mt-1 text-2xl font-black text-[#1F2937]">{formatKES(summary.total_payout)}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-600">
                No report data for this period.
              </div>
            )}

            {orders.length ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Payout</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 80).map((order) => (
                      <tr key={order.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-semibold text-[#1F2937]">{order.public_id}</td>
                        <td className="px-4 py-3 text-slate-600">{order.student_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{order.item_count}</td>
                        <td className="px-4 py-3 font-semibold text-[#1F2937]">{formatKES(order.total_amount)}</td>
                        <td className="px-4 py-3 font-semibold text-[#1F2937]">{formatKES(order.vendor_payout)}</td>
                        <td className="px-4 py-3 text-slate-600">{order.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
