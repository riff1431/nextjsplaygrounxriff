"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/common/BrandLogo";
import Link from "next/link";

interface InfoPageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showHomeLink?: boolean;
}

const InfoPageLayout = ({ children, title, subtitle, showHomeLink = true }: InfoPageLayoutProps) => {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      <style>{`
        @keyframes smokeDrift {
          0% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .18; }
          50% { transform: translate3d(4%, 3%, 0) scale(1.10); opacity: .32; }
          100% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .18; }
        }
        .neon-smoke {
          pointer-events: none;
          position: absolute;
          inset: -46px;
          filter: blur(18px);
          background:
            radial-gradient(circle at 18% 20%, rgba(255,0,200,.15), transparent 55%),
            radial-gradient(circle at 74% 38%, rgba(0,230,255,.12), transparent 60%),
            radial-gradient(circle at 35% 82%, rgba(0,255,170,.08), transparent 58%);
          mix-blend-mode: screen;
          animation: smokeDrift 15s ease-in-out infinite;
        }
      `}</style>

      {/* Backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-24 top-[-160px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute -right-24 bottom-[-160px] h-[560px] w-[560px] rounded-full bg-cyan-400/8 blur-3xl" />
        </div>
        <div className="absolute inset-0 backdrop-blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-12 md:py-20">
        <div className="neon-smoke" aria-hidden="true" />

        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="flex flex-col gap-4">
            {showHomeLink && (
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-pink-400 transition-colors group w-fit"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Link>
            )}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-gray-50 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-lg text-gray-400">
                  {subtitle}
                </p>
              )}
            </motion.div>
          </div>
          <div className="hidden md:block">
            <BrandLogo />
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative rounded-3xl border border-white/10 bg-black/40 p-6 md:p-10 shadow-2xl backdrop-blur-xl"
        >
          <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-gray-100 prose-a:text-pink-400 prose-strong:text-white">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InfoPageLayout;
