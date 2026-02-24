"use client";

import { motion } from "framer-motion";
import { Heart, Diamond } from "lucide-react";

const VideoFeeds = () => {
    return (
        <div className="flex flex-col gap-4 items-center justify-center w-full max-w-2xl mx-auto px-20">
            {/* Male Streamer */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative w-full h-[300px] rounded-xl overflow-hidden"
                style={{
                    border: "1px solid hsla(40, 70%, 50%, 0.35)",
                    boxShadow: "0 0 20px hsla(40, 70%, 50%, 0.3)",
                }}
            >
                <img
                    src="/x-chat/streamer-male.png"
                    alt="Male streamer"
                    className="w-full h-full object-cover object-top"
                />
                <div
                    className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full px-3 py-1"
                    style={{ background: "hsla(25, 15%, 8%, 0.7)", backdropFilter: "blur(4px)" }}
                >
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    <span className="text-sm font-bold" style={{ color: "hsl(40, 60%, 90%)" }}>800</span>
                </div>
            </motion.div>

            {/* Female Streamer */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="relative w-full h-[300px] rounded-xl overflow-hidden"
                style={{
                    border: "1px solid hsla(40, 70%, 50%, 0.35)",
                    boxShadow: "0 0 20px hsla(40, 70%, 50%, 0.3)",
                }}
            >
                <img
                    src="/x-chat/streamer-female.png"
                    alt="Female streamer"
                    className="w-full h-full object-cover object-top"
                />
                <div
                    className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full px-3 py-1"
                    style={{ background: "hsla(25, 15%, 8%, 0.7)", backdropFilter: "blur(4px)" }}
                >
                    <Diamond className="w-4 h-4" style={{ color: "hsl(40, 70%, 50%)", fill: "hsl(40, 70%, 50%)" }} />
                    <span className="text-sm font-bold" style={{ color: "hsl(40, 60%, 90%)" }}>650</span>
                </div>
            </motion.div>
        </div>
    );
};

export default VideoFeeds;
