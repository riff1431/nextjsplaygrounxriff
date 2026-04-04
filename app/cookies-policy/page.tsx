"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { Cookie, ShieldCheck, Lock, Settings, Info, Globe } from "lucide-react";

export default function CookiesPolicyPage() {
  return (
    <InfoPageLayout 
      title="Cookies Policy" 
      subtitle="Last Updated: April 1st 2026"
    >
      <div className="space-y-12">
        <section className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm text-gray-300">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            1. Introduction
          </h2>
          <p className="leading-relaxed">
            This Cookies Policy explains how PlayGroundX (“we”, “us”, “our”) uses cookies and similar technologies when you use our Platform. This Policy should be read alongside our Privacy Policy.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-gray-500">
            PlayGroundX Digital Ltd, ONEWORLD PARKVIEW HOUSE, Floor 4, 2063, Nicosia, Cyprus.
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fuchsia-300 drop-shadow-[0_0_12px_rgba(255,0,200,0.5)] flex items-center gap-2">
            <Cookie className="w-6 h-6" />
            What are Cookies?
          </h2>
          <p className="mt-4 text-gray-300 leading-relaxed">
            Cookies are small text files placed on your device. They help us operate the Platform, improve performance, remember your preferences, and ensure account security.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,230,255,0.5)]">
            Types of Cookies We Use
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-bold text-gray-100 flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Strictly Necessary
              </h3>
              <p className="text-xs text-gray-400 leading-normal">
                Essential for the Platform to function. Used for login authentication, account security, fraud prevention, and session management. Cannot be disabled.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-bold text-gray-100 flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-blue-400" />
                Performance & Functional
              </h3>
              <p className="text-xs text-gray-400 leading-normal">
                Used for tracking usage behavior, language settings, and UI preferences. Helps us diagnose errors and improve features.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-pink-300 drop-shadow-[0_0_12px_rgba(255,100,200,0.5)]">
            Marketing & Tracking
          </h2>
          <p className="mt-4 text-gray-300 text-sm leading-relaxed">
            We may use technologies like the **Meta Pixel** or **TikTok Pixel** to measure campaign performance and for ad targeting. These are only activated with your explicit consent.
          </p>
        </section>

        <section className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h3 className="font-bold text-gray-100 text-sm">Example Cookie Table</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs uppercase tracking-tighter">
              <thead>
                <tr className="bg-white/5 text-gray-500">
                  <th className="p-3">Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Duration</th>
                </tr>
              </thead>
              <tbody className="text-gray-400">
                <tr className="border-b border-white/5">
                  <td className="p-3 font-mono text-cyan-400">auth_token</td>
                  <td className="p-3">Necessary</td>
                  <td className="p-3">Authentication</td>
                  <td className="p-3">Session</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-3 font-mono text-cyan-400">_ga</td>
                  <td className="p-3">Analytics</td>
                  <td className="p-3">Behavior Tracking</td>
                  <td className="p-3">2 Years</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-cyan-400">_fbp</td>
                  <td className="p-3">Marketing</td>
                  <td className="p-3">Meta Tracking</td>
                  <td className="p-3">90 Days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Lock className="w-6 h-6 text-fuchsia-400" />
            Cookie Control
          </h2>
          <p className="mt-4 text-gray-300 text-sm leading-relaxed italic">
            You can manage your preferences through our consent banner or your browser settings. Under GDPR, you have the right to withdraw consent at any time.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-2 text-cyan-400 font-bold tracking-widest uppercase text-[10px]">
             <Globe className="w-3 h-3" />
             Privacy Compliance
          </div>
          <p className="mt-2 text-[9px] text-gray-500 uppercase tracking-tighter">
            PlayGroundX Digital Ltd | Nicosia, Cyprus
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
