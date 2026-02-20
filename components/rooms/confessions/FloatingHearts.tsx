"use client";

import { useEffect, useState } from "react";

const FloatingHearts = () => {
    const [hearts, setHearts] = useState<{ id: number; left: number; delay: number }[]>([]);

    useEffect(() => {
        // Generate initial hearts safely on client to avoid hydration mismatch
        const initialHearts = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 5,
        }));
        setHearts(initialHearts);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {hearts.map((heart) => (
                <div
                    key={heart.id}
                    className="absolute bottom-[-10%] text-primary/20 text-2xl animate-[heart-float_10s_ease-in-out_infinite]"
                    style={{
                        left: `${heart.left}%`,
                        animationDelay: `${heart.delay}s`,
                        animationDuration: `${8 + Math.random() * 4}s`,
                    }}
                >
                    ❤️
                </div>
            ))}
        </div>
    );
};

export default FloatingHearts;
