"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function VerifyPage() {
    const supabase = createClient();
    const [status, setStatus] = useState("Checking connection...");
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Initial check
    useEffect(() => {
        async function check() {
            try {
                // Check auth
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                // Check rooms
                const { data: roomData, error } = await supabase.from('rooms').select('*');
                if (error) {
                    if (error.code === '42P01') {
                        setStatus("❌ Table 'rooms' does NOT exist.");
                    } else {
                        setStatus("⚠️ Error: " + error.message);
                    }
                } else {
                    setStatus("✅ Table 'rooms' exists.");
                    setRooms(roomData || []);
                }
            } catch (e: any) {
                setStatus("Error: " + e.message);
            }
        }
        check();
    }, [supabase]);

    const createTestRoom = async () => {
        if (!user) {
            alert("No user logged in. Go to /auth first.");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('rooms').insert({
                host_id: user.id,
                title: "Debug Live Room",
                status: "live",
                cover_image: null,
                type: "Suga 4 U"
            });

            if (error) throw error;
            alert("Room created!");
            window.location.reload();
        } catch (err: any) {
            alert("Failed to create room: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const clearRooms = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('rooms').delete().eq('host_id', user.id);
            if (error) throw error;
            alert("Cleared your rooms!");
            window.location.reload();
        } catch (err: any) {
            alert("Failed to clear: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-10 font-sans">
            <h1 className="text-2xl font-bold mb-6 text-pink-500">Database Verification & Seed</h1>

            <div className={`p-4 rounded-xl border mb-6 ${status.includes("exists") ? "border-green-500 bg-green-900/20" : "border-red-500 bg-red-900/20"}`}>
                <div className="font-mono text-sm">{status}</div>
                <div className="mt-2 text-xs text-gray-400">
                    User: {user ? user.email : "Not Logged In"} ({user?.id})
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-semibold mb-4">Existing Rooms ({rooms.length})</h2>
                    {rooms.length === 0 ? (
                        <p className="text-gray-500 italic">No rooms found.</p>
                    ) : (
                        <div className="space-y-2">
                            {rooms.map(r => (
                                <div key={r.id} className="p-3 bg-white/5 rounded border border-white/10 text-sm">
                                    <div className="font-bold text-pink-300">{r.title}</div>
                                    <div className="text-xs text-gray-400">ID: {r.id}</div>
                                    <div className="text-xs text-gray-400">Status: {r.status}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Actions</h2>
                    <button
                        onClick={createTestRoom}
                        disabled={loading || !user}
                        className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 font-bold transition"
                    >
                        {loading ? "Working..." : "Create 'Debug Live Room'"}
                    </button>

                    <button
                        onClick={clearRooms}
                        disabled={loading || !user}
                        className="w-full py-3 rounded-xl bg-red-900/50 border border-red-500/50 hover:bg-red-900/80 disabled:opacity-50 font-bold transition"
                    >
                        Clear My Rooms
                    </button>

                    <div className="pt-4 border-t border-white/10">
                        <a href="/home" className="text-blue-400 hover:underline">Go to Discover Page →</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
