import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const tourName = searchParams.get("tourName");

    if (!tourName) {
      return NextResponse.json(
        { success: false, error: "Missing tourName query param" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("room_tours_completed")
      .select("completed, completed_at")
      .eq("user_id", user.id)
      .eq("tour_name", tourName)
      .maybeSingle();

    if (error) {
      console.error("Tour status error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      completed: data?.completed ?? false,
      completedAt: data?.completed_at ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
