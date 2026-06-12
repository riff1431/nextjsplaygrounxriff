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
        let isMounted = true;
        let authListener: any = null;

        const initializeAuth = async () => {
            try {
                // 1. Get initial session
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user) {
                    if (isMounted) {
                        setUser(null);
                        setRole(null);
                        setIsLoading(false);
                    }
                } else {
                    let activeRole = session.user.user_metadata?.role as UserRole;

                    // Fetch profile to verify role and if originally a creator
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("role, is_creator")
                        .eq("id", session.user.id)
                        .single();

                    if (profile) {
                        if (profile.is_creator) {
                            const roleSwitched = typeof window !== "undefined" ? sessionStorage.getItem("role_switched") : null;
                            if (!roleSwitched) {
                                // If they are a creator, force back to creator on new session/tab/login
                                activeRole = "creator";

                                // Sync database and metadata if they don't match creator
                                if (profile.role !== "creator" || session.user.user_metadata?.role !== "creator") {
                                    try {
                                        if (profile.role !== "creator") {
                                            await supabase
                                                .from("profiles")
                                                .update({ role: "creator" })
                                                .eq("id", session.user.id);
                                        }
                                        if (session.user.user_metadata?.role !== "creator") {
                                            await supabase.auth.updateUser({
                                                data: { role: "creator" }
                                            });
                                        }
                                    } catch (err) {
                                        console.error("Failed to sync creator role:", err);
                                    }
                                }
                            } else {
                                activeRole = profile.role as UserRole;
                            }
                        } else {
                            activeRole = profile.role as UserRole;
                        }
                    }

                    if (isMounted) {
                        setUser(session.user);
                        setRole(activeRole || "fan");
                        setIsLoading(false);
                    }
                }
            } catch (error) {
                console.error("Auth initialization failed:", error);
                if (isMounted) {
                    setIsLoading(false);
                }
            }

            // 2. Subscribe to auth changes after initial session is loaded
            if (isMounted) {
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (!session?.user) {
                        if (isMounted) {
                            setUser(null);
                            setRole(null);
                            if (typeof window !== "undefined") {
                                sessionStorage.removeItem("role_switched");
                            }
                        }
                    } else {
                        // For any auth event, update the user state.
                        // If it's a SIGNED_IN event, sync role
                        if (event === "SIGNED_IN") {
                            let activeRole = session.user.user_metadata?.role as UserRole;
                            const { data: profile } = await supabase
                                .from("profiles")
                                .select("role, is_creator")
                                .eq("id", session.user.id)
                                .single();

                            if (profile) {
                                if (profile.is_creator) {
                                    const roleSwitched = typeof window !== "undefined" ? sessionStorage.getItem("role_switched") : null;
                                    if (!roleSwitched) {
                                        activeRole = "creator";
                                        if (profile.role !== "creator" || session.user.user_metadata?.role !== "creator") {
                                            try {
                                                if (profile.role !== "creator") {
                                                    await supabase
                                                        .from("profiles")
                                                        .update({ role: "creator" })
                                                        .eq("id", session.user.id);
                                                }
                                                if (session.user.user_metadata?.role !== "creator") {
                                                    await supabase.auth.updateUser({
                                                        data: { role: "creator" }
                                                    });
                                                }
                                            } catch (err) {
                                                console.error("Failed to sync creator role:", err);
                                            }
                                        }
                                    } else {
                                        activeRole = profile.role as UserRole;
                                    }
                                } else {
                                    activeRole = profile.role as UserRole;
                                }
                            }
                            if (isMounted) {
                                setUser(session.user);
                                setRole(activeRole || "fan");
                            }
                        } else {
                            // For other events (like USER_UPDATED), just update user state and keep existing/new metadata role
                            if (isMounted) {
                                setUser(session.user);
                                const metadataRole = session.user.user_metadata?.role as UserRole;
                                if (metadataRole) {
                                    setRole(metadataRole);
                                }
                            }
                        }
                    }
                });
                authListener = subscription;
            }
        };

        initializeAuth();

        return () => {
            isMounted = false;
            if (authListener) {
                authListener.unsubscribe();
            }
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
