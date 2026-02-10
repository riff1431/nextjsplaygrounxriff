import React from "react";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function AdminTable({
    columns,
    rows,
}: {
    columns: Array<{ key: string; label: string; w?: string; right?: boolean }>;
    rows: Array<Record<string, React.ReactNode>>;
}) {
    const grid = columns.map((c) => c.w ?? "1fr").join(" ");
    return (
        <div className="rounded-2xl border border-white/10 overflow-x-auto bg-black/30">
            <div className="min-w-[800px]">
                <div className="grid bg-black/60 border-b border-white/10" style={{ gridTemplateColumns: grid }}>
                    {columns.map((c) => (
                        <div
                            key={c.key}
                            className={cx("px-3 py-2 text-[10px] text-gray-300", c.right && "text-right")}
                        >
                            {c.label}
                        </div>
                    ))}
                </div>
                <div className="divide-y divide-white/10">
                    {rows.map((r, i) => (
                        <div key={i} className="grid hover:bg-white/5 transition" style={{ gridTemplateColumns: grid }}>
                            {columns.map((c) => (
                                <div key={c.key} className={cx("px-3 py-2 text-xs text-gray-100", c.right && "text-right")}>
                                    {r[c.key] ?? <span className="text-gray-500">—</span>}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function AdminSectionTitle({
    icon,
    title,
    sub,
    right,
}: {
    icon?: React.ReactNode;
    title: string;
    sub?: string;
    right?: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div>
                <div className="text-cyan-200 text-base inline-flex items-center gap-2 drop-shadow-[0_0_40px_rgba(0,230,255,0.7)]">
                    {icon} {title}
                </div>
                {sub && <div className="mt-1 text-[11px] text-gray-400">{sub}</div>}
            </div>
            {right}
        </div>
    );
}
