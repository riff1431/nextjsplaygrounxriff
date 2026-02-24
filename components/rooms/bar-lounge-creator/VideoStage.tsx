"use client";

import { Heart } from "lucide-react";

const FloatingHeart = ({ delay, left }: { delay: number; left: string }) => (
    <div
        className="absolute lounge-animate-float"
        style={{
            animationDelay: `${delay}s`,
            left,
            top: "30%",
            color: "hsl(320, 80%, 60%)",
        }}
    >
        <Heart className="w-6 h-6" fill="hsl(320, 80%, 60%)" />
    </div>
);

const VideoStage = () => {
    return (
        <div className="relative flex flex-col items-center justify-center h-full">
            {/* Floating hearts */}
            <FloatingHeart delay={0} left="10%" />
            <FloatingHeart delay={1} left="25%" />
            <FloatingHeart delay={0.5} left="70%" />
            <FloatingHeart delay={1.5} left="85%" />
            <FloatingHeart delay={2} left="50%" />

            {/* Video frame */}
            <div
                className="mt-48 rounded-xl w-[90%] h-[50%] flex items-center justify-center relative overflow-hidden"
                style={{
                    border: "2px solid hsl(45, 90%, 55%)",
                    boxShadow: "0 0 15px hsla(45, 90%, 55%, 0.3), inset 0 0 15px hsla(45, 90%, 55%, 0.1)",
                    background: "hsla(270, 50%, 8%, 0.3)",
                }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: "linear-gradient(to bottom, hsla(270, 30%, 18%, 0.2), hsla(270, 50%, 8%, 0.9))",
                    }}
                />
                <p className="text-sm z-10" style={{ color: "hsl(280, 15%, 60%)" }}>Live Stream</p>
            </div>

            {/* Sparkle effects */}
            <div
                className="absolute top-4 left-1/2 w-2 h-2 rounded-full lounge-animate-sparkle"
                style={{ background: "hsl(45, 90%, 55%)" }}
            />
            <div
                className="absolute top-8 left-1/3 w-1.5 h-1.5 rounded-full lounge-animate-sparkle"
                style={{ background: "hsl(320, 80%, 60%)", animationDelay: "0.5s" }}
            />
            <div
                className="absolute bottom-12 right-1/3 w-1 h-1 rounded-full lounge-animate-sparkle"
                style={{ background: "hsl(45, 90%, 55%)", animationDelay: "1s" }}
            />
        </div>
    );
};

export default VideoStage;
