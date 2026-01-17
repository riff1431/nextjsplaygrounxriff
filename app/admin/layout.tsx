"use client";

import { useAuth, ProtectRoute } from "../context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectRoute allowedRoles={["admin"]}>
            <div className="min-h-screen bg-black text-white">
                {children}
            </div>
        </ProtectRoute>
    );
}
