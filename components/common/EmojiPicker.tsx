"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
    {
        label: "Smileys",
        emojis: ["😀", "😂", "🤣", "😍", "🥰", "😘", "😜", "🤩", "😎", "🥳", "😏", "😈", "🤗", "🤭", "🫣", "😱", "🥺", "😭", "🤯", "🫠"],
    },
    {
        label: "Love & Hearts",
        emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💖", "💝", "💗", "💓", "💞", "💕", "💘", "💋", "😻", "🫶", "❤️‍🔥", "💑", "💏"],
    },
    {
        label: "Gestures",
        emojis: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "🤙", "👋", "🫡", "💪", "🙏", "☝️", "👆", "👇", "👈", "👉", "🫰", "🤌", "🤏"],
    },
    {
        label: "Party & Fun",
        emojis: ["🎉", "🎊", "🎵", "🎶", "🎤", "🎸", "🎹", "🥂", "🍾", "🍻", "🍸", "🍹", "🔥", "⚡", "✨", "🌟", "💫", "🎯", "🏆", "👑"],
    },
    {
        label: "Reactions",
        emojis: ["👀", "💯", "🙈", "🙉", "🙊", "💀", "☠️", "👻", "🤖", "👽", "🦄", "🐍", "🦋", "🌹", "🍀", "🌶️", "🍑", "🍆", "💎", "🚀"],
    },
];

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    /** Controls icon + popup accent color */
    accentColor?: string;
    /** Position the popup above or below the trigger */
    position?: "top" | "bottom";
    /** Optional custom trigger element to render instead of the default Smile icon */
    customTrigger?: React.ReactNode;
}

export default function EmojiPicker({ onEmojiSelect, accentColor = "hsl(45, 90%, 55%)", position = "top", customTrigger }: EmojiPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(0);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

    // Calculate popup position based on trigger button location
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const popupWidth = 280;
        const popupHeight = 320;

        let left = rect.right - popupWidth; // Align right edge with button
        if (left < 8) left = 8; // Don't go off-screen left
        if (left + popupWidth > window.innerWidth - 8) left = window.innerWidth - popupWidth - 8;

        let top: number;
        if (position === "top") {
            top = rect.top - popupHeight - 8;
            if (top < 8) top = rect.bottom + 8; // Flip to bottom if no space
        } else {
            top = rect.bottom + 8;
            if (top + popupHeight > window.innerHeight - 8) top = rect.top - popupHeight - 8; // Flip to top
        }

        setPopupPos({ top, left });
    }, [position]);

    // Update position when opening
    useEffect(() => {
        if (isOpen) {
            updatePosition();
        }
    }, [isOpen, updatePosition]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                popupRef.current && !popupRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Close on scroll or resize
    useEffect(() => {
        if (!isOpen) return;
        const handleClose = () => setIsOpen(false);
        window.addEventListener("resize", handleClose);
        return () => window.removeEventListener("resize", handleClose);
    }, [isOpen]);

    const popupContent = isOpen && popupPos && createPortal(
        <div
            ref={popupRef}
            style={{
                position: "fixed",
                top: `${popupPos.top}px`,
                left: `${popupPos.left}px`,
                width: "280px",
                maxHeight: "320px",
                background: "hsla(270, 40%, 12%, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid hsla(280, 60%, 45%, 0.35)",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px hsla(280, 100%, 70%, 0.15)",
                zIndex: 99999,
                overflow: "hidden",
                animation: "emojiPickerFadeIn 0.15s ease-out",
            }}
        >
            <style>{`
                @keyframes emojiPickerFadeIn {
                    from { opacity: 0; transform: translateY(${position === "top" ? "8px" : "-8px"}); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .emoji-grid-scroll::-webkit-scrollbar { width: 4px; }
                .emoji-grid-scroll::-webkit-scrollbar-track { background: transparent; }
                .emoji-grid-scroll::-webkit-scrollbar-thumb { background: hsla(280, 60%, 45%, 0.3); border-radius: 10px; }
                .emoji-btn:hover { background: hsla(280, 60%, 45%, 0.3) !important; transform: scale(1.2); }
            `}</style>

            {/* Category tabs */}
            <div style={{
                display: "flex",
                gap: "2px",
                padding: "6px 6px 0",
                borderBottom: "1px solid hsla(280, 60%, 45%, 0.2)",
            }}>
                {EMOJI_CATEGORIES.map((cat, idx) => (
                    <button
                        key={cat.label}
                        type="button"
                        onClick={() => setActiveCategory(idx)}
                        style={{
                            flex: 1,
                            background: idx === activeCategory ? "hsla(280, 60%, 45%, 0.25)" : "transparent",
                            border: "none",
                            borderRadius: "8px 8px 0 0",
                            padding: "6px 4px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: idx === activeCategory ? accentColor : "hsl(280, 15%, 55%)",
                            transition: "all 0.15s",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontFamily: "'Montserrat', sans-serif",
                        }}
                        title={cat.label}
                    >
                        {cat.emojis[0]}
                    </button>
                ))}
            </div>

            {/* Category label */}
            <div style={{
                padding: "8px 12px 4px",
                fontSize: "10px",
                fontWeight: 700,
                color: "hsl(280, 15%, 55%)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: "'Montserrat', sans-serif",
            }}>
                {EMOJI_CATEGORIES[activeCategory].label}
            </div>

            {/* Emoji grid */}
            <div
                className="emoji-grid-scroll"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gap: "2px",
                    padding: "4px 8px 10px",
                    overflowY: "auto",
                    maxHeight: "220px",
                }}
            >
                {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                    <button
                        key={emoji}
                        type="button"
                        className="emoji-btn"
                        onClick={() => {
                            onEmojiSelect(emoji);
                            setIsOpen(false);
                        }}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "20px",
                            padding: "4px",
                            borderRadius: "6px",
                            transition: "all 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                        }}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>,
        document.body
    );

    return (
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            {/* Trigger button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Open emoji picker"
                style={customTrigger ? {
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                } : {
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                    transition: "all 0.2s",
                    color: isOpen ? accentColor : "hsl(280, 15%, 60%)",
                }}
                onMouseEnter={customTrigger ? undefined : (e) => { (e.currentTarget as HTMLButtonElement).style.color = accentColor; (e.currentTarget as HTMLButtonElement).style.background = "hsla(280, 40%, 25%, 0.3)"; }}
                onMouseLeave={customTrigger ? undefined : (e) => { (e.currentTarget as HTMLButtonElement).style.color = isOpen ? accentColor : "hsl(280, 15%, 60%)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
                {customTrigger || <Smile style={{ width: "18px", height: "18px" }} />}
            </button>

            {popupContent}
        </div>
    );
}
