"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";

interface UserProfileProps {
    name?: string;
    avatarUrl?: string | null;
    hostId?: string | null;
}

const UserProfile = ({ name = "Alexis Rose", avatarUrl, hostId }: UserProfileProps) => {
    const [tierLabel, setTierLabel] = useState<string | null>(null);
    const [tierColor, setTierColor] = useState<string>("hsl(42, 90%, 55%)"); // default gold

    useEffect(() => {
        if (!hostId) return;

        const fetchTier = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("profiles")
                .select(`
                    creator_levels:creator_level_id(display_name, badge_color)
                `)
                .eq("id", hostId)
                .single();

            if (data?.creator_levels) {
                const level = data.creator_levels as any;
                if (level.display_name) {
                    setTierLabel(level.display_name);
                    if (level.badge_color) setTierColor(level.badge_color);
                }
            }
        };
        fetchTier();
    }, [hostId]);

    return (
        <div className="flex items-center gap-2.5">
            <div className="text-right flex flex-col items-end">
                {tierLabel && (
                    <p
                        className="text-[10px] tracking-wider font-bold"
                        style={{ color: tierColor }}
                    >
                        {tierLabel}
                    </p>
                )}
                <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-white leading-tight">{name}</p>
                    {hostId && <UserBadgeDisplay userId={hostId} hideTypes={["level"]} />}
                </div>
            </div>
            <div className="relative">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={name}
                        className="w-9 h-9 rounded-full object-cover border-2"
                        style={{ borderColor: tierColor }}
                    />
                ) : (
                    <div
                        className="w-9 h-9 rounded-full bg-muted border-2 flex items-center justify-center text-sm"
                        style={{ borderColor: tierColor }}
                    >
                        {name?.[0]?.toUpperCase() || "👩"}
                    </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-background" />
            </div>
        </div>
    );
};

export default UserProfile;
