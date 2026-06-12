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
    updateRole: (newRole: UserRole) => void;
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
                    let activeRole = session.user.user_metadata?.role as UserRole;

                    // Fetch profile to check if originally a creator
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("role, is_creator")
                        .eq("id", session.user.id)
                        .single();

                    if (profile) {
                        if (profile.is_creator) {
                            // If they are a creator, check if they switched role in this session/tab
                            const roleSwitched = typeof window !== "undefined" ? sessionStorage.getItem("role_switched") : null;
                            if (!roleSwitched) {
                                // Force back to creator on fresh session/new login
                                activeRole = "creator";
                                if (profile.role !== "creator" || (session.user.user_metadata?.role !== "creator")) {
                                    await supabase
                                        .from("profiles")
                                        .update({ role: "creator" })
                                        .eq("id", session.user.id);
                                    await supabase.auth.updateUser({
                                        data: { role: "creator" }
                                    });
                                }
                            } else {
                                activeRole = profile.role as UserRole;
                            }
                        } else {
                            activeRole = profile.role as UserRole;
                        }
                    }
                    setRole(activeRole || "fan");
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

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                let activeRole = session.user.user_metadata?.role as UserRole;

                if (event === "SIGNED_IN") {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("role, is_creator")
                        .eq("id", session.user.id)
                        .single();

                    if (profile?.is_creator) {
                        const roleSwitched = typeof window !== "undefined" ? sessionStorage.getItem("role_switched") : null;
                        if (!roleSwitched) {
                            activeRole = "creator";
                            await supabase
                                .from("profiles")
                                .update({ role: "creator" })
                                .eq("id", session.user.id);
                            await supabase.auth.updateUser({
                                data: { role: "creator" }
                            });
                        } else {
                            activeRole = profile.role as UserRole;
                        }
                    } else if (profile) {
                        activeRole = profile.role as UserRole;
                    }
                }
                setRole(activeRole || "fan");
            } else {
                setUser(null);
                setRole(null);
                if (typeof window !== "undefined") {
                    sessionStorage.removeItem("role_switched");
                }
            }
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("role_switched");
        }
        setRole(null);
        setUser(null);
        router.refresh(); // Clear server cookies
        router.push("/auth");
    };

    const updateRole = (newRole: UserRole) => {
        setRole(newRole);
        if (user) {
            setUser({
                ...user,
                user_metadata: {
                    ...user.user_metadata,
                    role: newRole
                }
            });
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, logout, isLoading, updateRole }}>
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
