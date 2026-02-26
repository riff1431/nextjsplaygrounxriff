"use client";

import { useEffect, useState } from "react";

interface FloatingHeart {
    id: number;
    x: number;
    size: number;
    duration: number;
    delay: number;
    opacity: number;
    swayAmount: number;
}

const ConfessionsFloatingHearts = () => {
    const [hearts, setHearts] = useState<FloatingHeart[]>([]);

    useEffect(() => {
        const generated: FloatingHeart[] = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            size: 12 + Math.random() * 20,
            duration: 8 + Math.random() * 12,
            delay: Math.random() * 10,
            opacity: 0.15 + Math.random() * 0.3,
            swayAmount: 20 + Math.random() * 40,
        }));
        setHearts(generated);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {hearts.map((heart) => (
                <div
                    key={heart.id}
                    className="absolute text-[hsl(330,90%,55%)] conf-float-up conf-sway"
                    style={{
                        left: `${heart.x}%`,
                        bottom: "-40px",
                        fontSize: `${heart.size}px`,
                        opacity: heart.opacity,
                        animationDuration: `${heart.duration}s, ${heart.duration / 2}s`,
                        animationDelay: `${heart.delay}s, ${heart.delay}s`,
                    }}
                >
                    ❤️
                </div>
            ))}
        </div>
    );
};

export default ConfessionsFloatingHearts;
