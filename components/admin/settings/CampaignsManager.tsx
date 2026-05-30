"use strict";

import React, { useEffect, useState } from "react";
import { Timer, Bell, Sparkles, Heart, Crown, ShieldCheck, Eye, Save } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { useAdmin } from "../hooks/useAdmin";

interface TimerSettings {
    enabled: boolean;
    targetDate: string;
    label: string;
}

interface WelcomeMessage {
    enabled: boolean;
    title: string;
    message: string;
    buttonText: string;
    accentColor: "pink" | "blue" | "purple" | "green";
}

interface WelcomeCampaign {
    fan: WelcomeMessage;
    creator: WelcomeMessage;
    all: WelcomeMessage;
}

const DEFAULT_TIMER: TimerSettings = {
    enabled: false,
    targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    label: "Suga 4 U Exclusive Portal Launch",
};

const DEFAULT_WELCOME: WelcomeCampaign = {
    all: {
        enabled: true,
        title: "Welcome to PlayGroundX Portal!",
        message: "Step into the ultimate neon nightlife experience. Discover elite creators, unlock private content drops, join our Truth & Dare tables, or customize your own lounge rooms!",
        buttonText: "Enter the Lounge",
        accentColor: "blue",
    },
    fan: {
        enabled: true,
        title: "Welcome to the Fan Headquarters!",
        message: "Your backstage pass to elite adult creators starts here! Explore dynamic news feeds, unlock exclusive albums, chat privately, and access exclusive custom rooms tailored for VIPs.",
        buttonText: "Let's Play",
        accentColor: "pink",
    },
    creator: {
        enabled: true,
        title: "Welcome to your Creator Studio!",
        message: "Ready to take complete ownership of your fanbase and maximize earnings? Broadcast live rooms, receive interactive tips/gifts, schedule events, and set custom pricing models effortlessly.",
        buttonText: "Open Dashboard",
        accentColor: "purple",
    },
};

