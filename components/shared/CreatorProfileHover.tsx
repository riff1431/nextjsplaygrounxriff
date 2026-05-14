"use client";

import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import UserBadgeDisplay from "./UserBadgeDisplay";
import { createPortal } from "react-dom";

interface CreatorProfileHoverProps {
    creatorId: string;
    creatorName: string;
    avatarUrl?: string | null;
    children?: React.ReactNode;
}

export default function CreatorProfileHover({ creatorId, creatorName, avatarUrl, children }: CreatorProfileHoverProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [popupCoords, setPopupCoords] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isHovered) {
            timerRef.current = setTimeout(() => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setPopupCoords({
                        top: rect.bottom + window.scrollY,
                        left: rect.left + rect.width / 2 + window.scrollX
                    });
                }
                setShowPopup(true);
                fetchProfile();
            }, 3000);
        } else {
            if (timerRef.current) clearTimeout(timerRef.current);
            setShowPopup(false);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isHovered]);

    const fetchProfile = async () => {
        if (profileData) return;
        const supabase = createClient();
        const { data } = await supabase.from("profiles").select("bio, cover_image, full_name, username").eq("id", creatorId).single();
        if (data) setProfileData(data);
    };

    return (
        <div 
            ref={containerRef}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", minWidth: 0, maxWidth: "100%" }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={{ flexShrink: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {children || <span>{creatorName}</span>}
            </div>
            <div style={{ flexShrink: 0 }}>
                <UserBadgeDisplay userId={creatorId} />
            </div>

            {showPopup && typeof window !== "undefined" && createPortal(
                <div style={{
                    position: "absolute",
                    top: `${popupCoords.top + 8}px`,
                    left: `${popupCoords.left}px`,
                    transform: "translateX(-50%)",
                    width: "240px",
                    background: "rgba(20, 10, 30, 0.98)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px",
                    padding: "16px",
                    zIndex: 99999,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
                    pointerEvents: "none",
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)", flexShrink: 0 }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #a855f7, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "20px" }}>
                                    {creatorName[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "14px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {profileData?.full_name || creatorName}
                            </div>
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                @{profileData?.username || "creator"}
                            </div>
                        </div>
                    </div>
                    {profileData?.bio ? (
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", lineHeight: 1.4, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {profileData.bio}
                        </p>
                    ) : (
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontStyle: "italic", margin: 0 }}>No bio available</p>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
