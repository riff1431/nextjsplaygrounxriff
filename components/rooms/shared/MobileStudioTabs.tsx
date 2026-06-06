"use client";

import React from "react";

/* ─────────── Types ─────────── */
export interface MobileStudioTab {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number | boolean;
}

interface MobileStudioTabsProps {
    tabs: MobileStudioTab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    accentHsl?: string;
}

/* ═══════════════════════════════════════════════════════════
   MobileStudioTabs
   Fixed bottom tab bar for creator live studio on mobile.
   Hidden on lg+ where the full multi-column layout is used.
   ═══════════════════════════════════════════════════════════ */
export default function MobileStudioTabs({
    tabs,
    activeTab,
    onTabChange,
    accentHsl = "280, 70%, 60%",
}: MobileStudioTabsProps) {
    return (
        <>
            <style>{`
                .mobile-studio-tabs {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 40;
                    display: flex;
                    align-items: stretch;
                    justify-content: space-around;
                    padding: 0 4px;
                    padding-bottom: max(8px, env(safe-area-inset-bottom));
                    background: rgba(10, 8, 20, 0.92);
                    backdrop-filter: blur(20px) saturate(1.5);
                    -webkit-backdrop-filter: blur(20px) saturate(1.5);
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.5);
                }
                @media (min-width: 1024px) {
                    .mobile-studio-tabs {
                        display: none !important;
                    }
                }
                .mst-tab {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                    padding: 8px 4px 4px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.2s ease;
                    -webkit-tap-highlight-color: transparent;
                    min-height: 52px;
                }
                .mst-tab-label {
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.02em;
                    transition: color 0.2s ease;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 72px;
                }
                .mst-tab-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    transition: transform 0.2s ease;
                    position: relative;
                }
                .mst-tab.active .mst-tab-icon {
                    transform: scale(1.15);
                }
                .mst-tab-indicator {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 24px;
                    height: 2px;
                    border-radius: 0 0 4px 4px;
                    opacity: 0;
                    transition: opacity 0.2s ease, width 0.2s ease;
                }
                .mst-tab.active .mst-tab-indicator {
                    opacity: 1;
                    width: 32px;
                }
                .mst-badge {
                    position: absolute;
                    top: -2px;
                    right: -6px;
                    min-width: 16px;
                    height: 16px;
                    padding: 0 4px;
                    border-radius: 9999px;
                    background: #ef4444;
                    color: #fff;
                    font-size: 9px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
                    animation: mst-pulse 2s ease-in-out infinite;
                }
                .mst-badge.dot {
                    min-width: 8px;
                    width: 8px;
                    height: 8px;
                    padding: 0;
                    top: 0px;
                    right: -2px;
                }
                @keyframes mst-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `}</style>

            <div className="mobile-studio-tabs">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                        <button
                            key={tab.id}
                            className={`mst-tab ${isActive ? "active" : ""}`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            {/* Top indicator line */}
                            <div
                                className="mst-tab-indicator"
                                style={{ background: `hsl(${accentHsl})` }}
                            />

                            {/* Icon */}
                            <div className="mst-tab-icon">
                                <span
                                    style={{
                                        color: isActive
                                            ? `hsl(${accentHsl})`
                                            : "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    {tab.icon}
                                </span>
                                {/* Badge */}
                                {tab.badge !== undefined && (typeof tab.badge === "boolean" ? tab.badge : tab.badge > 0) && (
                                    <span className={`mst-badge ${typeof tab.badge === "boolean" ? "dot" : ""}`}>
                                        {typeof tab.badge === "number" ? (tab.badge > 99 ? "99+" : tab.badge) : ""}
                                    </span>
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className="mst-tab-label"
                                style={{
                                    color: isActive
                                        ? `hsl(${accentHsl})`
                                        : "rgba(255,255,255,0.35)",
                                }}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