export default function CampaignsManager() {
    const { fetchSetting, updateSetting } = useAdmin();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"timer" | "welcome">("timer");

    // Launch Timer State
    const [timerSettings, setTimerSettings] = useState<TimerSettings>(DEFAULT_TIMER);

    // Welcome Campaigns State
    const [welcomeCampaigns, setWelcomeCampaigns] = useState<WelcomeCampaign>(DEFAULT_WELCOME);
    const [selectedRole, setSelectedRole] = useState<"all" | "fan" | "creator">("all");

    // Live Simulator Popup State
    const [simulationRole, setSimulationRole] = useState<"all" | "fan" | "creator" | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const timerData = await fetchSetting<TimerSettings>("launch_timer_campaign");
                if (timerData) {
                    // Normalize date format for datetime-local input (YYYY-MM-DDTHH:MM)
                    let formattedDate = timerData.targetDate;
                    try {
                        formattedDate = new Date(timerData.targetDate).toISOString().slice(0, 16);
                    } catch {}
                    setTimerSettings({
                        ...timerData,
                        targetDate: formattedDate
                    });
                }

                const welcomeData = await fetchSetting<WelcomeCampaign>("welcome_campaign");
                if (welcomeData) {
                    setWelcomeCampaigns(welcomeData);
                }
            } catch (e) {
                console.error("Failed to load settings:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [fetchSetting]);

    const handleSaveTimer = async () => {
        // Convert to ISO before saving
        const isoDate = new Date(timerSettings.targetDate).toISOString();
        const success = await updateSetting(
            "launch_timer_campaign",
            { ...timerSettings, targetDate: isoDate },
            "Global launch timer countdown campaign"
        );
    };

    const handleSaveWelcome = async () => {
        const success = await updateSetting(
            "welcome_campaign",
            welcomeCampaigns,
            "Role-specific Dynamic Welcome Popup Campaigns"
        );
    };

    const updateWelcomeMsg = (field: keyof WelcomeMessage, val: any) => {
        setWelcomeCampaigns((prev) => ({
            ...prev,
            [selectedRole]: {
                ...prev[selectedRole],
                [field]: val,
            },
        }));
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading campaign configs...</div>;

    const currentMsg = welcomeCampaigns[selectedRole];

    const previewAccent = currentMsg.accentColor || (selectedRole === "fan" ? "pink" : selectedRole === "creator" ? "purple" : "blue");
    const roleIconMap = {
        all: <Sparkles className="w-6 h-6 text-cyan-400" />,
        fan: <Heart className="w-6 h-6 text-pink-500 animate-pulse" />,
        creator: <Crown className="w-6 h-6 text-violet-400" />,
    };

    const colors = {
        pink: "border-pink-500/30 text-pink-400 bg-pink-500/10 focus:border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.15)]",
        blue: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10 focus:border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.15)]",
        purple: "border-violet-500/30 text-violet-400 bg-violet-500/10 focus:border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.15)]",
        green: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 focus:border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
    };

    return (
        <div className="space-y-4">
            <NeonCard className="p-5">
                <AdminSectionTitle
                    icon={<Timer className="w-4 h-4 text-pink-500" />}
                    title="Campaign & Popup Manager"
                    sub="Customize high-end marketing launch countdowns and role-based onboarding popups."
                    right={
                        <div className="flex gap-2">
                            <NeonButton
                                onClick={activeTab === "timer" ? handleSaveTimer : handleSaveWelcome}
                                variant="pink"
                                className="flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Save {activeTab === "timer" ? "Timer" : "Popups"}
                            </NeonButton>
                        </div>
                    }
                />

                {/* Sub navigation Tabs */}
                <div className="mt-4 flex rounded-xl border border-white/10 bg-black/40 p-1 max-w-sm">
                    <button
                        onClick={() => setActiveTab("timer")}
                        className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-bold uppercase transition ${activeTab === "timer" ? "bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]" : "text-gray-400 hover:text-white"}`}
                    >
                        Launch Countdown
                    </button>
                    <button
                        onClick={() => setActiveTab("welcome")}
                        className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-bold uppercase transition ${activeTab === "welcome" ? "bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]" : "text-gray-400 hover:text-white"}`}
                    >
                        Welcome Messages
                    </button>
                </div>

                {/* Tab Content: Launch Countdown */}
                {activeTab === "timer" && (
                    <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-cyan-200">Global Launch Countdown Timer</div>
                                    <div className="text-[10px] text-gray-400">Toggles a glowing portal countdown at the top middle of pages.</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={timerSettings.enabled}
                                        onChange={(e) => setTimerSettings(t => ({ ...t, enabled: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600 peer-checked:after:bg-white" />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-300">Countdown Label / Title</label>
                                    <input
                                        type="text"
                                        value={timerSettings.label}
                                        onChange={(e) => setTimerSettings(t => ({ ...t, label: e.target.value }))}
                                        placeholder="e.g. Suga 4 U Exclusive Portal Launch"
                                        className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-pink-500/50 outline-none transition"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-300">Launch Target Timestamp</label>
                                    <input
                                        type="datetime-local"
                                        value={timerSettings.targetDate}
                                        onChange={(e) => setTimerSettings(t => ({ ...t, targetDate: e.target.value }))}
                                        className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-pink-500/50 outline-none transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Interactive Countdown Preview Mock */}
                        <div className="rounded-2xl border border-dashed border-pink-500/20 bg-black/20 p-6 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">Live Component Viewport Preview</span>
                            {timerSettings.enabled ? (
                                <div className="rounded-full border border-pink-500/30 bg-black/60 px-4 py-2 flex items-center gap-3 backdrop-blur-md shadow-[0_0_12px_rgba(236,72,153,0.15)]">
                                    <Timer className="h-3.5 w-3.5 text-pink-400 animate-pulse" />
                                    <span className="text-xs font-medium text-fuchsia-200/90">{timerSettings.label}</span>
                                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-white">
                                        <span className="bg-white/5 border border-white/10 px-1 rounded">06</span>
                                        <span className="text-pink-500 animate-pulse">:</span>
                                        <span className="bg-white/5 border border-white/10 px-1 rounded">12</span>
                                        <span className="text-pink-500 animate-pulse">:</span>
                                        <span className="bg-white/5 border border-white/10 px-1 rounded">34</span>
                                        <span className="text-pink-500 animate-pulse">:</span>
                                        <span className="bg-white/5 border border-white/10 px-1 rounded text-pink-400">59</span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-500">Countdown timer is currently disabled. Toggle to activate.</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab Content: Welcome Messages */}
                {activeTab === "welcome" && (
                    <div className="mt-5 space-y-4">
                        {/* Selector for Roles */}
                        <div className="flex flex-wrap gap-2">
                            {(["all", "fan", "creator"] as const).map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase transition flex items-center gap-2 ${selectedRole === role ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "border-white/10 bg-black/40 text-gray-400 hover:text-white"}`}
                                >
                                    {roleIconMap[role]}
                                    {role === "all" ? "Guest User (All)" : role === "fan" ? "Fan User" : "Creator User"}
                                </button>
                            ))}
                        </div>

                        {/* Editor Config Fields */}
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-cyan-200">
                                        Campaign Settings for: <span className="text-pink-400 capitalize">{selectedRole === "all" ? "Guest/All" : selectedRole}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400">Controls popup visibility and message contents on initial entry.</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={currentMsg.enabled}
                                        onChange={(e) => updateWelcomeMsg("enabled", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600 peer-checked:after:bg-white" />
                                </label>
                            </div>

                            {currentMsg.enabled ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="text-xs font-medium text-gray-300">Welcome Title (Headline)</label>
                                            <input
                                                type="text"
                                                value={currentMsg.title}
                                                onChange={(e) => updateWelcomeMsg("title", e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-pink-500/50 outline-none transition"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-300">Accent Branding Color</label>
                                            <select
                                                value={currentMsg.accentColor}
                                                onChange={(e) => updateWelcomeMsg("accentColor", e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-gray-200 focus:border-pink-500/50 outline-none transition"
                                            >
                                                <option value="blue">Electric Blue</option>
                                                <option value="pink">Neon Pink</option>
                                                <option value="purple">Ultraviolet Purple</option>
                                                <option value="green">Emerald Green</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-300">Welcome Body Message</label>
                                        <textarea
                                            value={currentMsg.message}
                                            onChange={(e) => updateWelcomeMsg("message", e.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-pink-500/50 outline-none transition resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-300 font-semibold">Call to Action Button Text</label>
                                            <input
                                                type="text"
                                                value={currentMsg.buttonText}
                                                onChange={(e) => updateWelcomeMsg("buttonText", e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-pink-500/50 outline-none transition"
                                            />
                                        </div>

                                        <div className="flex items-end pb-0.5">
                                            <NeonButton
                                                onClick={() => setSimulationRole(selectedRole)}
                                                variant="ghost"
                                                className="w-full flex items-center justify-center gap-2 border-dashed border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 h-10"
                                            >
                                                <Eye className="w-4 h-4" /> Live Simulate Popup
                                            </NeonButton>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-500">Welcome Popup is disabled for this role. Toggle to configure.</div>
                            )}
                        </div>
                    </div>
                )}
            </NeonCard>

            {/* Simulated Popup Portal Modal Overlay */}
            {simulationRole && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
                    <div className="relative w-full max-w-md rounded-3xl border border-white/15 p-6 bg-gradient-to-b from-neutral-900 via-black to-black shadow-2xl flex flex-col items-center text-center">
                        <button
                            onClick={() => setSimulationRole(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl transition"
                        >
                            ×
                        </button>

                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest border border-white/10 bg-white/5 px-2 py-0.5 rounded-full mb-4">
                            Simulated Live Preview
                        </div>

                        {/* Simulate Accented Color Layouts */}
                        <div className={`w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mb-4`}>
                            {roleIconMap[simulationRole]}
                        </div>

                        <h3 className={`text-xl font-black italic tracking-wide mb-2 ${previewAccent === "pink" ? "text-pink-400" : previewAccent === "purple" ? "text-violet-400" : previewAccent === "green" ? "text-emerald-400" : "text-cyan-400"}`}>
                            {welcomeCampaigns[simulationRole].title}
                        </h3>

                        <p className="text-xs text-gray-300 leading-relaxed max-w-sm mb-5">
                            {welcomeCampaigns[simulationRole].message}
                        </p>

                        <button
                            onClick={() => setSimulationRole(null)}
                            className={`w-full sm:w-auto px-6 py-2 rounded-xl text-xs font-bold text-white transition-all ${previewAccent === "pink" ? "bg-pink-600 hover:bg-pink-700" : previewAccent === "purple" ? "bg-violet-600 hover:bg-violet-700" : previewAccent === "green" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-cyan-600 hover:bg-cyan-700"}`}
                        >
                            {welcomeCampaigns[simulationRole].buttonText}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
