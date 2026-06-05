import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ loungeId: string }> }
) {
    const params = await props.params;
    const { loungeId } = params;
    const supabase = await createClient();

    try {
        const { data: lounge, error } = await supabase
            .from("casino_lounges")
            .select(`
                *,
                room:rooms(*)
            `)
            .eq("id", loungeId)
            .single();

        if (error || !lounge) {
            return NextResponse.json({ error: "Lounge not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, lounge });
    } catch (err: any) {
        console.error("Get casino lounge error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
