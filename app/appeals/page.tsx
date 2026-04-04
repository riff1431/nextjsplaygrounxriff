"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { ShieldCheck, Scale, Mail, Info, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function AppealsPolicyPage() {
  return (
    <InfoPageLayout 
      title="Appeals Policy" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            Right to Appeal
          </h2>
          <p className="leading-relaxed">
            Users may appeal moderation decisions, content removals, account suspensions, and payout holds. We provide a fair review process to ensure policies are applied correctly.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="p-8 rounded-3xl bg-cyan-600/10 border border-cyan-500/20">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              1. Submission Requirements
            </h2>
            <p className="text-sm text-gray-400 mb-4 italic">
               Appeals must include:
            </p>
            <ul className="space-y-2 text-[13px] text-gray-300 list-disc pl-5">
              <li>Full account details and username.</li>
              <li>Clear reason for the appeal.</li>
              <li>Supporting evidence or context.</li>
              <li>Specific action or content involved.</li>
            </ul>
             <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <a href="mailto:support@playgroundx.vip" className="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                   support@playgroundx.vip
                </a>
             </div>
          </div>

          <div className="p-8 rounded-3xl bg-emerald-600/10 border border-emerald-500/20">
            <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              2. Review Process
            </h2>
            <ul className="mt-4 space-y-4 text-[13px] text-gray-400">
              <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">✓</span>
                 <span>Reviewed by a separate moderator where possible.</span>
              </li>
              <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">✓</span>
                 <span>Evaluated against platform policies and legality.</span>
              </li>
              <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">✓</span>
                 <span>Decisions aim to be provided within **7–14 days**.</span>
              </li>
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">✓</span>
                 <span>Final decision communicated via email.</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-8">
           <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,100,200,0.5)] flex items-center gap-2 mb-6">
            <AlertCircle className="w-6 h-6" />
            3. Final Decisions
          </h2>
           <p className="text-sm text-gray-400 leading-relaxed italic mb-4">
              PlayGroundX decisions are final after the appeal process.
           </p>
           <p className="text-[11px] text-gray-500 leading-relaxed">
              If you remain dissatisfied, you may pursue dispute resolution as permitted under law, including EU Digital Services Act (DSA) provisions where applicable.
           </p>
        </section>

        <section className="pt-8 border-t border-white/10 text-center">
          <div className="inline-flex items-center gap-2 text-cyan-400 font-bold tracking-widest uppercase text-[10px]">
             <ShieldCheck className="w-3 h-3 text-emerald-400" />
             Governance & Support Transparency
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
