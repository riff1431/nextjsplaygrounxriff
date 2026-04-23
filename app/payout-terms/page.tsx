"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import DynamicPageContent from "@/components/common/DynamicPageContent";
import { Coins, MonitorPlay, Lock, Clock, ShieldCheck, Scale, Info, Gift } from "lucide-react";

export default function CreatorPayoutTermsPage() {
  return (
    <InfoPageLayout 
      title="Creator Payout Terms" 
      subtitle="Last Updated: April 1st 2026"
    >
      <DynamicPageContent pageKey="page_payout_terms" fallback={
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            Introduction
          </h2>
          <p className="leading-relaxed">
            These Creator Payout Terms form part of the PlayGroundX Terms of Service and apply to all Creators earning on the platform. In the event of conflict, the Terms of Service shall prevail.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)] flex items-center gap-2">
            <Coins className="w-6 h-6" />
            1. Revenue Model & Splits
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
               <h4 className="font-bold text-gray-100 italic mb-2 uppercase tracking-widest text-[9px]">Tips</h4>
               <p className="text-emerald-400 font-black text-xl">85%</p>
               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Creator</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
               <h4 className="font-bold text-gray-100 italic mb-2 uppercase tracking-widest text-[9px]">Gifts</h4>
               <p className="text-emerald-400 font-black text-xl">100%</p>
               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Creator (Up to)</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
               <h4 className="font-bold text-gray-100 italic mb-2 uppercase tracking-widest text-[9px]">Private Room</h4>
               <p className="text-emerald-400 font-black text-xl">40%</p>
               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Creator</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
               <h4 className="font-bold text-gray-100 italic mb-2 uppercase tracking-widest text-[9px]">Public Room</h4>
               <p className="text-gray-500 font-black text-xl">0%</p>
               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Creator (PL Only)</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed italic text-center border-l-2 border-fuchsia-500 pl-4 py-1">
             Public room entry and per-minute billing is 100% platform revenue. Tips and Gifts are shared within individual session contexts.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-cyan-600/10 border border-cyan-500/20">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              2. Timing & Processing
            </h2>
            <ul className="mt-4 space-y-4 text-[13px] text-gray-400">
               <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">⏱</span>
                  <span>Payouts typically processed after **7–21 days**.</span>
               </li>
               <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">⚖️</span>
                  <span>Subject to extensive fraud and chargeback review.</span>
               </li>
               <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">💰</span>
                  <span>Minimum payout threshold must be met before withdrawal.</span>
               </li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-red-600/10 border border-red-500/20">
            <h2 className="text-2xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" />
              3. Holds & Deductions
            </h2>
            <ul className="mt-4 space-y-4 text-[13px] text-gray-400">
               <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">❌</span>
                  <span>Revenue may be reversed for fraud or chargebacks.</span>
               </li>
               <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">⚠️</span>
                  <span>Earnings are recovered in cases of content non-delivery.</span>
               </li>
               <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">🔒</span>
                  <span>Holds apply if identity or tax info is inaccurate.</span>
               </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-fuchsia-400" />
            Legal Notice
          </h2>
          <p className="mt-4 text-gray-400 text-[11px] leading-relaxed italic">
            PlayGroundX Digital Ltd reserves the right to modify revenue splits, monetization mechanics, and pricing structures at any time. Continual use of the platform constitutes agreement to the current terms.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-2 text-cyan-400 font-bold tracking-widest uppercase text-[10px]">
             <Gift className="w-3 h-3 text-emerald-400" />
             Creator Payment & Revenue Policy
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
      } />
    </InfoPageLayout>
  );
}
