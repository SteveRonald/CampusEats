import { StudentLayout } from "@/components/Layout";

export default function TermsPage() {
  return (
    <StudentLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 lg:px-8">
        <h1 className="text-2xl font-black text-[#1F2937] md:text-3xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-600 md:text-base">These terms govern your use of CampusEats.</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Effective date: April 18, 2026</p>

        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Account responsibility</h2>
            <p className="mt-1 text-sm text-slate-600">You are responsible for maintaining the security of your account credentials and profile details.</p>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Orders and payments</h2>
            <p className="mt-1 text-sm text-slate-600">Orders become active once payment is successfully processed through supported payment methods.</p>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Vendor obligations</h2>
            <p className="mt-1 text-sm text-slate-600">Vendors must provide accurate menu details, pricing, and delivery estimates, and comply with verification requirements.</p>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Platform updates</h2>
            <p className="mt-1 text-sm text-slate-600">We may update these terms as features evolve. Continued use indicates acceptance of revised terms.</p>
          </div>
        </div>
      </section>
    </StudentLayout>
  );
}
