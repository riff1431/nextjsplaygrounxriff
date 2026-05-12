"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Volume2 } from "lucide-react";

interface VipDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    delivery: {
        creatorName: string;
        text?: string;
        mediaUrl?: string;
        mediaType?: string; // 'image' | 'video' | 'audio'
        originalRequestLabel: string;
    } | null;
}

const VipDeliveryModal = ({ isOpen, onClose, delivery }: VipDeliveryModalProps) => {
    if (!isOpen || !delivery) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-md md:max-w-lg overflow-hidden flex flex-col items-center"
                >
                    {/* Glowing background behind modal */}
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/20 to-purple-900/40 blur-3xl -z-10 rounded-full" />

                    <div className="w-full relative rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                         style={{ 
                             background: "linear-gradient(180deg, hsla(270, 50%, 8%, 0.9) 0%, hsla(270, 40%, 12%, 0.95) 100%)",
                             boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 40px rgba(255, 215, 0, 0.15)"
                         }}>
                        
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">👑</span>
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-gold drop-shadow-md">VIP Delivery</h3>
                                    <p className="text-xs text-white/50">from {delivery.creatorName}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Media Area */}
                        {delivery.mediaUrl && (
                            <div className="w-full bg-black/60 relative flex items-center justify-center min-h-[250px] max-h-[500px] border-b border-white/5">
                                {delivery.mediaType === 'video' ? (
                                    <video src={delivery.mediaUrl} controls autoPlay className="max-h-[500px] w-full object-contain" />
                                ) : delivery.mediaType === 'audio' ? (
                                    <div className="p-10 w-full flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center animate-pulse">
                                            <Volume2 className="w-10 h-10 text-blue-400" />
                                        </div>
                                        <audio src={delivery.mediaUrl} controls autoPlay className="w-full max-w-[300px]" />
                                    </div>
                                ) : (
                                    <img src={delivery.mediaUrl} alt="VIP Media" className="max-h-[500px] w-full object-contain" />
                                )}
                            </div>
                        )}

                        {/* Text Content */}
                        <div className="p-6 flex flex-col gap-4">
                            {/* Original Request Reference */}
                            <div className="text-xs text-white/40 italic px-3 border-l-2 border-white/10">
                                You requested: "{delivery.originalRequestLabel}"
                            </div>

                            {/* Creator Message */}
                            {delivery.text && (
                                <p className="text-white/90 text-sm md:text-base leading-relaxed font-medium">
                                    "{delivery.text}"
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default VipDeliveryModal;
