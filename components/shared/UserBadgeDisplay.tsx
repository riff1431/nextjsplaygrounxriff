"use client";
import React, { useEffect, useState } from "react";
import { UserBadgesInline } from "./UserBadge";
import { createClient } from "@/utils/supabase/client";

// Module level cache to avoid duplicate fetches for the same user
const userBadgeCache: Record<string, any> = {};

export default function UserBadgeDisplay({ userId, exclude = [] }: { userId: string, exclude?: string[] }) {
    const [badges, setBadges] = useState(userBadgeCache[userId] || null);

    useEffect(() => {
        if (!userId) return;
        if (userBadgeCache[userId]) {
            setBadges(userBadgeCache[userId]);
            return;
        }

        const supabase = createClient();
        supabase.from("profiles")
            .select(`
                role,
                account_types:account_type_id(display_name, badge_color, badge_icon, badge_icon_url),
                fan_membership_plans:fan_membership_id(display_name, badge_color, name, badge_icon_url),
                creator_levels:creator_level_id(display_name, badge_color, name, badge_icon_url)
            `)
            .eq("id", userId)
            .single()
            .then(({ data }) => {
                if (data) {
                    const mapped = {
                        role: data.role,
                        accountType: data.account_types,
                        membership: data.fan_membership_plans,
                        level: data.creator_levels
                    };
                    userBadgeCache[userId] = mapped;
                    setBadges(mapped);
                }
            });
    }, [userId]);

    if (!badges) return null;

    const shouldShow = (badgeData: any, type: 'account_type' | 'membership' | 'level') => {
        if (!badgeData || !badgeData.display_name) return false;
        const name = badgeData.display_name.toLowerCase();
        
        if (exclude.some(ex => name.includes(ex.toLowerCase()))) return false;

        if (badges.role === 'creator') {
            // Creator: show suga baby badge AND tier levels (Rookie, Rising, etc)
            if (type === 'account_type' && name.includes('baby')) return true;
            if (type === 'level') return true;
            return false;
        } else {
            // Fan: show tier badge and suga daddy/momma badge
            if (type === 'level') return false;
            if (type === 'account_type' && name.includes('baby')) return false;
            return true;
        }
    };

    return (
        <UserBadgesInline
            accountType={shouldShow(badges.accountType, 'account_type') ? badges.accountType : null}
            membership={shouldShow(badges.membership, 'membership') ? badges.membership : null}
            level={shouldShow(badges.level, 'level') ? badges.level : null}
        />
    );
}
