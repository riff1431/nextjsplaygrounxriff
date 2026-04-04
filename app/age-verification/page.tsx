"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { ShieldAlert, Fingerprint, UserCheck, Scale, Mail, AlertTriangle, ShieldCheck } from "lucide-react";

export default function AgeVerificationPage() {
  return (
    <InfoPageLayout 
      title="Age Verification & Identity" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-red-500/5 p-6 rounded-2xl border border-red-500/20">
          <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Strict Adult-Only Platform
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            PlayGroundX is a platform restricted to adults. We enforce strict age verification and identity checks to ensure no minors access or appear on the Platform and that all content is lawful and consensual.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-sm font-mono text-gray-400">
            Operator: PlayGroundX Digital Ltd<br />
            75 Prodromou, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)] flex items-center gap-2">
            <Fingerprint className="w-6 h-6" />
            1. Minimum Age Requirement
          </h2>
          <p className="mt-4 text-gray-300 leading-relaxed">
            You must be **18 years of age or older** to create an account, access content, or participate as a Creator. Any attempt to access or use the Platform under the age of 18 is strictly prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,230,255,0.5)] flex items-center gap-2">
            <UserCheck className="w-6 h-6" />
            3. Creator Verification (KYC)
          </h2>
          <div className="mt-4 space-y-4">
            <p className="text-gray-300 text-sm">
                All Creators must complete identity verification before uploading content, hosting Rooms, or receiving earnings.
            </p>
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-bold text-gray-100 mb-3 italic text-xs uppercase tracking-widest">Required Documents:</h3>
                <ul className="text-xs text-gray-400 space-y-2 list-disc pl-5">
                    <li>Valid government-issued photo ID</li>
                    <li>Real-time selfie verification (Liveness detection)</li>
                    <li>Full legal name and date of birth</li>
                    <li>Payment and payout information</li>
                </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-pink-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)]">
            4. Content Participants
          </h2>
          <div className="mt-4 p-6 rounded-2xl border border-pink-500/20 bg-pink-500/5 text-sm text-gray-300 leading-relaxed">
            If a Creator uploads content involving another person, that individual must also be **18+**. The Creator must obtain a valid ID and a signed consent/release form for every participant. Failure to provide these may result in content removal and account termination.
          </div>
        </section>

        <section className="p-8 rounded-3xl bg-red-600/10 border border-red-500/30">
          <h2 className="text-3xl font-bold text-red-500 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8" />
            8. Zero Tolerance Policy
          </h2>
          <p className="text-gray-200 leading-relaxed font-bold italic mb-6">
            PlayGroundX enforces a strict zero-tolerance policy for any content involving minors.
          </p>
          <div className="space-y-4 text-sm text-gray-400">
            <p>If we detect or suspect underage individuals, falsified identity documents, or misrepresentation of age, we will:</p>
            <ul className="list-disc pl-6 space-y-1 text-red-400/80">
                <li>Immediately remove content</li>
                <li>Suspend or terminate the account</li>
                <li>Report to law enforcement and relevant authorities</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)] flex items-center gap-2">
            <Mail className="w-6 h-6" />
            9. Reporting Underage Content
          </h2>
          <div className="mt-4 p-6 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-gray-300 text-sm mb-4">
                If you believe content involves a minor, report immediately as high priority:
            </p>
            <a href="mailto:support@playgroundx.vip" className="text-xl font-bold text-pink-500 hover:text-pink-400 transition-colors drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                support@playgroundx.vip
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-400" />
            13. Legal Compliance
          </h2>
          <p className="mt-4 text-gray-400 text-xs leading-relaxed italic">
            This Policy is designed to comply with the **EU Digital Services Act (DSA)**, applicable age verification laws, and anti-exploitation regulations. PlayGroundX reserves the right to request identity verification at any time.
          </p>
        </section>

        <section className="pt-8 border-t border-white/10 text-center">
          <div className="inline-flex items-center gap-2 text-red-400 font-bold tracking-widest uppercase text-[10px]">
            <ShieldCheck className="w-3 h-3" />
            Age Verified Platform
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
