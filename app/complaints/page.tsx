"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { MessageSquare, Mail, ShieldCheck, Scale, Info, CheckCircle2, AlertCircle } from "lucide-react";

export default function ComplaintsPolicyPage() {
  return (
    <InfoPageLayout 
      title="Complaints Policy" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            Introduction
          </h2>
          <p className="leading-relaxed">
            This Complaints Policy is issued by PlayGroundX Digital Ltd to ensure all user concerns are handled fairly and transparently. We are committed to maintaining a high-quality experience for both Fans and Creators.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="p-8 rounded-3xl bg-cyan-600/10 border border-cyan-500/20">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              1. Submitting a Complaint
            </h2>
            <p className="text-sm text-gray-400 mb-4 italic">
               Users may submit complaints regarding:
            </p>
            <ul className="space-y-2 text-[13px] text-gray-300 list-disc pl-5">
              <li>Platform behavior or user conduct.</li>
              <li>Moderation decisions and enforcement.</li>
              <li>Technical issues or bugs.</li>
              <li>Payment and billing concerns.</li>
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
              2. Handling Process
            </h2>
            <ul className="mt-4 space-y-4 text-[13px] text-gray-400">
              <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">✓</span>
                 <span>Acknowledge receipt and log the issue.</span>
              </li>
              <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">✓</span>
                 <span>Review the facts against Platform policies.</span>
              </li>
              <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">✓</span>
                 <span>Request additional info if needed.</span>
              </li>
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">✓</span>
                 <span>Respond within **7–14 days**.</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-8">
           <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,100,200,0.5)] flex items-center gap-2 mb-6">
            <AlertCircle className="w-6 h-6" />
            3. Possible Outcomes
          </h2>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-center font-bold uppercase tracking-widest">
              <div className="p-3 rounded-xl bg-white/5 text-gray-500">Clarification</div>
              <div className="p-3 rounded-xl bg-white/5 text-cyan-400">Reversal of Action</div>
              <div className="p-3 rounded-xl bg-white/5 text-fuchsia-400">Enforcement Action</div>
              <div className="p-3 rounded-xl bg-white/5 text-gray-500">No Further Action</div>
           </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-cyan-400" />
            Escalation & Resolution
          </h2>
          <p className="mt-4 text-gray-400 text-[11px] leading-relaxed italic">
            If you are not satisfied with our response, you may escalate the matter or pursue dispute resolution as permitted under applicable law, including EU Digital Services Act (DSA) provisions.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-2 text-emerald-400 font-bold tracking-widest uppercase text-[10px]">
             <ShieldCheck className="w-3 h-3" />
             User Support Integrity Policy
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
