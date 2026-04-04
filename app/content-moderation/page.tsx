"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { ShieldCheck, Eye, MessageSquare, AlertTriangle, Scale, Mail, Info, Bot } from "lucide-react";

export default function ContentModerationPage() {
  return (
    <InfoPageLayout 
      title="Content Moderation & DSA" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            1. Role of PlayGroundX
          </h2>
          <p className="leading-relaxed">
            PlayGroundX is an intermediary platform that hosts user-generated content and facilitates interactions. We do not pre-approve all content but actively monitor for compliance using automated systems, manual review, and user reports.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)]">
            Content Moderation Methods
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <Bot className="w-6 h-6 text-cyan-400 mb-3" />
              <h3 className="font-bold text-gray-100 text-sm">Automated Tools</h3>
              <p className="text-[11px] text-gray-400 mt-2">AI detection and pattern recognition for fraud, abuse, and illegal content.</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <Eye className="w-6 h-6 text-fuchsia-400 mb-3" />
              <h3 className="font-bold text-gray-100 text-sm">Human Review</h3>
              <p className="text-[11px] text-gray-400 mt-2">Trained moderation team for sensitive cases and escalations.</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <MessageSquare className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="font-bold text-gray-100 text-sm">User Reporting</h3>
              <p className="text-[11px] text-gray-400 mt-2">Real-time reporting tools and complaint submission system.</p>
            </div>
          </div>
        </section>

        <section className="p-8 rounded-3xl bg-pink-600/10 border border-pink-500/30">
          <h2 className="text-3xl font-bold text-pink-500 mb-4 flex items-center gap-3">
             <AlertTriangle className="w-8 h-8" />
             Notice & Action (DSA)
          </h2>
          <p className="text-gray-200 leading-relaxed font-bold italic mb-6">
             EU Digital Services Act Compliance
          </p>
          <div className="space-y-4 text-sm text-gray-400">
             <p>Users may report illegal content or policy violations via the in-app "Report" button or by emailing **support@playgroundx.vip**.</p>
             <p>Reports are typically reviewed within **24–72 hours**.</p>
             <h4 className="font-bold text-gray-100 mt-4 italic uppercase tracking-widest text-[10px]">Possible Actions:</h4>
             <ul className="list-disc pl-6 space-y-1 text-pink-400/80 text-xs">
                <li>Remove content</li>
                <li>Restrict visibility</li>
                <li>Suspend or terminate accounts</li>
                <li>Report to law enforcement</li>
             </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,230,255,0.5)] flex items-center gap-2">
            <Scale className="w-6 h-6" />
            Statement of Reasons & Appeals
          </h2>
          <p className="mt-4 text-gray-300 text-sm leading-relaxed">
            If we take action against your content or account, we will provide a **Statement of Reasons** explaining the violation. Users have the right to appeal these decisions through our internal appeal process or seek out-of-court dispute resolution.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)] flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Contact
          </h2>
          <div className="mt-4 p-6 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-gray-300 text-xs mb-4">
                For moderation or DSA-related inquiries, please contact:
            </p>
            <a href="mailto:support@playgroundx.vip" className="text-sm font-bold text-cyan-500 hover:text-cyan-400 transition-colors drop-shadow-[0_0_10px_rgba(0,230,255,0.3)]">
                support@playgroundx.vip
            </a>
          </div>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-2 text-emerald-400 font-bold tracking-widest uppercase text-[10px]">
             <ShieldCheck className="w-3 h-3" />
             DSA Compliant Platform
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
