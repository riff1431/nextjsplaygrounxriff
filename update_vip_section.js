const fs = require('fs');
const filePath = '/Users/arifur/Desktop/canadax/nextjsplaygrounxriff/app/rooms/pgx-page2/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "{/* VIP Upgrade — Custom Request */}";
const endMarker = "{/* Private 1-on-1 Session */}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `{/* ── VIP & Custom Request Unified Container ── */}
                                <div style={{ ...glassPanel, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid hsla(42,90%,55%,0.3)" }}>
                                    
                                    {/* Top Half: VIP Status */}
                                    {vipRequestStatus === 'accepted' ? (
                                        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", background: "hsla(140,40%,15%,0.2)", borderBottom: "1px solid hsla(42,90%,55%,0.3)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Crown style={{ width: "20px", height: "20px", color: GOLD }} />
                                                <span style={{ fontWeight: 700, color: "hsl(140,70%,55%)", fontSize: "14px" }}>✓ VIP Access Granted</span>
                                            </div>
                                            <p style={{ fontSize: "12px", color: MUTED, margin: 0, marginLeft: "28px" }}>Enjoy your exclusive VIP perks!</p>
                                        </div>
                                    ) : vipRequestStatus === 'pending' ? (
                                        <div style={{ ...glowGold, padding: "12px", display: "flex", flexDirection: "column", gap: "8px", opacity: 0.8, cursor: "default", borderBottom: "1px solid hsla(42,90%,55%,0.3)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Crown className="pg2-glow-pulse" style={{ width: "20px", height: "20px", color: GOLD }} />
                                                <span style={{ fontWeight: 700, color: GOLD, ...glowTextGold, fontSize: "14px" }}>VIP Request Pending...</span>
                                                <Loader2 style={{ width: "14px", height: "14px", color: GOLD, animation: "spin 1s linear infinite", marginLeft: "auto" }} />
                                            </div>
                                            <p style={{ fontSize: "12px", color: MUTED, margin: 0, marginLeft: "28px" }}>Waiting for creator approval</p>
                                        </div>
                                    ) : vipRequestStatus === 'declined' ? (
                                        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", background: "hsla(0,40%,15%,0.15)", borderBottom: "1px solid hsla(42,90%,55%,0.3)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Crown style={{ width: "20px", height: "20px", color: MUTED }} />
                                                <span style={{ fontWeight: 700, color: "hsl(0,70%,60%)", fontSize: "14px" }}>VIP Request Declined</span>
                                            </div>
                                            <button onClick={() => { setVipRequestStatus('idle'); }} style={{ fontSize: "12px", color: GOLD, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, marginLeft: "28px", textAlign: "left" }}>Try again?</button>
                                        </div>
                                    ) : (
                                        <div style={{ ...glowGold, padding: "12px", cursor: buying ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", gap: "8px", opacity: buying ? 0.7 : 1, borderBottom: "1px solid hsla(42,90%,55%,0.3)", transition: "background 0.2s" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "hsla(42,90%,55%,0.1)"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                            onClick={() => !buying && doPurchase("vip", "VIP Upgrade", vipPrice, "vip")}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Crown className="pg2-glow-pulse" style={{ width: "20px", height: "20px", color: GOLD }} />
                                                {buying === "vip"
                                                    ? <Loader2 style={{ width: "16px", height: "16px", color: GOLD, animation: "spin 1s linear infinite" }} />
                                                    : <span style={{ fontWeight: 700, color: GOLD, ...glowTextGold }}>Upgrade to VIP - €{vipPrice}</span>}
                                            </div>
                                            <ul style={{ fontSize: "14px", color: MUTED, marginLeft: "28px", margin: "0", padding: 0, listStyle: "none" }}>
                                                <li style={{ display: "flex", alignItems: "center", gap: "4px" }}><Sparkles style={{ width: "12px", height: "12px", color: PINK }} /> Exclusive Content</li>
                                            </ul>
                                            <p style={{ fontSize: "11px", color: "hsla(42,90%,55%,0.6)", margin: "0 0 0 28px", fontStyle: "italic" }}>Requires creator approval</p>
                                        </div>
                                    )}

                                    {/* Bottom Half: Custom Request */}
                                    {vipRequestStatus === 'accepted' ? (
                                        <div style={{
                                            padding: "14px",
                                            background: "linear-gradient(135deg, hsla(270,60%,25%,0.1), hsla(42,50%,25%,0.05))",
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                                <span style={{ fontSize: "18px" }}>📩</span>
                                                <span style={{ fontWeight: 700, color: GOLD, fontSize: "14px", ...glowTextGold }}>Custom Request</span>
                                                <span style={{
                                                    marginLeft: "auto", fontSize: "10px", fontWeight: 600,
                                                    padding: "2px 8px", borderRadius: "9999px",
                                                    background: "hsla(140,70%,45%,0.15)",
                                                    border: "1px solid hsla(140,70%,45%,0.3)",
                                                    color: "hsl(140,70%,55%)",
                                                }}>UNLIMITED</span>
                                            </div>
                                            <textarea
                                                placeholder="Type your request for the creator..."
                                                value={customReqText}
                                                onChange={(e) => setCustomReqText(e.target.value.slice(0, 1000))}
                                                rows={3}
                                                style={{
                                                    width: "100%", resize: "none",
                                                    borderRadius: "0.5rem", padding: "10px 12px",
                                                    fontSize: "13px", lineHeight: "1.4",
                                                    background: "hsla(270,30%,18%,0.4)",
                                                    border: "1px solid hsla(280,40%,30%,0.3)",
                                                    color: FG, outline: "none",
                                                    fontFamily: "'Montserrat', sans-serif",
                                                }}
                                            />
                                            <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
                                                <div style={{
                                                    ...tipBtn, flex: 1, display: "flex", alignItems: "center", gap: "6px",
                                                    padding: "8px 12px", cursor: "text",
                                                }}>
                                                    <span style={{ color: MUTED, fontSize: "12px", whiteSpace: "nowrap" }}>Min €5</span>
                                                    <span style={{ color: GOLD, fontSize: "13px", fontWeight: 700 }}>€</span>
                                                    <input
                                                        type="number"
                                                        min="5"
                                                        placeholder="Amount"
                                                        value={customReqAmount}
                                                        onChange={(e) => setCustomReqAmount(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleCustomRequest()}
                                                        style={{
                                                            background: "transparent", border: "none", outline: "none",
                                                            color: FG, fontFamily: "'Montserrat', sans-serif",
                                                            fontSize: "13px", flex: 1, minWidth: 0, width: "100%",
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    className="pg2-btn-gold"
                                                    disabled={!!buying || !customReqText.trim() || !customReqAmount || Number(customReqAmount) < 5}
                                                    style={{
                                                        ...btnGold, flexShrink: 0, padding: "8px 16px",
                                                        fontSize: "12px", fontWeight: 700,
                                                        opacity: (buying || !customReqText.trim() || !customReqAmount || Number(customReqAmount) < 5) ? 0.5 : 1,
                                                        display: "flex", alignItems: "center", gap: "4px",
                                                    }}
                                                    onClick={handleCustomRequest}
                                                >
                                                    {buying?.startsWith("custom-req") ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : "Send"}
                                                </button>
                                            </div>
                                            <p style={{ fontSize: "10px", color: MUTED, margin: "6px 0 0 0", fontStyle: "italic" }}>Requires creator approval • Private message</p>
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: "14px",
                                            background: "hsla(270,40%,15%,0.2)",
                                            position: "relative",
                                            overflow: "hidden"
                                        }}>
                                            <div style={{ opacity: 0.3, pointerEvents: "none", userSelect: "none" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                                    <span style={{ fontSize: "18px", filter: "grayscale(1)" }}>📩</span>
                                                    <span style={{ fontWeight: 700, color: MUTED, fontSize: "14px" }}>Custom Request</span>
                                                    <span style={{
                                                        marginLeft: "auto", fontSize: "10px", fontWeight: 600,
                                                        padding: "2px 8px", borderRadius: "9999px",
                                                        background: "hsla(0,0%,50%,0.15)",
                                                        border: "1px solid hsla(0,0%,50%,0.3)",
                                                        color: MUTED,
                                                    }}>UNLIMITED</span>
                                                </div>
                                                <div style={{
                                                    width: "100%", height: "64px",
                                                    borderRadius: "0.5rem",
                                                    background: "hsla(270,30%,18%,0.4)",
                                                    border: "1px solid hsla(280,40%,30%,0.3)",
                                                }} />
                                                <div style={{ display: "flex", gap: "8px", marginTop: "8px", height: "34px" }}>
                                                    <div style={{ ...tipBtn, flex: 1, background: "hsla(270,30%,18%,0.4)", border: "1px solid hsla(280,40%,30%,0.3)" }} />
                                                    <div style={{ ...btnGold, width: "64px", background: "hsla(0,0%,50%,0.3)", border: "none" }} />
                                                </div>
                                            </div>
                                            
                                            <div style={{
                                                position: "absolute", inset: 0,
                                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                                background: "hsla(270,50%,10%,0.65)", backdropFilter: "blur(4px)",
                                                zIndex: 10
                                            }}>
                                                <Crown style={{ width: "24px", height: "24px", color: GOLD, marginBottom: "8px", ...glowTextGold }} className="pg2-glow-pulse" />
                                                <span style={{ fontSize: "14px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", ...glowTextGold }}>VIP Only</span>
                                                <p style={{ fontSize: "11px", color: "#fff", marginTop: "4px", fontWeight: 500, letterSpacing: "0.5px" }}>Purchase VIP to unlock</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                `;
    
    // We add a few spaces or newlines to ensure it connects cleanly to the next marker
    const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully updated VIP layout.');
} else {
    console.log('Markers not found.');
}
