import { StudentLayout } from "@/components/Layout";

export default function AboutPage() {
  return (
    <StudentLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 lg:px-8">
        <h1 className="text-2xl font-black text-[#1F2937] md:text-3xl">About CampusEats</h1>
        <p className="mt-3 text-sm text-slate-600 md:text-base">
          CampusEats connects students with trusted campus food vendors. Our goal is simple: make it easy to discover meals,
          place orders, and receive food with a predictable delivery window.
        </p>

        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">What we focus on</h2>
            <p className="mt-1 text-sm text-slate-600">Fast ordering flow, reliable delivery expectations, and verified vendor operations.</p>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Vendor quality controls</h2>
            <p className="mt-1 text-sm text-slate-600">
              Vendor profiles and menu items are reviewed through admin verification workflows before they are visible to students.
            </p>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Campus-first design</h2>
            <p className="mt-1 text-sm text-slate-600">Built around student schedules, hostel delivery areas, and mobile-friendly ordering.</p>
          </div>
        </div>
      </section>
    </StudentLayout>
  );
}
