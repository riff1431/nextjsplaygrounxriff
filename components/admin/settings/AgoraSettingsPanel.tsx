"use strict";
import React, { useEffect, useState } from "react";
import { Video, Settings, Save, AlertCircle, CheckCircle, RefreshCw, HelpCircle } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { toast } from "sonner";

interface AgoraConfig {
    appId: string;
    appCertificate: string;
    customerId: string;
    customerSecret: string;
}

export default function AgoraSettingsPanel() {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<AgoraConfig>({
        appId: "",
        appCertificate: "",
        customerId: "",
        customerSecret: ""
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testLog, setTestLog] = useState<string[]>([]);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'failed'>('idle');

    // Fetch existing configuration
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await fetch("/api/admin/agora/settings");
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        setConfig({
                            appId: data.config.appId || "",
                            appCertificate: data.config.appCertificate || "",
                            customerId: data.config.customerId || "",
                            customerSecret: data.config.customerSecret || ""
                        });
                    }
                } else {
                    toast.error("Failed to load Agora configuration");
                }
            } catch (err) {
                console.error("Error fetching Agora settings:", err);
                toast.error("Network error loading Agora configuration");
            } finally {
                setLoading(false);
            }
        };
        loadConfig();
    }, []);

    // Save changes to database
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/agora/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success("Agora settings updated successfully");
                } else {
                    toast.error(data.error || "Failed to update settings");
                }
            } else {
                toast.error("Server returned an error");
            }
        } catch (err) {
            console.error("Save error:", err);
            toast.error("Network error while saving settings");
        } finally {
            setIsSaving(false);
        }
    };

    // Run connection test sequence
    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestStatus('idle');
        const logs: string[] = [];
        const log = (msg: string) => {
            logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
            setTestLog([...logs]);
        };

        log("Starting connection verification sequence...");
        try {
            // Step 1: Server-side validation
            log("Phase 1: Validating credentials and token generation on server-side...");
            const res = await fetch("/api/v1/agora/test-connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config)
            });

            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || "Server validation failed");
            }

            log(`✔ Server token signer: Successful.`);
            if (data.tokenError) {
                log(`ℹ Info: ${data.tokenError}`);
            }
            if (data.token) {
                log(`✔ Token successfully generated: ${data.token.substring(0, 25)}...`);
            }

            if (config.customerId || config.customerSecret) {
                log("Phase 2: Verifying Agora REST API authorization...");
                if (data.apiVerified) {
                    log(`✔ Developer API Auth: Successful. ${data.apiStatus}`);
                } else {
                    log(`⚠️ Developer API Auth Warning: ${data.apiStatus}`);
                }
            } else {
                log("Phase 2: Skipped (Customer ID & Secret not provided)");
            }

            // Step 3: Browser RTC Connection Simulation
            log("Phase 3: Attempting browser-level RTC edge connectivity check...");
            
            const appIdToUse = data.appId;
            const tokenToUse = data.token;
            
            if (!appIdToUse) {
                throw new Error("No App ID returned from server to establish client test client");
            }

            log(`Loading Agora Web SDK...`);
            // Dynamic import to prevent SSR errors
            const AgoraRTCModule = await import("agora-rtc-react");
            const AgoraRTC = AgoraRTCModule.default;

            log(`Creating test RTC client (vp8 codec, rtc mode)...`);
            const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

            log(`Connecting to channel 'connection-test-channel' at Agora Edge Servers...`);
            await client.join(appIdToUse, "connection-test-channel", tokenToUse || null, 999999);
            log(`✔ RTC Client: Joined successfully.`);

            log(`Leaving channel and releasing connections...`);
            await client.leave();
            log(`✔ RTC Client: Cleaned up successfully.`);

            log("✔ All connection tests passed! Agora.io is fully operational.");
            setTestStatus('success');
            toast.success("Agora connection test completed successfully!");

        } catch (err: any) {
            console.error("Test connection failure:", err);
            log(`❌ Test failed: ${err.message || err}`);
            setTestStatus('failed');
            toast.error("Agora connection test failed!");
        } finally {
            setIsTesting(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Agora settings...</div>;

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Video className="w-4 h-4 text-cyan-400" />}
                title="Agora.io Live Streaming Configuration"
                sub="Manage credentials, certificates, and API secrets for dynamic RTC streaming services."
                right={
                    <div className="flex gap-2">
                        <NeonButton 
                            onClick={handleTestConnection} 
                            disabled={isTesting}
                            variant="ghost"
                        >
                            {isTesting ? (
                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Test Connection
                        </NeonButton>
                        <NeonButton 
                            onClick={handleSave} 
                            disabled={isSaving}
                            variant="pink"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </NeonButton>
                    </div>
                }
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Credentials Card */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4">
                    <div className="text-sm font-bold text-cyan-200 border-b border-white/5 pb-2">RTC Settings</div>
                    
                    <div>
                        <label className="text-xs text-gray-300 block mb-1">
                            Agora App ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={config.appId}
                            onChange={(e) => setConfig(p => ({ ...p, appId: e.target.value }))}
                            placeholder="e.g. 98af87ba8d..."
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Unique public identifier of your Agora project.</p>
                    </div>

                    <div>
                        <label className="text-xs text-gray-300 block mb-1">Agora App Certificate</label>
                        <input
                            type="password"
                            value={config.appCertificate}
                            onChange={(e) => setConfig(p => ({ ...p, appCertificate: e.target.value }))}
                            placeholder={config.appCertificate ? "••••••••••••••••••••••••••••••••" : "Optional (App ID only mode)"}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Required to generate secure dynamic tokens on the server.</p>
                    </div>
                </div>

                {/* REST API settings card */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4">
                    <div className="text-sm font-bold text-cyan-200 border-b border-white/5 pb-2">Developer REST API Settings (Optional)</div>
                    
                    <div>
                        <label className="text-xs text-gray-300 block mb-1">Customer ID</label>
                        <input
                            type="text"
                            value={config.customerId}
                            onChange={(e) => setConfig(p => ({ ...p, customerId: e.target.value }))}
                            placeholder="e.g. d18ea0283a8b..."
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Developer Customer ID generated in Agora console.</p>
                    </div>

                    <div>
                        <label className="text-xs text-gray-300 block mb-1">Customer Secret</label>
                        <input
                            type="password"
                            value={config.customerSecret}
                            onChange={(e) => setConfig(p => ({ ...p, customerSecret: e.target.value }))}
                            placeholder={config.customerSecret ? "••••••••••••••••••••••••••••••••" : "Optional"}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Developer Customer Secret used to manage projects or fetch recording states.</p>
                    </div>
                </div>
            </div>

            {/* Test Connection Output Panel */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-sm font-bold text-cyan-200 flex items-center gap-2">
                        Verification Console
                    </span>
                    {testStatus === 'success' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-950/40 border border-green-500/30 px-2 py-0.5 rounded">
                            <CheckCircle className="w-3 h-3" /> Operational
                        </span>
                    )}
                    {testStatus === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/40 border border-red-500/30 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" /> Connection Error
                        </span>
                    )}
                    {testStatus === 'idle' && (
                        <span className="text-[10px] text-gray-500">No tests executed yet</span>
                    )}
                </div>

                {testLog.length > 0 ? (
                    <div className="mt-3 bg-black/60 rounded-xl p-3 font-mono text-xs text-gray-300 space-y-1.5 max-h-[180px] overflow-y-auto border border-white/5 scrollbar-thin">
                        {testLog.map((log, index) => (
                            <div key={index} className={
                                log.includes('❌') ? "text-red-400 font-semibold" : 
                                log.includes('✔') ? "text-green-400" : 
                                log.includes('⚠️') ? "text-amber-400" : "text-gray-400"
                            }>
                                {log}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-3 p-6 text-center text-xs text-gray-500 bg-black/20 rounded-xl border border-dashed border-white/5 flex flex-col items-center gap-2">
                        <HelpCircle className="w-8 h-8 text-zinc-600" />
                        <span>Click "Test Connection" to check token builders and client connectivity diagnostics.</span>
                    </div>
                )}
            </div>
        </NeonCard>
    );
}
