"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import BrandLogo from "@/components/common/BrandLogo";

const SiteFooter = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Legal",
      links: [
        { label: "Terms of Service", href: "/terms" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Cookies Policy", href: "/cookies-policy" },
        { label: "Acceptable Use Policy", href: "/acceptable-use" },
      ],
    },
    {
      title: "Safety & Compliance",
      links: [
        { label: "Content Moderation & DSA Policy", href: "/content-moderation" },
        { label: "Age Verification Policy", href: "/age-verification" },
        { label: "Community Guidelines", href: "/community-guidelines" },
      ],
    },
    {
      title: "Creators",
      links: [
        { label: "Creator Guidelines", href: "/creator-guidelines" },
        { label: "Creator Onboarding Agreement", href: "/creator-onboarding" },
        { label: "Creator Payout Terms", href: "/payout-terms" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Refund & Chargeback Policy", href: "/refund-policy" },
        { label: "Complaints Policy", href: "/complaints" },
        { label: "Appeals Policy", href: "/appeals" },
      ],
    },
  ];

  return (
    <footer className="w-full border-t border-white/5 bg-black/60 pt-16 pb-12 backdrop-blur-2xl">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          
          <div className="flex flex-col items-center gap-4 md:items-start lg:col-span-1">
            <BrandLogo />
            <p className="max-w-xs text-center text-sm text-gray-400 md:text-left">
              The ultimate neon nightlife playground: live rooms, exclusive content, and private interactions.
            </p>
            <div className="mt-4 flex gap-4">
               <a href="#" className="text-gray-500 hover:text-cyan-400 transition-colors text-xs uppercase tracking-widest font-bold">Twitter (X)</a>
               <a href="#" className="text-gray-500 hover:text-cyan-400 transition-colors text-xs uppercase tracking-widest font-bold">Discord</a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            {footerSections.map((section) => (
              <div key={section.title} className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-200">
                  {section.title}
                </h4>
                <ul className="flex flex-col gap-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-gray-400 hover:text-fuchsia-400 transition-colors leading-tight"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-8 md:flex-row">
          <p className="text-xs text-gray-500">
            © {currentYear} PlayGroundX. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] uppercase tracking-widest text-gray-600">
              Made with passion for the creator economy
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
