"use strict";
import React, { useEffect, useState } from "react";
import { Users, Edit, Wallet, Crown, Star, X, Save } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { useAdmin } from "../hooks/useAdmin";

interface UserProfile {
    id: string;
    full_name: string;
    username: string;
    role: string;
    status: string;
    created_at: string;
    avatar_url?: string;
    account_type_id?: string;
    creator_level_id?: string;
    fan_membership_id?: string;
    kyc_status?: string;
}

interface AccountType {
    id: string;
    display_name: string;
}

interface CreatorLevel {
    id: string;
    name: string;
}

export default function UserManagement() {
    const supabase = createClient();
    const { logAction } = useAdmin();
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [walletBalance, setWalletBalance] = useState<string>("");
    const [selectedAccountType, setSelectedAccountType] = useState<string>("");
    const [selectedCreatorLevel, setSelectedCreatorLevel] = useState<string>("");
    const [selectedKycStatus, setSelectedKycStatus] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    // Metadata State
    const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
    const [creatorLevels, setCreatorLevels] = useState<CreatorLevel[]>([]);

    useEffect(() => {
        // Fetch metadata
        const fetchMetadata = async () => {
            const { data: at } = await supabase.from('account_types').select('id, display_name');
            if (at) setAccountTypes(at);

            const { data: cl } = await supabase.from('creator_levels').select('id, name');
            if (cl) setCreatorLevels(cl);
        };
        fetchMetadata();
    }, []);

    // Debounced search
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);

            if (query.trim()) {
                const term = query.trim();
                q = q.or(`username.ilike.%${term}%,full_name.ilike.%${term}%,id.eq.${term}`);
            }

            const { data, error } = await q;
            if (error) {
                toast.error("Failed to fetch users");
            } else {
                setUsers(data || []);
            }
            setLoading(false);
        };

        const timer = setTimeout(fetchUsers, 500);
        return () => clearTimeout(timer);
    }, [query, supabase]);

    const toggleStatus = async (userId: string, currentStatus: string | null) => {
        const newStatus = currentStatus === "Restricted" ? "Active" : "Restricted";
        const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);

        if (error) {
            toast.error("Update failed");
            return;
        }

        toast.success(`User ${newStatus === 'Restricted' ? 'restricted' : 'activated'}`);
        await logAction('UPDATE_USER_STATUS', userId, { from: currentStatus, to: newStatus });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    };

    const openEditModal = async (user: UserProfile) => {
        setEditingUser(user);
        setSelectedAccountType(user.account_type_id || "");
        setSelectedCreatorLevel(user.creator_level_id || "");
        setSelectedKycStatus(user.kyc_status || "not_required");

        // Fetch wallet balance
        const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
        setWalletBalance(wallet?.balance?.toString() || "0");
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        setIsSaving(true);

        try {
            const { error } = await supabase.rpc('admin_update_user_details', {
                target_user_id: editingUser.id,
                new_balance: parseFloat(walletBalance),
                new_account_type_id: selectedAccountType || null,
                new_creator_level_id: selectedCreatorLevel || null,
                new_kyc_status: selectedKycStatus || null
            });

            if (error) throw error;

            toast.success("User updated successfully");
            setEditingUser(null);

            // Refresh local state
            setUsers(prev => prev.map(u =>
                u.id === editingUser.id ? {
                    ...u,
                    account_type_id: selectedAccountType || undefined,
                    creator_level_id: selectedCreatorLevel || undefined,
                    kyc_status: selectedKycStatus || undefined
                } : u
            ));

        } catch (err: any) {
            toast.error("Failed to update user: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Users className="w-4 h-4" />}
                title="User Management"
                sub="Search and edit user details, wallets, and badges."
            />

            <div className="mt-4 flex items-center gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by id, name, username..."
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 transition-colors"
                />
                <NeonButton variant="ghost" onClick={() => setQuery("")}>Clear</NeonButton>
            </div>

            <div className="mt-4">
                {loading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Loading users...</div>
                ) : (
                    <AdminTable
                        columns={[
                            { key: "info", label: "User Info" },
                            { key: "role", label: "Role", w: "100px" },
                            { key: "status", label: "Status", w: "100px" },
                            { key: "joined", label: "Joined", w: "120px" },
                            { key: "act", label: "Actions", w: "180px", right: true },
                        ]}
                        rows={users.map((u) => ({
                            info: (
                                <div>
                                    <div className="text-white font-medium">{u.full_name || "Unknown"}</div>
                                    <div className="text-[10px] text-gray-400">@{u.username} • {u.id.slice(0, 8)}...</div>
                                </div>
                            ),
                            role: (
                                <div className="flex flex-col gap-1">
                                    <AdminPill tone={u.role === "creator" ? "pink" : "cyan"}>{u.role || "fan"}</AdminPill>
                                    {u.role === "creator" && u.kyc_status && (
                                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border text-center
                                            ${u.kyc_status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                u.kyc_status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}
                                        >
                                            {u.kyc_status}
                                        </span>
                                    )}
                                </div>
                            ),
                            status: u.status === "Restricted" ? <AdminPill tone="red">Restricted</AdminPill> : <AdminPill tone="green">Active</AdminPill>,
                            joined: new Date(u.created_at).toLocaleDateString(),
                            act: (
                                <div className="flex items-center justify-end gap-2">
                                    <NeonButton
                                        variant="pink"
                                        onClick={() => openEditModal(u)}
                                        className="scale-90"
                                    >
                                        Edit
                                    </NeonButton>
                                    <NeonButton
                                        variant={u.status === "Restricted" ? "blue" : "pink"}
                                        onClick={() => toggleStatus(u.id, u.status)}
                                        className="scale-90"
                                    >
                                        {u.status === "Restricted" ? "Lift" : "Restrict"}
                                    </NeonButton>
                                </div>
                            ),
                        }))}
                    />
                )}
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <NeonCard className="w-full max-w-lg p-6 bg-black border-pink-500/20 relative">
                        <button
                            onClick={() => setEditingUser(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Edit className="w-5 h-5 text-pink-500" />
                            Edit User: {editingUser.full_name}
                        </h3>

                        <div className="space-y-6">
                            {/* Wallet Balance */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-green-400" />
                                    Wallet Balance ($)
                                </label>
                                <input
                                    type="number"
                                    value={walletBalance}
                                    onChange={(e) => setWalletBalance(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-green-500/50 transition-colors font-mono text-lg"
                                />
                            </div>

                            {/* Account Type (Fan Package) */}
                            {editingUser.role === 'fan' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <Star className="w-4 h-4 text-purple-400" />
                                        Account Type (Fan Package)
                                    </label>
                                    <select
                                        value={selectedAccountType}
                                        onChange={(e) => setSelectedAccountType(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-purple-500/50 transition-colors appearance-none"
                                    >
                                        <option value="">No Package</option>
                                        {accountTypes.map(type => (
                                            <option key={type.id} value={type.id}>{type.display_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Creator Level & KYC (Badge) */}
                            {editingUser.role === 'creator' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                            <Crown className="w-4 h-4 text-yellow-400" />
                                            Creator Level (Badge)
                                        </label>
                                        <select
                                            value={selectedCreatorLevel}
                                            onChange={(e) => setSelectedCreatorLevel(e.target.value)}
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-yellow-500/50 transition-colors appearance-none"
                                        >
                                            <option value="">No Level</option>
                                            {creatorLevels.map(level => (
                                                <option key={level.id} value={level.id}>{level.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                            <Crown className="w-4 h-4 text-blue-400" />
                                            KYC Status
                                        </label>
                                        <select
                                            value={selectedKycStatus}
                                            onChange={(e) => setSelectedKycStatus(e.target.value)}
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-colors appearance-none"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="not_required">Not Required</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <NeonButton variant="ghost" onClick={() => setEditingUser(null)}>
                                Cancel
                            </NeonButton>
                            <NeonButton
                                variant="pink"
                                onClick={handleSaveUser}
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </NeonButton>
                        </div>
                    </NeonCard>
                </div>
            )}
        </NeonCard>
    );
}
