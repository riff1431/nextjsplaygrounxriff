"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { UserCheck, FileText, Fingerprint, Coins, ShieldAlert, Scale, Info, CheckCircle2 } from "lucide-react";

export default function CreatorOnboardingAgreementPage() {
  return (
    <InfoPageLayout 
      title="Creator Onboarding Agreement" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            1. Agreement Overview
          </h2>
          <p className="leading-relaxed">
            This Creator Onboarding Agreement (“Agreement”) is entered into between PlayGroundX (“Platform”, “we”, “us”) and You (“Creator”). By completing onboarding and verifying your identity, you agree to be legally bound by this Agreement and all related policies.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)] flex items-center gap-2">
            <Fingerprint className="w-6 h-6" />
            2. Creator Status & Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-bold text-gray-100 text-sm italic mb-2">Independent Contractor</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                You are 18+ and acting as an independent contractor, not an employee. You are solely responsible for your activities, reporting income, and paying applicable taxes.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-bold text-gray-100 text-sm italic mb-2">KYC Verification</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                You agree to provide valid government-issued ID and complete biometric verification. Providing false information constitutes fraud and results in immediate termination and legal reporting.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,230,255,0.5)] flex items-center gap-2">
            <FileText className="w-6 h-6" />
            3. Content Rights & Licensing
          </h2>
          <div className="mt-4 p-8 rounded-3xl bg-black/30 border border-white/5 text-sm text-gray-400 space-y-4">
             <p>You confirm that you own or have full rights to all content you upload and that all individuals featured are: **18+, verified, and have provided written consent**.</p>
             <p className="italic border-l-2 border-cyan-500 pl-4 py-1">
                "You grant PlayGroundX a worldwide, non-exclusive, royalty-free license to host, display, and distribute your content for platform functionality."
             </p>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-8">
           <h2 className="text-2xl font-bold text-pink-300 drop-shadow-[0_0_12px_rgba(255,100,200,0.5)] flex items-center gap-2 mb-6">
            <Coins className="w-6 h-6" />
            4. Payouts & Monetization
          </h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-center">
              <div className="p-4 rounded-xl bg-white/5">
                 <h4 className="font-bold text-gray-100 italic mb-1 uppercase tracking-widest text-[10px]">Private Rooms</h4>
                 <p className="text-fuchsia-400 font-bold">40% CREATOR</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                 <h4 className="font-bold text-gray-100 italic mb-1 uppercase tracking-widest text-[10px]">Public Rooms</h4>
                 <p className="text-gray-500 font-bold">100% PLATFORM</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                 <h4 className="font-bold text-gray-100 italic mb-1 uppercase tracking-widest text-[10px]">Tips & Gifts</h4>
                 <p className="text-emerald-400 font-bold">85% CREATOR</p>
              </div>
           </div>
           <p className="mt-6 text-[10px] text-gray-500 leading-relaxed text-center">
              Payouts processed within 7–21 days after delaying for fraud review. We may withhold earnings for chargebacks or violations.
           </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-red-600/10 border border-red-500/20">
            <h2 className="text-2xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6" />
              Prohibited Activities
            </h2>
            <ul className="mt-4 space-y-4 text-[13px] text-gray-400">
              <li className="flex items-start gap-2">
                 <span className="text-red-500 font-bold">❌</span>
                 <span>Accepting payments outside PlayGroundX.</span>
              </li>
              <li className="flex items-start gap-2">
                 <span className="text-red-500 font-bold">❌</span>
                 <span>Falsely advertising experiences or misleading users.</span>
              </li>
              <li className="flex items-start gap-2">
                 <span className="text-red-500 font-bold">❌</span>
                 <span>Using unverified participants in any content.</span>
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-emerald-600/10 border border-emerald-500/20 flex flex-col justify-center text-center">
            <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center justify-center gap-2 leading-none">
              <CheckCircle2 className="w-6 h-6" />
              Termination & Policy
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
               We may terminate or suspend your account immediately and without prior notice if you violate this Agreement or any policy. Decisions are at our sole discretion.
            </p>
            <div className="mt-6 pt-6 border-t border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Governing Law: Republic of Cyprus</span>
            </div>
          </div>
        </section>

        <section className="pt-8 border-t border-white/10 text-center">
          <div className="inline-flex items-center gap-2 text-cyan-400 font-bold tracking-widest uppercase text-[10px]">
             <Scale className="w-3 h-3 text-emerald-400" />
             Legal Compliance Agreement
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
