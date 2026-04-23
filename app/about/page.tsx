"use client";

import React from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import DynamicPageContent from "@/components/common/DynamicPageContent";
import { Sparkles, Crown, MessageCircle, Lock, Trophy, Zap } from "lucide-react";

export default function AboutPage() {
  const features = [
    {
      icon: <Crown className="w-6 h-6 text-pink-400" />,
      title: "Suga 4 U",
      description: "Exclusive, personalized interactions with top-tier creators in a private, high-fidelity environment."
    },
    {
      icon: <Zap className="w-6 h-6 text-cyan-300" />,
      title: "Flash Drops",
      description: "Time-limited content drops and live events that keep you on the edge of your seat."
    },
    {
      icon: <Lock className="w-6 h-6 text-rose-400" />,
      title: "Confessions",
      description: "Share secrets, unveil hidden stories, and connect on a deeper, more vulnerable level."
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-yellow-300" />,
      title: "X Chat",
      description: "Real-time interactive group chats with a focus on speed, style, and community."
    }
  ];

  return (
    <InfoPageLayout 
      title="About PlayGroundX" 
      subtitle="The Midnight Playground of the Digital Age"
    >
      <DynamicPageContent pageKey="page_about" fallback={
      <div className="space-y-16">
        <section>
          <h2 className="text-3xl font-bold text-gray-50 mb-6 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-fuchsia-400 drop-shadow-[0_0_12px_rgba(255,0,200,0.6)]" />
            Our Vision
          </h2>
          <p className="text-xl leading-relaxed text-gray-300 italic">
            "We didn't just build a platform. We built a neon escape—a place where creators and fans connect in the most stylish, secure, and interactive way possible."
          </p>
          <p className="mt-8 leading-relaxed text-gray-300">
            PlayGroundX is born from the intersection of nightlife culture and the creator economy. We believe that digital interaction shouldn't feel clinical; it should feel alive, vibrant, and exclusive. 
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-cyan-300 mb-8 border-b border-cyan-300/20 pb-4">
            The Interactive Spectrum
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md hover:border-pink-500/30 transition-all group"
              >
                <div className="mb-4 p-3 rounded-xl bg-black/40 w-fit group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-100 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-fuchsia-300 mb-6">
            Secure, Private, Exclusive
          </h2>
          <p className="leading-relaxed text-gray-300">
            Every room in the PlayGroundX universe is built with privacy at its core. We use advanced encryption and consent-forward designs to ensure that every interaction—whether public or private—is safe and尊重.
          </p>
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-white">Join the Evolution</h4>
              <p className="text-sm text-gray-400">Ready to step into the neon?</p>
            </div>
            <div className="flex gap-4">
              <Trophy className="w-8 h-8 text-yellow-300 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
            </div>
          </div>
        </section>

        <section className="pt-8 border-t border-white/5 text-center text-sm text-gray-500">
          <p>
            PlayGroundX is a product of Riff Networks. <br />
            Designed in the digital darkroom.
          </p>
        </section>
      </div>
      } />
    </InfoPageLayout>
  );
}
