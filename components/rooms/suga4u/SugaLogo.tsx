import React from "react";

interface SugaLogoProps {
    className?: string;
}

const SugaLogo = ({ className }: SugaLogoProps) => (
    <div className={`flex items-center gap-2.5 ${className || ""}`}>
        <div className="relative group flex-shrink-0">
            {/* Outer pulsing ring */}
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-pink-500 to-amber-500 opacity-60 blur-[2px] group-hover:opacity-100 transition duration-500 animate-pulse" />
            {/* Image Container */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-black/40 flex items-center justify-center">
                <img 
                    src="/rooms/suga4u/suga4uimage.png" 
                    alt="Suga 4U" 
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
        <div className="flex flex-col justify-center select-none">
            <h1 className="font-display text-[15px] font-extrabold tracking-wider leading-none">
                <span className="glow-text-pink">SUGA</span>
                <span className="glow-text-gold">4U</span>
            </h1>
            <p className="text-[8px] font-semibold text-gold-light tracking-widest uppercase mt-0.5 leading-none">
                Premium Room
            </p>
        </div>
    </div>
);

export default SugaLogo;
