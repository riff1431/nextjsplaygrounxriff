"use client";

import React, { useState, useEffect } from "react";
import { Mail, Settings, Shield, Globe, Send, Check, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import EmailLogsPanel from "./EmailLogsPanel";

interface SmtpSettings {
    id?: string;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password?: string;
    from_email: string;
    from_name: string;
    site_url: string;
    is_active: boolean;
    hasPassword?: boolean;
}

export default function EmailSettingsPanel() {
    const [activeTab, setActiveTab] = useState<"smtp" | "logs">("smtp");
    
    // SMTP Form State
    const [settings, setSettings] = useState<SmtpSettings>({
        host: "",
        port: 587,
        secure: false,
        username: "",
        password: "",
        from_email: "",
        from_name: "PlayGroundX",
        site_url: "",
        is_active: true,
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Test SMTP State
    const [testEmail, setTestEmail] = useState("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Load existing config
    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/emails/smtp-config");
            if (res.ok) {
                const data = await res.json();
                if (data.settings) {
                    setSettings({
                        ...data.settings,
                        password: data.settings.hasPassword ? "********" : "",
                    });
                }
            }
        } catch (err) {
            console.error("Failed to load SMTP config:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSaveSuccess(false);
        setSaveError(null);

        try {
            const res = await fetch("/api/admin/emails/smtp-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to save settings");
            }

            setSaveSuccess(true);
            if (data.settings) {
                setSettings({
                    ...data.settings,
                    password: data.settings.hasPassword ? "********" : "",
                });
            }
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            setSaveError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        if (!testEmail.trim()) {
            setTestResult({ success: false, message: "Please provide a recipient test email address" });
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const res = await fetch("/api/admin/emails/test-smtp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...settings,
                    test_email: testEmail.trim(),
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setTestResult({
                    success: true,
                    message: `SMTP Connection Verified! Check ${testEmail} for verification message.`,
                });
            } else {
                setTestResult({
                    success: false,
                    message: data.error || "Connection failed. Double check credentials, host, and port.",
                });
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || "Network error. Failed to connect.",
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Navigation tabs */}
            <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab("smtp")}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-2 ${
                        activeTab === "smtp"
                            ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30"
                            : "text-gray-400 hover:text-white border border-transparent"
                    }`}
                >
                    <Settings className="w-4 h-4" /> SMTP Settings
                </button>
                <button
                    onClick={() => setActiveTab("logs")}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-2 ${
                        activeTab === "logs"
                            ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30"
                            : "text-gray-400 hover:text-white border border-transparent"
                    }`}
                >
                    <Mail className="w-4 h-4" /> Email Logs
                </button>
            </div>

            {activeTab === "smtp" ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Settings Form */}
                    <div className="lg:col-span-8">
                        <NeonCard className="p-5 h-full">
                            <AdminSectionTitle
                                icon={<Settings className="w-4 h-4" />}
                                title="SMTP Server Configuration"
                                sub="Setup custom dynamic SMTP service for dispatching platform alerts"
                            />

                            <form onSubmit={handleSave} className="mt-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* SMTP Host */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-medium">SMTP Host</label>
                                        <input
                                            type="text"
                                            name="host"
                                            required
                                            placeholder="smtp.mailgun.org"
                                            value={settings.host}
                                            onChange={handleChange}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition"
                                        />
                                    </div>

                                    {/* SMTP Port */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-medium">SMTP Port</label>
                                        <input
                                            type="number"
                                            name="port"
                                            required
                                            placeholder="587"
                                            value={settings.port}
                                            onChange={handleChange}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition"
                                        />
                                    </div>

                                    {/* SMTP Username */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-medium">SMTP Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            required
                                            placeholder="postmaster@yourdomain.com"
                                            value={settings.username}
                                            onChange={handleChange}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition"
                                        />
                                    </div>

                                    {/* SMTP Password */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-medium flex justify-between items-center">
                                            SMTP Password
                                            <span className="text-[10px] text-zinc-500">RLS Protected</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                required
                                                placeholder="••••••••••••"
                                                value={settings.password}
                                                onChange={handleChange}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-3 pr-10 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* From Email */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-medium">Sender Email (From)</label>
                                        <input
                                            type="email"
                                            name="from_email"
                                            required
                                            placeholder="noreply@playgroundx.vip"
                                            value={settings.from_email}
                                            onChange={handleChange}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition"
                                        />
                                    </div>

                                    {/* From Name */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-medium">Sender Name</label>
                                        <input
                                            type="text"
                                            name="from_name"
                                            placeholder="PlayGroundX"
                                            value={settings.from_name}
                                            onChange={handleChange}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition"
                                        />
                                    </div>
                                </div>

                                {/* Site/Webhook URL */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                        <Globe className="w-3 h-3 text-cyan-400" />
                                        Platform Domain (Site URL)
                                    </label>
                                    <input
                                        type="url"
                                        name="site_url"
                                        placeholder="http://host.docker.internal:3000 or https://playgroundx.vip"
                                        value={settings.site_url}
                                        onChange={handleChange}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition"
                                    />
                                    <p className="text-[10px] text-zinc-500">
                                        Used by PostgreSQL notifications trigger to send webhook payloads to your Next.js server. Use <code className="text-cyan-300 font-mono text-[9px]">http://host.docker.internal:3000</code> for local testing inside Supabase Docker containers.
                                    </p>
                                </div>

                                {/* Options Checklist */}
                                <div className="flex flex-wrap gap-6 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-300">
                                        <input
                                            type="checkbox"
                                            name="secure"
                                            checked={settings.secure}
                                            onChange={handleChange}
                                            className="accent-cyan-500 rounded border-white/10 bg-black/40 h-4 w-4"
                                        />
                                        <span>Use SSL/TLS (Port 465)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-300">
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={settings.is_active}
                                            onChange={handleChange}
                                            className="accent-cyan-500 rounded border-white/10 bg-black/40 h-4 w-4"
                                        />
                                        <span>Enable Dynamic SMTP system</span>
                                    </label>
                                </div>

                                {/* Notifications alerts */}
                                {saveSuccess && (
                                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-xl">
                                        <Check className="w-4 h-4 flex-shrink-0" />
                                        <span>SMTP Settings saved successfully!</span>
                                    </div>
                                )}

                                {saveError && (
                                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{saveError}</span>
                                    </div>
                                )}

                                {/* Save Button */}
                                <div className="pt-2">
                                    <NeonButton type="submit" disabled={loading} className="w-full sm:w-auto px-6">
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Save SMTP Configuration
                                    </NeonButton>
                                </div>
                            </form>
                        </NeonCard>
                    </div>

                    {/* Test Console */}
                    <div className="lg:col-span-4">
                        <NeonCard className="p-5 h-full flex flex-col justify-between">
                            <div>
                                <AdminSectionTitle
                                    icon={<Send className="w-4 h-4" />}
                                    title="Verify Connection"
                                    sub="Test custom settings before applying"
                                />

                                <div className="mt-6 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-medium">Test Recipient Email</label>
                                        <input
                                            type="email"
                                            placeholder="admin@playgroundx.vip"
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 transition"
                                        />
                                    </div>

                                    {testResult && (
                                        <div className={`p-3 rounded-xl text-xs flex gap-2 border ${
                                            testResult.success 
                                                ? "bg-green-500/10 border-green-500/30 text-green-400" 
                                                : "bg-red-500/10 border-red-500/30 text-red-400"
                                        }`}>
                                            {testResult.success ? (
                                                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            )}
                                            <span className="whitespace-pre-wrap">{testResult.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testing || loading}
                                    className="w-full bg-pink-500 text-white rounded-xl py-2 px-4 text-sm font-semibold hover:bg-pink-600 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {testing ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Verify SMTP Connection
                                </button>
                            </div>
                        </NeonCard>
                    </div>
                </div>
            ) : (
                <EmailLogsPanel />
            )}
        </div>
    );
}
