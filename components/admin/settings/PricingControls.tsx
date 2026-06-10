"use strict";
import React, { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { useAdmin, GlobalPricing } from "../hooks/useAdmin";
import { cs } from "@/utils/currency";

export default function PricingControls() {
    const { fetchSetting, updateSetting } = useAdmin();
    const [loading, setLoading] = useState(true);

    // State mirroring the DB schema
    const [pricing, setPricing] = useState<GlobalPricing>({
        entry_fee: 10,
        free_minutes: 5,
        rate_per_minute: 2,
        per_minute_billing_enabled: true,
        creator_split_percent: 85,
        platform_split_percent: 15,
        auto_kick_on_insufficient: true,
        min_wallet_balance: 10,
        system_truth_bronze: 5,
        system_truth_silver: 10,
        system_truth_gold: 20,
        system_dare_bronze: 5,
        system_dare_silver: 10,
        system_dare_gold: 20
    });

    const [pricingVersion, setPricingVersion] = useState("v1.0");
    const [pricingNote, setPricingNote] = useState("");

    useEffect(() => {
        const load = async () => {
            const data = await fetchSetting<GlobalPricing>('global_pricing');
            if (data) {
                // Ensure defaults are populated
                setPricing({
                    per_minute_billing_enabled: true,
                    creator_split_percent: 85,
                    platform_split_percent: 15,
                    auto_kick_on_insufficient: true,
                    min_wallet_balance: 10,
                    ...data
                });
            }
            setLoading(false);
        };
        load();
    }, [fetchSetting]);

    const handleSave = async () => {
        const success = await updateSetting('global_pricing', pricing, 'Global room pricing configuration');
        if (success && pricingNote) {
            // Log version note separately or as part of the update
            // For now just clearing the note as "saved"
            setPricingNote("");
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading configuration...</div>;

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Settings className="w-4 h-4" />}
                title="Pricing Controls"
                sub="Pricing configurations and versioning notes."
                right={
                    <NeonButton onClick={handleSave} variant="pink">Save Changes</NeonButton>
                }
            />

            <div className="mt-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-cyan-200">Pricing Versioning</div>
                        <AdminPill tone="amber">{pricingVersion}</AdminPill>
                    </div>

                    <div className="mt-3">
                        <label className="text-xs text-gray-300">Release Note (Optional)</label>
                        <textarea
                            value={pricingNote}
                            onChange={(e) => setPricingNote(e.target.value)}
                            placeholder="Reason for change..."
                            className="mt-1 w-full min-h-[92px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Global Per-Minute Billing Section */}
            {(() => {
                const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-xs text-gray-300 font-semibold">{label}</span>
                        <button
                            type="button"
                            onClick={() => onChange(!value)}
                            style={{
                                width: "42px",
                                height: "24px",
                                borderRadius: "12px",
                                border: "none",
                                background: value ? "hsl(150,80%,40%)" : "rgba(255,255,255,0.15)",
                                cursor: "pointer",
                                position: "relative",
                                transition: "background 0.2s",
                            }}
                        >
                            <div
                                style={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    background: "#fff",
                                    position: "absolute",
                                    top: "3px",
                                    left: value ? "21px" : "3px",
                                    transition: "left 0.2s",
                                }}
                            />
                        </button>
                    </div>
                );

                return (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div className="text-sm text-cyan-200 mb-3">Global Per-Minute Billing Defaults</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Toggle
                                    label="Global Billing Toggle"
                                    value={pricing.per_minute_billing_enabled ?? true}
                                    onChange={(v) => setPricing(p => ({ ...p, per_minute_billing_enabled: v }))}
                                />
                                <Toggle
                                    label="Global Auto Kick"
                                    value={pricing.auto_kick_on_insufficient ?? true}
                                    onChange={(v) => setPricing(p => ({ ...p, auto_kick_on_insufficient: v }))}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                    Free Minutes
                                    <input
                                        type="number"
                                        value={pricing.free_minutes ?? 1}
                                        min={0}
                                        onChange={(e) => setPricing(p => ({ ...p, free_minutes: Number(e.target.value) }))}
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
                                    />
                                </label>
                                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                    Min Wallet ($)
                                    <input
                                        type="number"
                                        value={pricing.min_wallet_balance ?? 10}
                                        min={0}
                                        onChange={(e) => setPricing(p => ({ ...p, min_wallet_balance: Number(e.target.value) }))}
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
                                    />
                                </label>
                                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                    Creator Split (%)
                                    <input
                                        type="number"
                                        value={pricing.creator_split_percent ?? 85}
                                        min={0}
                                        max={100}
                                        onChange={(e) => {
                                            const c = Number(e.target.value);
                                            const p = 100 - c;
                                            setPricing(prev => ({ ...prev, creator_split_percent: c, platform_split_percent: p }));
                                        }}
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-400 text-right">
                            Revenue Split Splitout — Creator: <strong className="text-white">{pricing.creator_split_percent ?? 85}%</strong> / Platform: <strong className="text-white">{pricing.platform_split_percent ?? 15}%</strong>
                        </div>
                    </div>
                );
            })()}

            {/* System Prompt Pricing Section */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-cyan-200 mb-3">System Truth & Dare Pricing</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Truth Pricing */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-cyan-500 uppercase tracking-wider">System Truth</div>
                        <div className="grid grid-cols-3 gap-3">
                            <label className="text-[10px] text-gray-400">
                                Bronze ($)
                                <input
                                    type="number"
                                    value={pricing.system_truth_bronze || 5}
                                    onChange={(e) => setPricing(p => ({ ...p, system_truth_bronze: Number(e.target.value) }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-500"
                                />
                            </label>
                            <label className="text-[10px] text-gray-400">
                                Silver ($)
                                <input
                                    type="number"
                                    value={pricing.system_truth_silver || 10}
                                    onChange={(e) => setPricing(p => ({ ...p, system_truth_silver: Number(e.target.value) }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-500"
                                />
                            </label>
                            <label className="text-[10px] text-gray-400">
                                Gold ($)
                                <input
                                    type="number"
                                    value={pricing.system_truth_gold || 20}
                                    onChange={(e) => setPricing(p => ({ ...p, system_truth_gold: Number(e.target.value) }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-500"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Dare Pricing */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-red-500 uppercase tracking-wider">System Dare</div>
                        <div className="grid grid-cols-3 gap-3">
                            <label className="text-[10px] text-gray-400">
                                Bronze ($)
                                <input
                                    type="number"
                                    value={pricing.system_dare_bronze || 5}
                                    onChange={(e) => setPricing(p => ({ ...p, system_dare_bronze: Number(e.target.value) }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-red-500"
                                />
                            </label>
                            <label className="text-[10px] text-gray-400">
                                Silver ($)
                                <input
                                    type="number"
                                    value={pricing.system_dare_silver || 10}
                                    onChange={(e) => setPricing(p => ({ ...p, system_dare_silver: Number(e.target.value) }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-red-500"
                                />
                            </label>
                            <label className="text-[10px] text-gray-400">
                                Gold ($)
                                <input
                                    type="number"
                                    value={pricing.system_dare_gold || 20}
                                    onChange={(e) => setPricing(p => ({ ...p, system_dare_gold: Number(e.target.value) }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-red-500"
                                />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="text-sm text-cyan-200">Room Pricing Snapshot (Live)</div>
                <div className="mt-3">
                    <AdminTable
                        columns={[
                            { key: "room", label: "Example Room Name" },
                            { key: "entry", label: "Entry", w: "120px", right: true },
                            { key: "free", label: "Free", w: "120px", right: true },
                            { key: "rate", label: "Rate", w: "140px", right: true },
                            { key: "mode", label: "Mode", w: "140px" },
                        ]}
                        rows={[
                            { room: "Suga4U Global", entry: `${cs()}${pricing.entry_fee}`, free: `${pricing.free_minutes}m`, rate: `${cs()}${pricing.rate_per_minute}/m`, mode: <AdminPill tone="pink">Global</AdminPill> },
                            { room: "Bar Lounge (Override)", entry: `${cs()}${Math.max(0, pricing.entry_fee - 5)}`, free: `${Math.max(0, pricing.free_minutes - 5)}m`, rate: `${cs()}${pricing.rate_per_minute}/m`, mode: <AdminPill tone="amber">Override</AdminPill> },
                        ]}
                    />
                </div>
            </div>
        </NeonCard>
    );
}
