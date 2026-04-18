import { StudentLayout } from "@/components/Layout";

export default function PrivacyPage() {
  return (
    <StudentLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 lg:px-8">
        <h1 className="text-2xl font-black text-[#1F2937] md:text-3xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-600 md:text-base">This policy explains how CampusEats handles personal data.</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Effective date: April 18, 2026</p>

        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">What we collect</h2>
            <p className="mt-1 text-sm text-slate-600">Basic account details, order history, and delivery information required to process campus food orders.</p>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">How data is used</h2>
            <p className="mt-1 text-sm text-slate-600">We use collected information to fulfill orders, improve service reliability, and provide support.</p>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Data sharing</h2>
            <p className="mt-1 text-sm text-slate-600">Relevant order information is shared with vendors and payment providers only as needed for transaction completion.</p>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Contact for privacy requests</h2>
            <p className="mt-1 text-sm text-slate-600">For data access or correction requests, contact support@campuseats.co.ke.</p>
          </div>
        </div>
      </section>
    </StudentLayout>
  );
}
