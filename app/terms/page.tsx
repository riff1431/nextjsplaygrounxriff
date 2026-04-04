"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { ShieldCheck, Gavel, Scale, AlertCircle, Coins, HeartHandshake } from "lucide-react";

export default function TermsPage() {
  return (
    <InfoPageLayout 
      title="Terms of Service" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Operator Information
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            This terms and conditions is issued by <strong>PlayGroundX Digital Ltd</strong> (operating as PlayGroundX), a company registered in the Republic of Cyprus.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-sm font-mono text-gray-400">
            PlayGroundX Digital Ltd<br />
            75 Prodromou,<br />
            ONEWORLD PARKVIEW HOUSE, Floor 4,<br />
            2063, Nicosia, Cyprus.
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)] flex items-center gap-2">
            <Gavel className="w-6 h-6" />
            1. Introduction
          </h2>
          <div className="mt-4 space-y-4 text-gray-300 leading-relaxed">
            <p>
              By accessing or using PlayGroundX Digital Ltd (“PlayGroundX”, "Platform", “we”, “us”, “our”), you agree to these Terms of Service (“Terms”). If you do not agree, do not use the Platform.
            </p>
            <p>
              PlayGroundX is an interactive entertainment platform where Users pay for access to live digital experiences, including Rooms, content, and interactions.
            </p>
            <p className="text-sm italic text-gray-500">
              We may update these Terms at any time. Continued use constitutes acceptance.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,230,255,0.5)]">
            2. Definitions
          </h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "User", text: "Any person using PlayGroundX" },
              { label: "Creator", text: "A User who hosts Rooms or uploads content" },
              { label: "Fan", text: "A User who purchases access or interacts" },
              { label: "Room", text: "Live or interactive experience hosted by a Creator" },
              { label: "Fan Payment", text: "Any payment made by a Fan" },
              { label: "Wallet", text: "Prepaid balance used for transactions" },
              { label: "Creator Earnings", text: "Amount payable to Creator after fees" },
            ].map((def) => (
              <div key={def.label} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="font-bold text-gray-100">{def.label}:</span>{" "}
                <span className="text-gray-400">{def.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-pink-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)]">
            3. Eligibility
          </h2>
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2 font-mono uppercase tracking-widest text-xs">General Requirements:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Be 18+</li>
                <li>Be legally able to enter contracts</li>
                <li>Comply with applicable laws</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2 font-mono uppercase tracking-widest text-xs">Creators must:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Complete identity verification (KYC)</li>
                <li>Provide valid payout details</li>
                <li>Provide consent documentation for all participants</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
            4. Platform Nature
          </h2>
          <p className="mt-4 text-gray-300 leading-relaxed">
            PlayGroundX provides the infrastructure for interactive experiences. We are not a party to Fan–Creator transactions and do not guarantee content, outcomes, or earnings.
          </p>
        </section>

        <section className="p-8 rounded-3xl bg-gradient-to-br from-pink-500/10 to-blue-500/10 border border-white/20 relative overflow-hidden">
             {/* Glow effect */}
             <div className="absolute -right-20 -top-20 w-64 h-64 bg-pink-500/10 blur-3xl pointer-events-none" />
             
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3 relative">
            <Coins className="w-8 h-8 text-yellow-400" />
            5. Monetization & Fees
          </h2>
          
          <div className="space-y-8 relative">
            <div>
              <h3 className="text-lg font-semibold text-cyan-300 mb-3 italic">5.1 Currency & Wallet</h3>
              <p className="text-gray-300">All transactions are processed in <strong>Euros (€)</strong>. Users must pre-fund a Wallet with a minimum of <strong>€25</strong> before making purchases. Wallet funds are non-refundable, except where required by law.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-black/40 border border-fuchsia-500/30">
                <h4 className="font-bold text-fuchsia-300 mb-3 uppercase tracking-wider text-xs">Public Rooms</h4>
                <ul className="text-xs space-y-2 text-gray-300">
                  <li className="flex justify-between border-b border-white/5 pb-1"><span>Entry Fee:</span> <span className="text-white">100% Platform</span></li>
                  <li className="flex justify-between border-b border-white/5 pb-1"><span>Per-Minute Billing:</span> <span className="text-white">100% Platform</span></li>
                  <li className="flex justify-between border-b border-white/5 pb-1"><span>Tips:</span> <span className="text-white italic">85% Creator / 15% Plat</span></li>
                  <li className="flex justify-between"><span>Gifts:</span> <span className="text-white italic">Up to 100% Creator</span></li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-black/40 border border-cyan-500/30">
                <h4 className="font-bold text-cyan-300 mb-3 uppercase tracking-wider text-xs">Private Rooms</h4>
                <ul className="text-xs space-y-2 text-gray-300">
                  <li className="flex justify-between border-b border-white/5 pb-1"><span>Entry Fee:</span> <span className="text-white italic">60% Plat / 40% Creator</span></li>
                  <li className="flex justify-between border-b border-white/5 pb-1"><span>Per-Minute Billing:</span> <span className="text-white italic">60% Plat / 40% Creator</span></li>
                  <li className="flex justify-between border-b border-white/5 pb-1"><span>Tips:</span> <span className="text-white italic">85% Creator / 15% Plat</span></li>
                  <li className="flex justify-between"><span>Gifts:</span> <span className="text-white italic">Up to 100% Creator</span></li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pink-300 mb-3 italic">5.5 Per-Minute Billing Rules</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 text-sm">
                <li>Billing begins immediately upon Room entry and is charged per full minute.</li>
                <li>Once a minute starts, it is considered a full billable minute (no per-second billing).</li>
                <li><strong>Disconnections:</strong> Billing resumes upon re-entry within the same session/day.</li>
                <li><strong>Creator Early Exit:</strong> Billing stops at the last completed minute. Creators are not required to stay for any minimum duration.</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-white/10">
                 <h3 className="text-lg font-semibold text-gray-200 mb-3 italic flex items-center gap-2">5.7 Payout Terms</h3>
                 <ul className="list-disc pl-6 space-y-1 text-gray-400 text-xs">
                     <li>Payout delay: 7–21 days minimum</li>
                     <li>Minimum payout threshold applies</li>
                     <li>We may hold funds for fraud review or compliance reasons</li>
                 </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)] flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            6. Refund & Chargeback Policy
          </h2>
          <div className="mt-4 p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-4">
            <p className="text-gray-200 font-semibold italic">6.1 No Refunds: All sales are final once access is granted.</p>
            <p className="text-sm text-gray-400 italic">
                Users agree not to initiate unjustified chargebacks. If a chargeback occurs, accounts may be suspended, wallet access revoked, and funds recovered from Creator Earnings.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-yellow-400 drop-shadow-[0_0_12px_rgba(234,179,8,0.5)]">
            8. Acceptable Use
          </h2>
          <p className="mt-4 text-gray-300 italic mb-4">Users may NOT:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 list-disc pl-6 text-sm text-gray-400">
            <li>Use or feature minors (under 18)</li>
            <li>Upload illegal or non-consensual content</li>
            <li>Promote violence, abuse, or exploitation</li>
            <li>Harass, doxx, or defame others</li>
            <li>Share prohibited content (extreme acts, bodily waste, etc.)</li>
            <li>Attempt to bypass payments or platform systems</li>
            <li>Arrange in-person meetings</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-400" />
            11. Liability & 12. Governing Law
          </h2>
          <div className="mt-4 space-y-4 text-gray-300 text-sm leading-relaxed">
            <p>
              PlayGroundX is not responsible for Creator behavior, content accuracy, earnings outcomes, or technical interruptions.
            </p>
            <p>
              These Terms are governed by the laws of the **Republic of Cyprus**. Disputes may be resolved in Cyprus courts or as required by EU law. In the event of conflict, these Terms of Service prevail.
            </p>
          </div>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-2 text-pink-400 font-bold tracking-widest uppercase text-[10px]">
            <HeartHandshake className="w-3 h-3" />
            PlayGroundX Digital Ltd
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            Oneworld Parkview House, Floor 4, 2063, Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
