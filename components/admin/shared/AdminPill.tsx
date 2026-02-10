import React from "react";

export function AdminPill({
    children,
    tone = "cyan",
}: {
    children: React.ReactNode;
    tone?: "cyan" | "pink" | "amber" | "red" | "green";
}) {
    const cls =
        tone === "pink"
            ? "border-pink-500/25 text-pink-200 bg-pink-500/10"
            : tone === "amber"
                ? "border-yellow-400/25 text-yellow-200 bg-yellow-500/10"
                : tone === "red"
                    ? "border-rose-400/25 text-rose-200 bg-rose-500/10"
                    : tone === "green"
                        ? "border-emerald-400/25 text-emerald-200 bg-emerald-500/10"
                        : "border-cyan-300/25 text-cyan-200 bg-cyan-500/10";
    return <span className={`text-[10px] px-2 py-[2px] rounded-full border ${cls}`}>{children}</span>;
}
