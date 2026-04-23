"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import DynamicPageContent from "@/components/common/DynamicPageContent";
import { ShieldCheck, Lock, Eye, UserCheck, Database, Globe, Scale } from "lucide-react";

function StaticPrivacyContent() {
  return (
    <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            1A. Data Controller
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            The data controller responsible for your personal data is:
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-sm font-mono text-gray-400">
            PlayGroundX Digital Ltd<br />
            Operating as: PlayGroundX<br />
            75 Prodromou, ONEWORLD PARKVIEW HOUSE, Floor 4,<br />
            2063, Nicosia, Cyprus.
          </div>
          <p className="mt-4 text-xs text-pink-400 font-bold uppercase tracking-widest">
            📧 Privacy Contact: privacy@playgroundx.vip
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)] flex items-center gap-2">
            <Lock className="w-6 h-6" />
            1. Introduction
          </h2>
          <div className="mt-4 space-y-4 text-gray-300 leading-relaxed">
            <p>
              This Privacy Policy explains how PlayGroundX Digital Ltd ("PlayGroundX", "we", "us", "our") collects, uses, and protects personal data in accordance with the **EU General Data Protection Regulation (GDPR) (EU) 2016/679** and Cyprus data protection laws.
            </p>
            <p>
              By using PlayGroundX, you acknowledge this Policy.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,230,255,0.5)] flex items-center gap-2">
            <Eye className="w-6 h-6" />
            2. Data We Collect
          </h2>
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-bold text-gray-100 mb-2 italic">2.1 Account Data</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>Name & Email address</li>
                  <li>Username & Date of birth</li>
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-bold text-gray-100 mb-2 italic">2.2 Financial Data</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>Wallet activity & history</li>
                  <li>Payment references</li>
                  <li className="text-[10px] text-fuchsia-400/80 mt-2 uppercase font-bold">⚠️ Note: Card data is not stored.</li>
                </ul>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-pink-500/20 bg-pink-500/5">
              <h3 className="text-lg font-bold text-pink-300 mb-3 flex items-center gap-2 italic">
                <UserCheck className="w-5 h-5" />
                2.3 Identity Verification (Creators)
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                To comply with legal obligations, we collect:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400 list-disc pl-5">
                <li>Government-issued photo ID</li>
                <li>Selfie / liveness verification</li>
                <li>Facial image comparison data</li>
                <li>Consent/release documentation</li>
              </ul>
              <div className="mt-4 p-3 rounded-lg bg-black/40 border border-pink-500/10 text-[10px] text-gray-500 italic">
                Processed by trusted third-part verification providers solely for identity and fraud prevention.
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] flex items-center gap-2">
            <Database className="w-6 h-6" />
            3. Purposes & 4. Legal Basis
          </h2>
          <div className="mt-4 p-6 rounded-2xl border border-white/10 bg-black/40 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                    <h4 className="font-bold text-emerald-400 mb-2 uppercase tracking-widest text-[10px]">Processing Purpose</h4>
                    <ul className="space-y-1 text-gray-400">
                        <li>Platform Operation</li>
                        <li>Identity & Age Verification</li>
                        <li>Fraud Prevention</li>
                        <li>Legal Compliance</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-emerald-400 mb-2 uppercase tracking-widest text-[10px]">GDPR Basis</h4>
                    <ul className="space-y-1 text-gray-400">
                        <li>Contractual Necessity</li>
                        <li>Legal Obligations</li>
                        <li>Legitimate Interests</li>
                        <li>Explicit Consent (Biometric)</li>
                    </ul>
                </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)] flex items-center gap-2">
            <Globe className="w-6 h-6" />
            6. International Transfers & 7. Retention
          </h2>
          <p className="mt-4 text-gray-300 text-sm leading-relaxed italic">
            Data may be transferred outside the EEA under **Standard Contractual Clauses (SCCs)**.
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                  { label: "Account Data", time: "Active + 5Y" },
                  { label: "Financial Data", time: "5–10Y" },
                  { label: "Identity Data", time: "Up to 5Y post-closure" },
                  { label: "Usage Logs", time: "12 Months" },
              ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg border border-white/5 bg-white/5 text-center">
                      <div className="text-[10px] text-gray-500 uppercase tracking-tighter">{item.label}</div>
                      <div className="text-xs font-bold text-gray-300 mt-1">{item.time}</div>
                  </div>
              ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-fuchsia-400" />
            8. Your Rights (GDPR)
          </h2>
          <p className="mt-4 text-gray-300 text-sm italic mb-4">You have the right to:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 list-disc pl-6 text-sm text-gray-400">
            <li>Access & Copy your data</li>
            <li>Correct inaccurate details</li>
            <li>Request deletion (Erasure)</li>
            <li>Restrict or object to processing</li>
            <li>Data Portability</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-gray-500 italic max-w-lg mx-auto">
            You have the right to lodge a complaint with the **Office of the Commissioner for Personal Data Protection (Cyprus DPA)** at dataprotection.gov.cy.
          </p>
          <div className="mt-8 flex justify-center gap-6">
              <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold tracking-widest uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  GDPR Compliant
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold tracking-widest uppercase">
                  <Globe className="w-3 h-3" />
                  Cyprus (EU) Region
              </div>
          </div>
        </section>
      </div>
  );
}

export default function PrivacyPage() {
  return (
    <InfoPageLayout 
      title="Privacy Policy" 
      subtitle="Last Updated: April 1st 2026"
    >
      <DynamicPageContent 
        pageKey="page_privacy_policy"
        fallback={<StaticPrivacyContent />}
      />
    </InfoPageLayout>
  );
}
