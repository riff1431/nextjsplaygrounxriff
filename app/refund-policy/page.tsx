"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import DynamicPageContent from "@/components/common/DynamicPageContent";
import { Wallet, Ban, AlertTriangle, ShieldCheck, Scale, Info, CreditCard, History } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <InfoPageLayout 
      title="Refund & Chargeback Policy" 
      subtitle="Last Updated: April 1st 2026"
    >
      <DynamicPageContent pageKey="page_refund_policy" fallback={
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            1. General Refund Policy
          </h2>
          <p className="leading-relaxed">
            All purchases on PlayGroundX are digital, immediately consumed, and non-reversible. No refunds are provided once access is granted.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="p-8 rounded-3xl bg-cyan-600/10 border border-cyan-500/20">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              2. Wallet System
            </h2>
            <ul className="mt-4 space-y-4 text-[13px] text-gray-300 list-disc pl-5">
              <li>Users fund an internal wallet before spending.</li>
              <li>Minimum funding is €25.</li>
              <li>Spend is deducted first from the wallet balance.</li>
              <li>Used wallet funds are strictly non-refundable.</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-fuchsia-600/10 border border-fuchsia-500/20">
            <h2 className="text-2xl font-bold text-fuchsia-300 mb-4 flex items-center gap-2">
              <History className="w-6 h-6" />
              3. Live Room Purchases
            </h2>
            <ul className="mt-4 space-y-4 text-[13px] text-gray-300 list-disc pl-5">
              <li>Entry fees and per-minute billing apply upon room entry.</li>
              <li>Minutes are charged in full increments.</li>
              <li>Leaving a room does not reverse charges.</li>
              <li>Tips and gifts are non-reversible.</li>
            </ul>
          </div>
        </section>

        <section className="p-10 rounded-3xl bg-red-600/10 border border-red-500/30">
          <h2 className="text-3xl font-bold text-red-500 mb-4 flex items-center gap-3">
             <Ban className="w-8 h-8" />
             Chargebacks are Prohibited
          </h2>
          <p className="text-gray-200 leading-relaxed font-bold italic mb-6">
             Zero Tolerance Policy for Payment Disputes
          </p>
          <div className="space-y-4 text-sm text-gray-400">
             <p>Chargebacks are strictly prohibited and considered a violation of our Terms. If a chargeback is initiated:</p>
             <ul className="list-disc pl-6 space-y-2 text-red-400 font-bold uppercase tracking-widest text-[10px]">
                <li>Account permanently terminated</li>
                <li>All earnings reversed</li>
                <li>Wallet access revoked</li>
                <li>Permanent Platform ban</li>
             </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,230,255,0.5)] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            4. Creator Performance
          </h2>
          <p className="mt-4 text-gray-300 text-sm leading-relaxed italic">
            If a Creator fails to deliver as described, PlayGroundX may (at its sole discretion) issue partial or full refunds. Repeated performance issues result in penalties for Creators.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-fuchsia-400" />
            Fraud Monitoring
          </h2>
          <p className="mt-4 text-gray-400 text-[11px] leading-relaxed italic">
            PlayGroundX actively monitors for suspicious transactions and abnormal usage. We may block transactions, freeze accounts, or apply payout holds to protect the platform.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-2 text-cyan-400 font-bold tracking-widest uppercase text-[10px]">
             <CreditCard className="w-3 h-3 text-emerald-400" />
             Payment & Refund Compliance
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
