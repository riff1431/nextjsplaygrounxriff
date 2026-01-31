"use client";

import React from "react";

interface BadgeData {
    display_name: string;
    badge_color: string;
    badge_icon_url?: string | null;
}

interface Props {
    type: "account_type" | "membership" | "level";
    badgeData: BadgeData | null;
    variant?: "inline" | "profile";
    className?: string;
}

export default function UserBadge({
    type,
    badgeData,
    variant = "inline",
    className = "",
}: Props) {
    if (!badgeData) return null;

    const isInline = variant === "inline";

    // Get icon based on type and name
    const getIcon = () => {
        const name = badgeData.display_name.toLowerCase();

        if (type === "account_type") {
            if (name.includes("daddy")) return "🤴";
            if (name.includes("mommy")) return "👸";
        }

        if (type === "membership") {
            if (name.includes("bronze")) return "🥉";
            if (name.includes("silver")) return "🥈";
            if (name.includes("gold")) return "🥇";
        }

        if (type === "level") {
            if (name.includes("rookie")) return "🌱";
            if (name.includes("rising")) return "⭐";
            if (name.includes("star")) return "🌟";
            if (name.includes("elite")) return "👑";
        }

        return "✨";
    };

    if (isInline) {
        return (
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}
                style={{
                    backgroundColor: `${badgeData.badge_color}20`,
                    color: badgeData.badge_color,
                    border: `1px solid ${badgeData.badge_color}40`,
                }}
                title={badgeData.display_name}
            >
                {badgeData.badge_icon_url ? (
                    <img
                        src={badgeData.badge_icon_url}
                        alt=""
                        className="w-3 h-3"
                    />
                ) : (
                    <span className="text-[9px]">{getIcon()}</span>
                )}
                <span>{badgeData.display_name}</span>
            </span>
        );
    }

    // Profile variant - larger badge
    return (
        <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${className}`}
            style={{
                backgroundColor: `${badgeData.badge_color}15`,
                border: `2px solid ${badgeData.badge_color}30`,
            }}
        >
            {badgeData.badge_icon_url ? (
                <img
                    src={badgeData.badge_icon_url}
                    alt=""
                    className="w-5 h-5"
                />
            ) : (
                <span className="text-lg">{getIcon()}</span>
            )}
            <div>
                <span
                    className="text-sm font-bold"
                    style={{ color: badgeData.badge_color }}
                >
                    {badgeData.display_name}
                </span>
                <span className="text-[10px] text-gray-400 block">
                    {type === "account_type"
                        ? "Account Type"
                        : type === "membership"
                            ? "Membership"
                            : "Creator Level"}
                </span>
            </div>
        </div>
    );
}

// Helper component for displaying badges next to username
export function UserBadgesInline({
    accountType,
    membership,
    level,
}: {
    accountType?: BadgeData | null;
    membership?: BadgeData | null;
    level?: BadgeData | null;
}) {
    return (
        <span className="inline-flex items-center gap-1 ml-1">
            {accountType && (
                <UserBadge type="account_type" badgeData={accountType} variant="inline" />
            )}
            {membership && (
                <UserBadge type="membership" badgeData={membership} variant="inline" />
            )}
            {level && (
                <UserBadge type="level" badgeData={level} variant="inline" />
            )}
        </span>
    );
}

// Profile section badges
export function UserBadgesProfile({
    accountType,
    membership,
    level,
}: {
    accountType?: BadgeData | null;
    membership?: BadgeData | null;
    level?: BadgeData | null;
}) {
    const badges = [
        { type: "account_type" as const, data: accountType },
        { type: "membership" as const, data: membership },
        { type: "level" as const, data: level },
    ].filter((b) => b.data);

    if (badges.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
                <UserBadge
                    key={badge.type}
                    type={badge.type}
                    badgeData={badge.data!}
                    variant="profile"
                />
            ))}
        </div>
    );
}
