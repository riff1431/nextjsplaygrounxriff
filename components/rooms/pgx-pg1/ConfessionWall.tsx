"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Lock, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import UnlockedConfessionModal from "./UnlockedConfessionModal";
import { toast } from "sonner";

interface Confession {
  id: string;
  title: string;
  teaser: string;
  content: string | null;
  media_url: string | null;
  type: string;
  tier: string;
  price: number;
  is_unlocked: boolean;
}

interface ConfessionWallProps {
  roomId?: string | null;
}

const LockedConfessionCard = ({
  confession,
  onUnlock,
}: {
  confession: Confession;
  onUnlock: (c: Confession) => void;
}) => {
  return (
    <div className="glass-card p-3 space-y-2 flex flex-col items-center text-center">
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{confession.teaser || confession.title}</p>
      <div className="w-14 h-14 rounded-full bg-secondary/60 border border-primary/30 flex items-center justify-center">
        <Lock className="w-7 h-7 text-primary/70" />
      </div>
      <button
        onClick={() => onUnlock(confession)}
        className="w-full py-1.5 rounded-md gradient-pink text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
      >
        <Heart className="w-3 h-3 fill-current" /> Unlock for ${confession.price}
      </button>
    </div>
  );
};

const UnlockedConfessionCard = ({
  confession,
  onClick,
}: {
  confession: Confession;
  onClick: (c: Confession) => void;
}) => {
  return (
    <div
      onClick={() => onClick(confession)}
      className="glass-card p-3 space-y-2 flex flex-col items-center text-center cursor-pointer hover:border-primary/40 transition-colors"
    >
      <p className="text-xs text-foreground leading-relaxed line-clamp-3">{confession.content || confession.teaser}</p>
      <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
        ✓ Unlocked
      </span>
    </div>
  );
};

const ConfessionWall = ({ roomId }: ConfessionWallProps) => {
  const { balance, refresh } = useWallet();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockTarget, setUnlockTarget] = useState<Confession | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [viewConfession, setViewConfession] = useState<Confession | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const fetchConfessions = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/v1/rooms/${roomId}/confessions`);
      const data = await res.json();
      if (data.confessions) {
        setConfessions(data.confessions);
      }
    } catch (e) {
      console.error("Failed to fetch confessions", e);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]);

  const handleUnlockClick = (confession: Confession) => {
    setUnlockTarget(confession);
    setShowConfirm(true);
  };

  const handleUnlockConfirm = async () => {
    if (!unlockTarget || !roomId) return;
    try {
      const res = await fetch(`/api/v1/rooms/${roomId}/confessions/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId: unlockTarget.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Confession unlocked! 🔓");
        refresh();
        // Show the unlocked content immediately
        setViewConfession(data.confession);
        setShowViewModal(true);
        fetchConfessions();
      } else {
        toast.error(data.error || "Failed to unlock");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleViewUnlocked = (confession: Confession) => {
    setViewConfession(confession);
    setShowViewModal(true);
  };

  const tierTips = [
    { icon: "💋", label: "KISS", price: "€10" },
    { icon: "❤️", label: "LOVE", price: "€20" },
    { icon: "🔥", label: "SPICY", price: "€30" },
    { icon: "💎", label: "DIAMONDS", price: "€40" },
  ];

  return (
    <>
      <div className="glass-card p-4 space-y-3 h-full flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="font-display text-sm font-semibold tracking-wide">Confession Wall</h2>
          {confessions.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{confessions.length} confessions</span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 shrink-0">
          {tierTips.map((tip, i) => (
            <button
              key={i}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#2d1b38]/80 border border-primary/10 hover:border-primary/40 transition-all hover:scale-105"
            >
              <span className="text-xl mb-1">{tip.icon}</span>
              <span className="text-[10px] font-bold tracking-wider text-foreground">{tip.label}</span>
              <span className="text-[10px] text-muted-foreground">{tip.price}</span>
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : confessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No confessions yet
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pr-2">
              {confessions.map((confession) =>
                confession.is_unlocked ? (
                  <UnlockedConfessionCard
                    key={confession.id}
                    confession={confession}
                    onClick={handleViewUnlocked}
                  />
                ) : (
                  <LockedConfessionCard
                    key={confession.id}
                    confession={confession}
                    onUnlock={handleUnlockClick}
                  />
                )
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Spend confirmation */}
      {unlockTarget && (
        <SpendConfirmModal
          isOpen={showConfirm}
          onClose={() => { setShowConfirm(false); setUnlockTarget(null); }}
          onConfirm={handleUnlockConfirm}
          title="Unlock Confession"
          itemLabel={unlockTarget.title}
          amount={unlockTarget.price}
          walletBalance={balance}
          description={`${unlockTarget.tier} • ${unlockTarget.type}`}
          confirmLabel={`Unlock for €${unlockTarget.price}`}
        />
      )}

      {/* View unlocked confession */}
      <UnlockedConfessionModal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewConfession(null); }}
        confession={viewConfession}
      />
    </>
  );
};

export default ConfessionWall;
