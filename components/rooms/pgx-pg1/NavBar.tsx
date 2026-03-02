"use client";

import { Heart, ArrowLeft, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import WalletPill from "@/components/common/WalletPill";

const NavBar = () => {
  const router = useRouter();

  return (
    <nav className="relative flex items-center justify-between px-4 py-3 border-b border-border">
      <button
        onClick={() => router.push("/home")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <Heart className="w-8 h-8 text-primary fill-primary" />
        <h1 className="font-display text-3xl font-bold tracking-wider neon-text">
          Confessions <span className="gold-text">X</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <WalletPill />
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
