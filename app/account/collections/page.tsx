"use client";

import React from "react";
import { Star, Filter, Heart, Lock, Play, Image as ImageIcon } from "lucide-react";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function CollectionXPage() {
    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20 lg:pb-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Star className="w-6 h-6 text-yellow-400" />
                        CollectionX
                    </h1>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 bg-gray-900">
                            {/* Media Placeholder */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-black"></div>

                            {/* Type Indicator */}
                            <div className="absolute top-2 right-2">
                                {i % 2 === 0 ? (
                                    <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-blue-300"><Play className="w-3 h-3 fill-current" /></div>
                                ) : (
                                    <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-pink-300"><ImageIcon className="w-3 h-3" /></div>
                                )}
                            </div>

                            {/* Content Info */}
                            <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent pt-8">
                                <div className="text-sm font-medium text-white truncate">Exclusive Drop #{i}</div>
                                <div className="text-xs text-gray-400">Unlocked 2 days ago</div>
                            </div>

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-4">
                                <button className="px-4 py-2 bg-white text-black font-bold rounded-full transform scale-95 group-hover:scale-100 transition">View</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
