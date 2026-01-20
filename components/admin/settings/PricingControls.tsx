"use strict";
import React, { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { useAdmin, GlobalPricing } from "../hooks/useAdmin";

export default function PricingControls() {
    const { fetchSetting, updateSetting } = useAdmin();
    const [loading, setLoading] = useState(true);

    // State mirroring the DB schema
    const [pricing, setPricing] = useState<GlobalPricing>({
        entry_fee: 10,
        free_minutes: 5,
        rate_per_minute: 2
    });

    const [pricingVersion, setPricingVersion] = useState("v1.0");
    const [pricingNote, setPricingNote] = useState("");

    useEffect(() => {
        const load = async () => {
            const data = await fetchSetting<GlobalPricing>('global_pricing');
            if (data) setPricing(data);
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
                sub="Global defaults + versioning notes."
                right={
                    <NeonButton onClick={handleSave} variant="pink">Save Changes</NeonButton>
                }
            />

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="text-sm text-cyan-200">Global Defaults</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="text-xs text-gray-300">
                            Entry Fee ($)
                            <input
                                type="number"
                                value={pricing.entry_fee}
                                onChange={(e) => setPricing(p => ({ ...p, entry_fee: Number(e.target.value) }))}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 transition-colors"
                            />
                        </label>
                        <label className="text-xs text-gray-300">
                            Free Minutes
                            <input
                                type="number"
                                value={pricing.free_minutes}
                                onChange={(e) => setPricing(p => ({ ...p, free_minutes: Number(e.target.value) }))}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 transition-colors"
                            />
                        </label>
                        <label className="text-xs text-gray-300">
                            Per Minute ($)
                            <input
                                type="number"
                                value={pricing.rate_per_minute}
                                onChange={(e) => setPricing(p => ({ ...p, rate_per_minute: Number(e.target.value) }))}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 transition-colors"
                            />
                        </label>
                    </div>

                    <div className="mt-3 text-[11px] text-gray-400">
                        These values are authoritative. Rooms without overrides will use these rates immediately.
                    </div>
                </div>

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

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
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
                            { room: "Suga4U Global", entry: `$${pricing.entry_fee}`, free: `${pricing.free_minutes}m`, rate: `$${pricing.rate_per_minute}/m`, mode: <AdminPill tone="pink">Global</AdminPill> },
                            { room: "Bar Lounge (Override)", entry: `$${Math.max(0, pricing.entry_fee - 5)}`, free: `${Math.max(0, pricing.free_minutes - 5)}m`, rate: `$${pricing.rate_per_minute}/m`, mode: <AdminPill tone="amber">Override</AdminPill> },
                        ]}
                    />
                </div>
            </div>
        </NeonCard>
    );
}
