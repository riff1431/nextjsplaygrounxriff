import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

async function verifyAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") return null;
    return user;
}

export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        let { host, port, secure, username, password, from_email, from_name, test_email } = body;

        if (!host || !port || !username || !from_email || !test_email) {
            return NextResponse.json({ error: "Missing parameters for SMTP test" }, { status: 400 });
        }

        // If password is masked, load the saved password from the database
        if (password === "********") {
            const adminDb = createAdminClient();
            const { data } = await adminDb
                .from("smtp_settings")
                .select("password")
                .limit(1)
                .maybeSingle();
            
            if (data?.password) {
                password = data.password;
            } else {
                return NextResponse.json({ error: "No password saved to test with" }, { status: 400 });
            }
        }

        console.log(`[SMTP Test API] Testing connection to ${host}:${port} (user: ${username})`);

        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port, 10),
            secure: !!secure,
            auth: {
                user: username,
                pass: password,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection configurations
        await transporter.verify();

        // Send confirmation email
        const mailOptions = {
            from: `"${from_name || 'PlayGroundX'}" <${from_email}>`,
            to: test_email,
            subject: "PlayGroundX SMTP Test Connection Success! ⚡",
            html: `
                <div style="font-family: sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #222;">
                    <h2 style="color: #ff00c8; font-size: 24px; margin-bottom: 20px;">PlayGroundX SMTP Test</h2>
                    <p style="color: #d1d5db; font-size: 16px; line-height: 24px;">Your dynamic SMTP configurations are working perfectly! Here are the settings we verified:</p>
                    <div style="background-color: #111111; padding: 20px; border-radius: 8px; border: 1px solid #333; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 6px 0; color: #6b7280; width: 120px;">Host:</td>
                                <td style="padding: 6px 0; color: #00e6ff; font-weight: bold;">${host}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #6b7280;">Port:</td>
                                <td style="padding: 6px 0; color: #ffffff;">${port} (${secure ? 'SSL/TLS' : 'Non-SSL'})</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #6b7280;">Username:</td>
                                <td style="padding: 6px 0; color: #ffffff;">${username}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #6b7280;">From Email:</td>
                                <td style="padding: 6px 0; color: #ffffff;">${from_email}</td>
                            </tr>
                        </table>
                    </div>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated test message. You can safely delete this email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
        console.error("[SMTP Test API] Error testing SMTP connection:", err);
        return NextResponse.json({ error: err.message || "Failed to verify SMTP configuration" }, { status: 500 });
    }
}
