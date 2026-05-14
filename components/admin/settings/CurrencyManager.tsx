"use client";

import React, { useState } from "react";
import { Coins, Check, Globe, ChevronDown, Search } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { useCurrency, SUPPORTED_CURRENCIES, CurrencyConfig } from "@/app/context/CurrencyContext";
import { toast } from "sonner";

export default function CurrencyManager() {
    const { currency, updateCurrency, formatPrice } = useCurrency();
    const [selected, setSelected] = useState<CurrencyConfig>(currency);
    const [saving, setSaving] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCurrencies = SUPPORTED_CURRENCIES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.symbol.includes(searchQuery)
    );

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCurrency(selected);
            toast.success(`Default currency updated to ${selected.name} (${selected.symbol})`);
        } catch {
            toast.error("Failed to update currency");
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = selected.code !== currency.code;

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Coins className="w-4 h-4" />}
                title="Default Currency"
                sub="Set the platform-wide display currency for all pricing and transactions."
                right={
                    <NeonButton
                        variant="pink"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </NeonButton>
                }
            />

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Current Currency Display */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm text-cyan-200">Current Currency</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
                            <span className="text-3xl font-bold text-white">{currency.symbol}</span>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-white">{currency.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <AdminPill tone="cyan">{currency.code}</AdminPill>
                                <span className="text-xs text-gray-500">Active globally</span>
                            </div>
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="mt-5 rounded-xl border border-white/5 bg-black/20 p-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                            Preview with {hasChanges ? "new" : "current"} currency
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            {[10, 99.99, 500].map(amount => (
                                <div key={amount} className="rounded-lg bg-black/30 border border-white/5 p-3">
                                    <div className="text-sm font-bold text-white">
                                        {hasChanges
                                            ? `${selected.symbol}${amount}`
                                            : formatPrice(amount, amount % 1 !== 0 ? 2 : 0)
                                        }
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1">{hasChanges ? selected.code : currency.code}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Currency Selector */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-amber-200">Select Currency</span>
                    </div>

                    {/* Search + Custom Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="w-full flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white hover:border-pink-500/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold">{selected.symbol}</span>
                                <span>{selected.name}</span>
                                <AdminPill tone="amber">{selected.code}</AdminPill>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDropdown && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-2 rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/50 max-h-[320px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Search */}
                                <div className="p-3 border-b border-white/5">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search currencies..."
                                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 transition-colors"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* List */}
                                <div className="overflow-y-auto max-h-[250px] p-2">
                                    {filteredCurrencies.map(c => (
                                        <button
                                            key={c.code}
                                            onClick={() => {
                                                setSelected(c);
                                                setShowDropdown(false);
                                                setSearchQuery("");
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                                                selected.code === c.code
                                                    ? 'bg-pink-500/10 border border-pink-500/20 text-pink-200'
                                                    : 'hover:bg-white/5 text-gray-300 border border-transparent'
                                            }`}
                                        >
                                            <span className="w-8 text-center font-bold text-lg">{c.symbol}</span>
                                            <span className="flex-1 text-left">{c.name}</span>
                                            <span className="text-xs text-gray-500">{c.code}</span>
                                            {selected.code === c.code && (
                                                <Check className="w-4 h-4 text-pink-400" />
                                            )}
                                        </button>
                                    ))}
                                    {filteredCurrencies.length === 0 && (
                                        <div className="text-center text-gray-500 text-xs py-4">
                                            No currencies found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Change indicator */}
                    {hasChanges && (
                        <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 text-amber-300 text-xs">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                Unsaved change: {currency.code} → {selected.code}
                            </div>
                            <div className="mt-2 text-[10px] text-gray-500">
                                This will update the currency symbol displayed across all pricing, wallets, and transaction views.
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="mt-4 text-[11px] text-gray-500 leading-relaxed">
                        <strong className="text-gray-400">Note:</strong> Changing the default currency only updates how prices are <em>displayed</em>.
                        It does not perform any exchange-rate conversions. All stored amounts remain in their original value.
                    </div>
                </div>
            </div>
        </NeonCard>
    );
}
