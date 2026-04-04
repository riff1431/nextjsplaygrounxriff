"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { Users, UserX, MessageSquare, Ban, ShieldCheck, Info } from "lucide-react";

export default function CommunityGuidelinesPage() {
  return (
    <InfoPageLayout 
      title="Community Guidelines" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            Introduction
          </h2>
          <p className="leading-relaxed">
            These Community Guidelines (Fan & User Rules) are issued by PlayGroundX Digital Ltd to ensure a respectful and safe environment for all participants. By using the platform, you agree to these rules.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-cyan-600/10 border border-cyan-500/20">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              1. Respect Creators
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed italic">
              Creators are at the heart of PlayGroundX.
            </p>
            <ul className="mt-4 space-y-2 text-[13px] text-gray-400 list-disc pl-5">
              <li>Behave respectfully at all times.</li>
              <li>No harassment, abuse, or hate speech.</li>
              <li>No personal attacks or bullying.</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-red-600/10 border border-red-500/20">
            <h2 className="text-2xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <Ban className="w-6 h-6" />
              2. No Recording
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed italic">
              Content is temporary and exclusive.
            </p>
            <ul className="mt-4 space-y-2 text-[13px] text-gray-400 list-disc pl-5 font-bold">
              <li>NO recording of live streams.</li>
              <li>NO downloading or redistributing content.</li>
              <li>NO sharing content externally.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)]">
            3. Platform Rules
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <MessageSquare className="w-6 h-6 text-cyan-400 mb-3" />
              <h3 className="font-bold text-gray-100 text-sm italic">No Off-Platform</h3>
              <p className="text-[11px] text-gray-400 mt-2">Requesting external payments or moving interactions off-platform is strictly prohibited.</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <ShieldCheck className="w-6 h-6 text-fuchsia-400 mb-3" />
              <h3 className="font-bold text-gray-100 text-sm italic">Payment Integrity</h3>
              <p className="text-[11px] text-gray-400 mt-2">All transactions must remain on-platform. Chargebacks or fraud attempt result in immediate bans.</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <UserX className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="font-bold text-gray-100 text-sm italic">No Impersonation</h3>
              <p className="text-[11px] text-gray-400 mt-2">Falsifying identity, spamming creators, or misleading behavior is not tolerated.</p>
            </div>
          </div>
        </section>

        <section className="bg-white/5 p-10 rounded-3xl border border-white/10 text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4 uppercase tracking-widest">
            Enforcement
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            Violations result in immediate action, ranging from warnings to permanent account displacement and banning.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
             <span className="px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase tracking-widest border border-yellow-500/30">Warning</span>
             <span className="px-4 py-1 rounded-full bg-orange-500/20 text-orange-500 text-[10px] font-bold uppercase tracking-widest border border-orange-500/30">Suspension</span>
             <span className="px-4 py-1 rounded-full bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest border border-red-500/30">Permanent Ban</span>
          </div>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
