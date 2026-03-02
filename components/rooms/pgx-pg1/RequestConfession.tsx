"use client";

import { useState } from "react";
import { Send, Lock, User, MessageSquare, Mic, Video } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/app/context/AuthContext";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";

interface RequestConfessionProps {
  roomId: string | null;
  creatorId: string | null;
}

const RequestConfession = ({ roomId, creatorId }: RequestConfessionProps) => {
  const { user } = useAuth();
  const { balance, refresh } = useWallet();
  const [activeTab, setActiveTab] = useState<"Text" | "Audio" | "Video">("Text");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [amount, setAmount] = useState("10");
  const [topic, setTopic] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tabs = [
    { id: "Text" as const, icon: MessageSquare, label: "Text" },
    { id: "Audio" as const, icon: Mic, label: "Audio" },
    { id: "Video" as const, icon: Video, label: "Video" },
  ];

  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmitClick = () => {
    if (!roomId || !user) {
      toast.error("Please log in first");
      return;
    }
    if (parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!topic.trim()) {
      toast.error("Please enter a topic prompt");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!roomId || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/rooms/${roomId}/confessions/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          topic: topic.trim(),
          amount: parsedAmount,
          fan_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Fan",
          is_anonymous: isAnonymous,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Confession request sent! 🎉");
        setTopic("");
        setAmount("10");
        refresh();
      } else {
        toast.error(data.error || "Failed to send request");
      }
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-wide">Request Confession</h2>
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded border border-border">
            Custom
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${activeTab === tab.id
                  ? "gradient-pink text-primary-foreground neon-border"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Offer Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">My Offer Amount</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Lock className="w-3 h-3" /> Am Anonymous
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 gold-text font-bold text-sm">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm font-semibold focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Topic Prompt */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Topic prompt</span>
          <textarea
            placeholder="What should they confess?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none h-20"
          />
        </div>

        {/* Identity */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsAnonymous(false)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${!isAnonymous
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-secondary text-muted-foreground"
              }`}
          >
            <User className="w-3.5 h-3.5" />
            Public Name
          </button>
          <button
            onClick={() => setIsAnonymous(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${isAnonymous
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-secondary text-muted-foreground"
              }`}
          >
            <Lock className="w-3.5 h-3.5 text-primary" />
            Anonymous
          </button>
        </div>

        <div className="text-xs text-muted-foreground text-right">
          ${parsedAmount} {isAnonymous ? "Anonymous" : "Public"}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmitClick}
          disabled={submitting || !roomId}
          className="w-full py-3 rounded-lg gradient-pink text-primary-foreground font-display font-bold text-sm tracking-wide neon-border hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Send Request
        </button>

        <p className="text-xs text-muted-foreground text-center">Summary & Payment next</p>
      </div>

      <SpendConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Confession Request"
        itemLabel={`${activeTab} Confession Request`}
        amount={parsedAmount}
        walletBalance={balance}
        description={topic || "Confession request"}
        confirmLabel={`Pay $${parsedAmount.toFixed(2)}`}
      />
    </>
  );
};

export default RequestConfession;
