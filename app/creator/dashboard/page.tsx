"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Crown, Sparkles, MessageCircle, BarChart3, Users, DollarSign, Play, Archive, Plus, Lock, MessageSquare, Zap, Wine, Video, Trophy, Settings, ChevronDown, User, LogOut, Upload } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import CreatePostModal from "@/components/posts/CreatePostModal";

// Dashboard Component
export default function CreatorDashboard() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [rooms, setRooms] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalViewers: 0,
        earnings: 0,
        followers: 0,
        activeRooms: 0
    });
    const [user, setUser] = useState<any>(null);
    const [profileOpen, setProfileOpen] = useState(false);

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push('/auth');
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/auth");
                    return;
                }
                setUser(user);

                // Fetch creator's rooms
                const { data: myRooms, error } = await supabase
                    .from('rooms')
                    .select('*')
                    .eq('host_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setRooms(myRooms || []);

                // Fetch real stats via RPC
                const { data: realStats, error: statsError } = await supabase
                    .rpc('get_creator_dashboard_stats', { p_creator_id: user.id });

                if (!statsError && realStats) {
                    setStats({
                        totalViewers: 0, // Not tracked yet aggregate
                        earnings: (realStats.totalEarningsCents || 0) / 100,
                        followers: realStats.totalFollowers || 0,
                        activeRooms: realStats.activeRooms || 0
                    });
                }

            } catch (err: any) {
                console.error("Dashboard error:", err);
                toast.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [router, supabase, user]);

    const handleCreateRoom = (type: string) => {
        // Map types to their specific creation pages or logic
        // For Phase 4, we primarily have Suga4U ready
        if (type === 'suga4u') {
            router.push('/creator/rooms/suga-4-u');
        } else {
            toast.info("This room type is coming soon!");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-pulse text-pink-500">Loading Dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-20">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
                        Creator Dashboard
                    </h1>
                    <p className="text-gray-400 mt-1">Welcome back, @{user?.user_metadata?.username || user?.user_metadata?.full_name || 'Creator'}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/creator/rooms/suga-4-u')}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium flex items-center gap-2 shadow-[0_0_20px_rgba(236,72,153,0.3)] transition"
                    >
                        <Crown className="w-4 h-4" /> Go Live (Suga4U)
                    </button>
                    {/* Profile Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-900/60 border border-white/10 hover:bg-gray-900 transition"
                        >
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                                {(user?.user_metadata?.username?.[0] || 'C').toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-200 hidden md:block">
                                {user?.user_metadata?.username || 'Creator'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-900 border border-white/10 shadow-xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-2 border-b border-white/5">
                                    <div className="px-3 py-2">
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Signed in as</div>
                                        <div className="text-sm font-medium text-white truncate">{user?.email}</div>
                                    </div>
                                </div>
                                <div className="p-1">
                                    <Link
                                        href={`/profile/${user?.id}`}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition"
                                        onClick={() => setProfileOpen(false)}
                                    >
                                        <User className="w-4 h-4 text-pink-500" /> My Profile
                                    </Link>
                                    <Link
                                        href="/settings/profile"
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition"
                                        onClick={() => setProfileOpen(false)}
                                    >
                                        <Settings className="w-4 h-4 text-purple-500" /> Edit Profile
                                    </Link>
                                </div>
                                <div className="p-1 border-t border-white/5">
                                    <button
                                        onClick={() => {
                                            signOut();
                                            setProfileOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                                    >
                                        <LogOut className="w-4 h-4" /> Log Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto space-y-8">

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-gray-900/50 border border-white/10 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs uppercase tracking-wider">Total Earnings</div>
                            <div className="text-2xl font-bold text-gray-100">${stats.earnings.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-gray-900/50 border border-white/10 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs uppercase tracking-wider">Total Followers</div>
                            <div className="text-2xl font-bold text-gray-100">{stats.followers.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-gray-900/50 border border-white/10 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                            <Play className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs uppercase tracking-wider">Active Rooms</div>
                            <div className="text-2xl font-bold text-gray-100">{stats.activeRooms}</div>
                        </div>
                    </div>
                </div>

                {/* Creator Studio Tools */}
                <div>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-100">
                        <Sparkles className="w-5 h-5 text-pink-500" /> Creator Studio
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 0. Upload Content (New) */}
                        <CreatePostModal
                            currentUserId={user?.id || null}
                            onPostCreated={() => {
                                toast.success("Post uploaded successfully!");
                            }}
                            trigger={
                                <button className="group text-left p-6 w-full h-full rounded-3xl bg-gray-900/40 border border-white/5 hover:border-green-500/50 hover:bg-gray-900/60 transition relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-50"><Upload className="w-12 h-12 text-gray-800 group-hover:text-green-900/50 transition transform group-hover:scale-110" /></div>
                                    <div className="p-3 w-fit rounded-xl bg-green-500/20 text-green-400 mb-4 group-hover:bg-green-500 group-hover:text-white transition">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-100 mb-1">Upload Content</h3>
                                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">Post new photos, videos, or status updates to your feed.</p>
                                </button>
                            }
                        />

                        {/* 1. Confessions Studio */}
                        <button onClick={() => router.push('/creator/rooms/confessions')} className="group text-left p-6 rounded-3xl bg-gray-900/40 border border-white/5 hover:border-pink-500/50 hover:bg-gray-900/60 transition relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-50"><Lock className="w-12 h-12 text-gray-800 group-hover:text-pink-900/50 transition transform group-hover:scale-110" /></div>
                            <div className="p-3 w-fit rounded-xl bg-pink-500/20 text-pink-400 mb-4 group-hover:bg-pink-500 group-hover:text-white transition">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-100 mb-1">Confessions Studio</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">Manage backlog, publish text/voice/video confessions.</p>
                        </button>

                        {/* 2. X Chat Console */}
                        <button onClick={() => router.push('/creator/rooms/x-chat')} className="group text-left p-6 rounded-3xl bg-gray-900/40 border border-white/5 hover:border-yellow-500/50 hover:bg-gray-900/60 transition relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-50"><MessageSquare className="w-12 h-12 text-gray-800 group-hover:text-yellow-900/50 transition transform group-hover:scale-110" /></div>
                            <div className="p-3 w-fit rounded-xl bg-yellow-500/20 text-yellow-400 mb-4 group-hover:bg-yellow-500 group-hover:text-white transition">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-100 mb-1">X Chat Console</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">Moderate live chat, set slow mode, answer priority DMs.</p>
                        </button>

                        {/* 3. Flash Drops */}
                        <button onClick={() => router.push('/creator/rooms/flash-drop')} className="group text-left p-6 rounded-3xl bg-gray-900/40 border border-white/5 hover:border-blue-500/50 hover:bg-gray-900/60 transition relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-50"><Zap className="w-12 h-12 text-gray-800 group-hover:text-blue-900/50 transition transform group-hover:scale-110" /></div>
                            <div className="p-3 w-fit rounded-xl bg-blue-500/20 text-blue-400 mb-4 group-hover:bg-blue-500 group-hover:text-white transition">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-100 mb-1">Flash Drops</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">Schedule limited-time drops and monitor sales.</p>
                        </button>

                        {/* 4. Bar Lounge */}
                        <button onClick={() => router.push('/creator/rooms/bar-lounge')} className="group text-left p-6 rounded-3xl bg-gray-900/40 border border-white/5 hover:border-purple-500/50 hover:bg-gray-900/60 transition relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-50"><Wine className="w-12 h-12 text-gray-800 group-hover:text-purple-900/50 transition transform group-hover:scale-110" /></div>
                            <div className="p-3 w-fit rounded-xl bg-purple-500/20 text-purple-400 mb-4 group-hover:bg-purple-500 group-hover:text-white transition">
                                <Wine className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-100 mb-1">Bar Lounge (Host)</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">Manage VIP tables and drink menu.</p>
                        </button>

                        {/* 5. Truth or Dare */}
                        <button onClick={() => router.push('/creator/rooms/truth-or-dare')} className="group text-left p-6 rounded-3xl bg-gray-900/40 border border-white/5 hover:border-green-500/50 hover:bg-gray-900/60 transition relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-50"><Video className="w-12 h-12 text-gray-800 group-hover:text-green-900/50 transition transform group-hover:scale-110" /></div>
                            <div className="p-3 w-fit rounded-xl bg-green-500/20 text-green-400 mb-4 group-hover:bg-green-500 group-hover:text-white transition">
                                <Video className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-100 mb-1">Truth or Dare</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">Control camera slots and prompt queue.</p>
                        </button>

                        {/* 6. Suga 4 U */}
                        <button onClick={() => router.push('/creator/rooms/suga-4-u')} className="group text-left p-6 rounded-3xl bg-gray-900/40 border border-white/5 hover:border-pink-500/50 hover:bg-gray-900/60 transition relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-50"><Crown className="w-12 h-12 text-gray-800 group-hover:text-pink-900/50 transition transform group-hover:scale-110" /></div>
                            <div className="p-3 w-fit rounded-xl bg-pink-500/20 text-pink-400 mb-4 group-hover:bg-pink-500 group-hover:text-white transition">
                                <Crown className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-100 mb-1">Suga 4 U</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">Manage sponsorships and badge tiers.</p>
                        </button>

                        {/* 7. Competition Manager */}
                        <button onClick={() => router.push('/creator/studio/competition')} className="group text-left p-6 rounded-3xl bg-gray-900/40 border border-white/5 hover:border-orange-500/50 hover:bg-gray-900/60 transition relative overflow-hidden col-span-1 md:col-span-2 lg:col-span-2">
                            <div className="absolute top-0 right-0 p-4 opacity-50"><Trophy className="w-12 h-12 text-gray-800 group-hover:text-orange-900/50 transition transform group-hover:scale-110" /></div>
                            <div className="p-3 w-fit rounded-xl bg-orange-500/20 text-orange-400 mb-4 group-hover:bg-orange-500 group-hover:text-white transition">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-100 mb-1">Competition Manager</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">Create battles, manage brackets & prizes.</p>
                        </button>
                    </div>
                </div>

                {/* Recent History (Compacted) */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-400">
                        <Archive className="w-5 h-5" /> Recent Room History
                    </h2>
                    {rooms.filter(r => r.status !== 'live').length === 0 ? (
                        <div className="p-8 rounded-2xl bg-gray-900/30 border border-dashed border-white/10 text-center text-gray-500 text-sm">
                            You haven't created any rooms yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rooms.filter(r => r.status !== 'live').slice(0, 6).map(room => (
                                <div key={room.id} className="p-4 rounded-2xl bg-gray-900/50 border border-white/5 hover:bg-gray-900/70 transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium text-gray-300 truncate pr-2">{room.title}</div>
                                        <div className="px-2 py-0.5 rounded text-[10px] border border-white/10 text-gray-500 uppercase">
                                            {room.status}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {room.type} • {new Date(room.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
