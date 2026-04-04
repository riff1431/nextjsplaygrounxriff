"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { ShieldAlert, Fingerprint, Ban, AlertTriangle, Scale, Lock, Info } from "lucide-react";

export default function AcceptableUsePolicyPage() {
  return (
    <InfoPageLayout 
      title="Acceptable Use Policy (AUP)" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300 italic">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2 not-italic">
            <Info className="w-5 h-5 text-cyan-400" />
            1. Overview
          </h2>
          <p className="leading-relaxed">
            This Acceptable Use Policy (“AUP”) governs how you may use PlayGroundX. Any violation may result in content removal, account suspension or termination, withholding of earnings, and reporting to authorities where required.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500 not-italic">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)] flex items-center gap-2">
            <Ban className="w-6 h-6 text-red-500" />
            2. Prohibited Content & Conduct
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-100 mb-3 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-rose-500" />
                2.1 Minors & Identity
              </h3>
              <ul className="text-xs text-gray-400 space-y-2 list-disc pl-5">
                <li>Any person under 18</li>
                <li>Anyone not fully verified through PlayGroundX</li>
                <li>Any content suggesting minors (including roleplay)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-100 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                2.2 Illegal & Non-Consensual
              </h3>
              <ul className="text-xs text-gray-400 space-y-2 list-disc pl-5">
                <li>Sexual assault, coercion, or non-consensual acts</li>
                <li>Incest, bestiality, necrophilia</li>
                <li>Human trafficking or solicitation</li>
                <li>AI-generated likeness without consent</li>
              </ul>
            </div>

            <div>
               <h3 className="text-lg font-bold text-gray-100 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                2.5 Harassment & Abuse
              </h3>
              <ul className="text-xs text-gray-400 space-y-2 list-disc pl-5">
                <li>Hate speech or discrimination</li>
                <li>Threats, bullying, or doxxing</li>
                <li>Misleading monetization (bait-and-switch)</li>
              </ul>
            </div>

            <div>
               <h3 className="text-lg font-bold text-gray-100 mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                2.10 Off-Platform Transactions
              </h3>
              <ul className="text-xs text-gray-400 space-y-2 list-disc pl-5">
                <li>Attempting to move users off-platform for payments</li>
                <li>Arranging in-person services</li>
                <li>Bypassing platform monetization systems</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] flex items-center gap-2">
            <Scale className="w-6 h-6" />
            3. Enforcement
          </h2>
          <p className="mt-4 text-gray-300 text-sm leading-relaxed italic">
            PlayGroundX reserves the right to remove content immediately, freeze earnings, reverse transactions, and report violations to authorities at its sole discretion.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-2 text-rose-500 font-bold tracking-widest uppercase text-[10px]">
             <ShieldAlert className="w-3 h-3 text-red-500" />
             Content Governance Policy
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
