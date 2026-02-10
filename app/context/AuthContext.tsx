"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

type UserRole = "fan" | "creator" | "admin" | null;

interface AuthContextType {
    user: User | null;
    role: UserRole;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    setUser(session.user);
                    // Use metadata first (faster, set on signup)
                    const metaRole = session.user.user_metadata?.role as UserRole;
                    setRole(metaRole || "fan");
                } else {
                    setUser(null);
                    setRole(null);
                }
            } catch (error) {
                console.error("Auth check failed:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setUser(session.user);
                const metaRole = session.user.user_metadata?.role as UserRole;
                setRole(metaRole || "fan");
            } else {
                setUser(null);
                setRole(null);
            }
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setRole(null);
        setUser(null);
        router.refresh(); // Clear server cookies
        router.push("/auth");
    };

    return (
        <AuthContext.Provider value={{ user, role, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export function ProtectRoute({
    children,
    allowedRoles,
}: {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}) {
    const { role, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            // Let middleware handle full redirect, but client-side check is good too
            return;
        }

        if (allowedRoles && role && !allowedRoles.includes(role)) {
            router.push("/home");
        }
    }, [user, role, isLoading, allowedRoles, router]);

    if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-pink-500 font-bold">Loading...</div>;

    return <>{children}</>;
}
