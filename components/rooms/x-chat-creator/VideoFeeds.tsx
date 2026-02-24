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
                className="relative w-full h-[300px] rounded-xl overflow-hidden gold-border gold-glow"
            >
                <img
                    src="/x-chat/streamer-male.png"
                    alt="Male streamer"
                    className="w-full h-full object-cover object-top"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-background/70 backdrop-blur-sm rounded-full px-3 py-1">
                    <Heart className="w-4 h-4 text-destructive fill-destructive" />
                    <span className="text-sm font-bold text-foreground">800</span>
                </div>
            </motion.div>

            {/* Female Streamer */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="relative w-full h-[300px] rounded-xl overflow-hidden gold-border gold-glow"
            >
                <img
                    src="/x-chat/streamer-female.png"
                    alt="Female streamer"
                    className="w-full h-full object-cover object-top"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-background/70 backdrop-blur-sm rounded-full px-3 py-1">
                    <Diamond className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-sm font-bold text-foreground">650</span>
                </div>
            </motion.div>
        </div>
    );
};

export default VideoFeeds;
