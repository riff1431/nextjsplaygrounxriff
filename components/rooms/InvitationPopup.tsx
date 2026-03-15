"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface Invitation {
    id: string;
    room_id: string;
    inviter_id: string;
    inviter_name?: string;
    room_type?: string;
    created_at: string;
}

export default function InvitationPopup() {
    const { user } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [responding, setResponding] = useState(false);

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`room-invitations-${user.id}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "INSERT",
                    schema: "public",
                    table: "room_invitations",
                    filter: `invitee_id=eq.${user.id}`,
                },
                async (payload: any) => {
                    const newInv = payload.new;
                    // Fetch inviter profile
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("username, full_name")
                        .eq("id", newInv.inviter_id)
                        .single();

                    // Fetch room type
                    const { data: room } = await supabase
                        .from("rooms")
                        .select("type")
                        .eq("id", newInv.room_id)
                        .single();

                    const roomLabel = (room?.type || "session")
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (c: string) => c.toUpperCase());

                    setInvitation({
                        id: newInv.id,
                        room_id: newInv.room_id,
                        inviter_id: newInv.inviter_id,
                        inviter_name: profile?.full_name || profile?.username || "Someone",
                        room_type: roomLabel,
                        created_at: newInv.created_at,
                    });
                }
            )
            .subscribe();

        // Auto-dismiss timeout
        const dismissTimer = setTimeout(() => {
            setInvitation(null);
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearTimeout(dismissTimer);
        };
    }, [user, supabase]);

    const handleRespond = async (response: "accepted" | "declined") => {
        if (!invitation) return;
        setResponding(true);
        try {
            const res = await fetch(`/api/v1/rooms/${invitation.room_id}/invite/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invitation_id: invitation.id,
                    response,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (response === "accepted" && data.redirect_url) {
                    router.push(data.redirect_url);
                }
            }
        } catch (err) {
            console.error("Failed to respond to invitation:", err);
        } finally {
            setInvitation(null);
            setResponding(false);
        }
    };

    if (!invitation) return null;

    return (
        <div className="fixed top-6 right-6 z-[150] animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="w-[340px] glass-panel border border-gold/30 rounded-2xl shadow-2xl overflow-hidden">
                {/* Accent bar */}
                <div className="h-1 bg-gradient-to-r from-pink-500 via-gold to-pink-500" />

                <div className="p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-gold flex items-center justify-center">
                                <UserPlus size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gold uppercase tracking-wider">Room Invitation</p>
                                <p className="text-[10px] text-muted-foreground">Just now</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setInvitation(null)}
                            className="p-1 rounded-full hover:bg-white/10 transition"
                        >
                            <X size={14} className="text-muted-foreground" />
                        </button>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-foreground mb-4">
                        <span className="font-bold glow-text-pink">{invitation.inviter_name}</span>{" "}
                        invited you to join a{" "}
                        <span className="font-semibold text-gold">{invitation.room_type}</span> session! 💖
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleRespond("accepted")}
                            disabled={responding}
                            className="flex-1 btn-gold py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-50"
                        >
                            <Check size={14} />
                            Accept &amp; Join
                        </button>
                        <button
                            onClick={() => handleRespond("declined")}
                            disabled={responding}
                            className="flex-1 py-2 rounded-lg text-xs font-bold border border-white/15 text-muted-foreground hover:bg-white/5 transition-all disabled:opacity-50"
                        >
                            Decline
                        </button>
                    </div>
                </div>

                {/* Progress bar for auto-dismiss */}
                <div className="h-0.5 bg-black/20">
                    <div
                        className="h-full bg-gradient-to-r from-pink-500 to-gold"
                        style={{
                            animation: "invite-progress 30s linear forwards",
                        }}
                    />
                </div>
            </div>

            <style jsx>{`
                @keyframes invite-progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
}
