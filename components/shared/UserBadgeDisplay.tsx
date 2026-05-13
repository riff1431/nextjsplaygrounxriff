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
                account_types:account_type_id(display_name, badge_color, badge_icon, badge_icon_url),
                fan_membership_plans:fan_membership_id(display_name, badge_color, name, badge_icon_url),
                creator_levels:creator_level_id(display_name, badge_color, name, badge_icon_url)
            `)
            .eq("id", userId)
            .single()
            .then(({ data }) => {
                if (data) {
                    const mapped = {
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

    const shouldShow = (badgeData: any) => {
        if (!badgeData || !badgeData.display_name) return false;
        const name = badgeData.display_name.toLowerCase();
        return !exclude.some(ex => name.includes(ex.toLowerCase()));
    };

    return (
        <UserBadgesInline
            accountType={shouldShow(badges.accountType) ? badges.accountType : null}
            membership={shouldShow(badges.membership) ? badges.membership : null}
            level={shouldShow(badges.level) ? badges.level : null}
        />
    );
}
