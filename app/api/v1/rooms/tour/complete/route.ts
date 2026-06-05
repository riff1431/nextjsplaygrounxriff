import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { tourName } = body;

    if (!tourName || typeof tourName !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing tourName" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("room_tours_completed").upsert(
      {
        user_id: user.id,
        tour_name: tourName,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tour_name" }
    );

    if (error) {
      console.error("Tour complete error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
