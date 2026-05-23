"use client";

import { Toaster } from "sonner";

export default function ToasterProvider() {
    return (
        <Toaster
            theme="dark"
            position="top-right"
            richColors
            visibleToasts={1}
            expand={false}
            toastOptions={{
                style: {
                    background: "rgba(10, 5, 20, 0.95)",
                    border: "1px solid rgba(236, 72, 153, 0.25)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "none",
                },
                className: "!shadow-none",
            }}
        />
    );
}
