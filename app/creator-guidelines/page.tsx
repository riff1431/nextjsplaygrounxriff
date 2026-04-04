"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { UserCheck, Coins, Ban, ShieldCheck, Info, Gift, MonitorPlay, Lock } from "lucide-react";

export default function CreatorGuidelinesPage() {
  return (
    <InfoPageLayout 
      title="Creator Guidelines & Monetization" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            1. Role of Creators
          </h2>
          <p className="leading-relaxed">
            Creators are independent users who host Rooms, create and upload content, and interact with Fans. They are fully responsible for their content and conduct under PlayGroundX and applicable laws.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)] flex items-center gap-2">
            <UserCheck className="w-6 h-6" />
            2. Performance Expectations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-bold text-gray-100 text-sm italic mb-2">Room Behavior</h3>
              <p className="text-[11px] text-gray-400">Behave professionally, maintain engagement, and avoid misleading promises. Creators must not abandon rooms immediately after entry or use deceptive session behavior.</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-bold text-gray-100 text-sm italic mb-2">Consent & Verification</h3>
              <p className="text-[11px] text-gray-400">All content must involve only individuals 18+ who have provided written consent. Features with unverified individuals are strictly prohibited.</p>
            </div>
          </div>
        </section>

        <section className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden p-8 shadow-[0_0_30px_rgba(255,0,200,0.1)]">
          <h2 className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,230,255,0.5)] flex items-center gap-2 mb-6">
            <Coins className="w-6 h-6" />
            3. Monetization Structure
          </h2>
          
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-fuchsia-400">
                     <MonitorPlay className="w-4 h-4" />
                     Public Rooms
                  </h4>
                  <div className="space-y-2 text-[13px] text-gray-300">
                     <p className="flex justify-between border-b border-white/5 py-1"><span>Entry Fees</span> <span className="font-bold text-gray-500">100% PLATFORM</span></p>
                     <p className="flex justify-between border-b border-white/5 py-1"><span>Per-Minute Billing</span> <span className="font-bold text-gray-500">100% PLATFORM</span></p>
                     <p className="flex justify-between border-b border-white/5 py-1"><span>Tips</span> <span className="font-bold text-emerald-400">85% CREATOR</span></p>
                     <p className="flex justify-between py-1"><span>Gifts</span> <span className="font-bold text-emerald-400">UP TO 100% CREATOR</span></p>
                  </div>
               </div>
               <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400">
                     <Lock className="w-4 h-4" />
                     Private Rooms
                  </h4>
                  <div className="space-y-2 text-[13px] text-gray-300">
                     <p className="flex justify-between border-b border-white/5 py-1"><span>Entry Fees</span> <span className="font-bold text-emerald-400 text-xs">40% CR / 60% PL</span></p>
                     <p className="flex justify-between border-b border-white/5 py-1"><span>Per-Minute Billing</span> <span className="font-bold text-emerald-400 text-xs">40% CR / 60% PL</span></p>
                     <p className="flex justify-between border-b border-white/5 py-1"><span>Tips</span> <span className="font-bold text-emerald-400">85% CREATOR</span></p>
                     <p className="flex justify-between py-1"><span>Gifts</span> <span className="font-bold text-emerald-400">UP TO 100% CREATOR</span></p>
                  </div>
               </div>
            </div>
            
            <div className="mt-8 p-4 rounded-xl bg-cyan-600/5 border border-cyan-500/20 text-[10px] text-cyan-200/60 font-bold italic leading-relaxed text-center">
               PlayGroundX Digital Ltd reserves full discretion over pricing and revenue distribution.
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-red-600/10 border border-red-500/20">
            <h2 className="text-2xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <Ban className="w-6 h-6" />
              Prohibited Behavior
            </h2>
            <ul className="mt-4 space-y-4 text-[13px] text-gray-400">
              <li className="flex items-start gap-2">
                 <span className="text-red-500 font-bold">❌</span>
                 <span>Requesting payments or moving communication off-platform.</span>
              </li>
              <li className="flex items-start gap-2">
                 <span className="text-red-500 font-bold">❌</span>
                 <span>Promising specific actions during sessions and not delivering.</span>
              </li>
              <li className="flex items-start gap-2">
                 <span className="text-red-500 font-bold">❌</span>
                 <span>Using AI or synthetic content without clear labeling or consent.</span>
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-emerald-600/10 border border-emerald-500/20">
            <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" />
              Compliance Enforcement
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
               Violations result in warnings, content removal, or permanent bans. Earnings may be forfeited due to refunds, chargebacks, or fraud.
            </p>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
               <h4 className="font-bold text-gray-100 mb-2 italic text-[10px] uppercase tracking-widest">Payout Reviews:</h4>
               <ul className="text-[10px] text-gray-500 space-y-1 list-disc pl-4">
                  <li>Delayed payouts (7–21 days)</li>
                  <li>Holds for fraud monitoring</li>
                  <li>Identity verification checks</li>
               </ul>
            </div>
          </div>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-2 text-cyan-400 font-bold tracking-widest uppercase text-[10px]">
             <Gift className="w-3 h-3 text-fuchsia-500" />
             Creator Ecosystem Policy
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
