"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import BrandLogo from "@/components/common/BrandLogo";

export default function ResetPasswordPage() {
    const router = useRouter();
    const supabase = createClient();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            // Send password-changed email notification (fire-and-forget)
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
                fetch("/api/v1/email/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        templateId: "password-changed",
                        recipientUserId: user.id,
                        data: { changedAt: new Date().toISOString() },
                    }),
                }).catch(() => {});
            }

            setSuccess(true);
            toast.success("Password updated successfully!");

            // Redirect after short delay
            setTimeout(() => {
                router.push("/home");
            }, 3000);
        } catch (err: any) {
            console.error("Password reset error:", err);
            toast.error(err.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            {/* Background glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md"
            >
                <div className="rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <BrandLogo showBadge={false} />
                    </div>

                    {success ? (
                        /* Success State */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Password Updated!</h2>
                            <p className="text-gray-400 text-sm mb-6">
                                Your password has been changed successfully. Redirecting you to the platform...
                            </p>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 3, ease: "linear" }}
                                    className="h-full bg-gradient-to-r from-pink-500 to-cyan-400 rounded-full"
                                />
                            </div>
                        </motion.div>
                    ) : (
                        /* Reset Form */
                        <>
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-3">
                                    <Lock className="w-5 h-5 text-pink-500" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Set New Password</h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    Choose a strong password for your account
                                </p>
                            </div>

                            <form onSubmit={handleReset} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="new-password" className="text-sm text-gray-300">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input
                                            id="new-password"
                                            type={showPw ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-11 rounded-xl pl-10 pr-10 bg-black/40 border border-white/10 text-gray-100 placeholder:text-gray-500 outline-none focus:border-pink-500/50 transition"
                                            required
                                            minLength={6}
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(!showPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                        >
                                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="confirm-password" className="text-sm text-gray-300">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input
                                            id="confirm-password"
                                            type={showConfirmPw ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-11 rounded-xl pl-10 pr-10 bg-black/40 border border-white/10 text-gray-100 placeholder:text-gray-500 outline-none focus:border-pink-500/50 transition"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                        >
                                            {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                                    )}
                                </div>

                                {/* Password strength indicator */}
                                <div className="space-y-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-colors ${
                                                    password.length >= i * 3
                                                        ? password.length >= 12
                                                            ? "bg-green-400"
                                                            : password.length >= 8
                                                            ? "bg-yellow-400"
                                                            : "bg-red-400"
                                                        : "bg-white/10"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500">
                                        {password.length === 0
                                            ? "Enter a password"
                                            : password.length < 6
                                            ? "Too short (min 6 characters)"
                                            : password.length < 8
                                            ? "Weak"
                                            : password.length < 12
                                            ? "Good"
                                            : "Strong"}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || password.length < 6 || password !== confirmPassword}
                                    className="w-full h-11 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {loading ? "Updating..." : "Update Password"}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] text-gray-600 mt-6 uppercase tracking-widest">
                    PlayGroundX Digital Ltd · Ajax, ON, Canada
                </p>
            </motion.div>
        </div>
    );
}
