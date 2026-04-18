"use client";

import { useEffect, useState } from "react";
import { StudentLayout } from "@/components/Layout";
import { client } from "@/lib/api";

export default function ContactPage() {
  const [contact, setContact] = useState({
    supportEmail: "support@campuseats.co.ke",
    supportPhone: "+254700000000",
    supportHours: "Monday to Sunday, 7:00 AM to 10:00 PM"
  });

  useEffect(() => {
    client
      .publicContactInfo()
      .then((data) => {
        setContact(data);
      })
      .catch(() => {
        // Keep safe defaults if endpoint is unavailable.
      });
  }, []);

  return (
    <StudentLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 lg:px-8">
        <h1 className="text-2xl font-black text-[#1F2937] md:text-3xl">Contact Us</h1>
        <p className="mt-3 text-sm text-slate-600 md:text-base">
          Reach out for account help, order issues, or vendor onboarding questions.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-[#1F2937]">Support Email</h2>
            <a href={`mailto:${contact.supportEmail}`} className="mt-2 inline-block text-sm font-semibold text-primary underline underline-offset-2">
              {contact.supportEmail}
            </a>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-[#1F2937]">Phone / WhatsApp</h2>
            <a href={`tel:${contact.supportPhone}`} className="mt-2 inline-block text-sm font-semibold text-primary underline underline-offset-2">
              {contact.supportPhone}
            </a>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 md:col-span-2">
            <h2 className="text-sm font-bold text-[#1F2937]">Operating Hours</h2>
            <p className="mt-2 text-sm text-slate-600">{contact.supportHours}</p>
          </div>
        </div>
      </section>
    </StudentLayout>
  );
}
