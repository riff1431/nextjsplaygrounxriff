"use client";

import React, { useState } from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import { Mail, MessageCircle, Send, Sparkles, Twitter } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "", category: "support" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 1500);
  };

  return (
    <InfoPageLayout 
      title="Contact Us" 
      subtitle="How can we help you explore the playground?"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Contact Info */}
        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,230,255,0.6)]" />
              Direct Support
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:border-cyan-300/30 transition-colors">
                <div className="p-3 rounded-lg bg-cyan-400/10">
                  <Mail className="w-6 h-6 text-cyan-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-100 italic">Email</h3>
                  <p className="text-sm text-gray-400 mt-1">General & Support</p>
                  <p className="text-pink-400 font-medium mt-1">support@playgroundx.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:border-fuchsia-400/30 transition-colors">
                <div className="p-3 rounded-lg bg-fuchsia-400/10">
                  <Twitter className="w-6 h-6 text-fuchsia-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-100 italic">Twitter (X)</h3>
                  <p className="text-sm text-gray-400 mt-1">DMs are open</p>
                  <p className="text-pink-400 font-medium mt-1">@PlayGroundX_HQ</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:border-purple-400/30 transition-colors">
                <div className="p-3 rounded-lg bg-purple-400/10">
                  <MessageCircle className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-100 italic">Discord</h3>
                  <p className="text-sm text-gray-400 mt-1">Join the community</p>
                  <p className="text-pink-400 font-medium mt-1">discord.gg/playgroundx</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-300 mb-4">
              Creator Inquiries
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed italic">
              Are you interested in launching your own room or becoming a featured creator? 
              Mark your message with <span className="text-emerald-300 font-bold uppercase tracking-widest">"CREATOR"</span> for priority review.
            </p>
          </section>
        </div>

        {/* Contact Form */}
        <div className="relative">
          {isSent ? (
            <div className="h-full flex flex-col items-center justify-center p-10 border border-emerald-500/30 rounded-3xl bg-emerald-500/5 backdrop-blur-xl text-center space-y-4">
              <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                <Send className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-emerald-400">Message Sent!</h3>
              <p className="text-gray-400">We've received your transmission and our team will get back to you within 24-48 hours. Stay neon.</p>
              <button 
                onClick={() => setIsSent(false)}
                className="mt-6 text-pink-400 hover:text-pink-300 text-sm font-medium underline underline-offset-4"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 p-8 border border-white/10 rounded-3xl bg-black/40 backdrop-blur-xl shadow-2xl">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Your display name"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="Where can we reach you?"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Topic</label>
                <select 
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-400/50 transition-colors"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="support">Technical Support</option>
                  <option value="creator">Creator Application</option>
                  <option value="legal">Legal / DMCA</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Message</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Tell us what's on your mind..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold tracking-widest uppercase text-xs transition shadow-[0_0_20px_rgba(255,0,200,0.3)] disabled:opacity-50"
              >
                {isSubmitting ? "Transmitting..." : "Send Transmission"}
              </button>
            </form>
          )}
        </div>
      </div>
    </InfoPageLayout>
  );
}
