import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const adminDb = createAdminClient();
        const { data, error } = await adminDb
            .from("smtp_settings")
            .select("*")
            .limit(1)
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ settings: null });
        }

        // Return configuration with password masked
        const { password, ...settings } = data;
        return NextResponse.json({
            settings: {
                ...settings,
                hasPassword: !!password,
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, host, port, secure, username, password, from_email, from_name, site_url, is_active } = body;

        if (!host || !port || !username || !from_email) {
            return NextResponse.json({ error: "Missing required SMTP parameters" }, { status: 400 });
        }

        const updateData: Record<string, any> = {
            host,
            port: parseInt(port, 10),
            secure: !!secure,
            username,
            from_email,
            from_name: from_name || "PlayGroundX",
            site_url: site_url || "",
            is_active: is_active !== undefined ? !!is_active : true,
            updated_at: new Date().toISOString(),
        };

        // Only update password if a new one is provided and not masked
        if (password && password !== "********") {
            updateData.password = password;
        }

        const adminDb = createAdminClient();
        let result;

        if (id) {
            const { data, error } = await adminDb
                .from("smtp_settings")
                .update(updateData)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Require password on initial setup
            if (!password || password === "********") {
                return NextResponse.json({ error: "Password is required for new SMTP configuration" }, { status: 400 });
            }
            updateData.password = password;
            const { data, error } = await adminDb
                .from("smtp_settings")
                .insert(updateData)
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return NextResponse.json({ success: true, settings: result });
    } catch (err: any) {
        console.error("[SMTP Config API] Error saving configuration:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
