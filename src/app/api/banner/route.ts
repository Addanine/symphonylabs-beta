import { NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";

interface BannerData {
  id: string;
  text: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// GET - Fetch current banner
export async function GET() {
  try {
    const response = await supabase
      .from("banner")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (response.error && response.error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Supabase fetch error:", response.error);
      return NextResponse.json(
        { error: "Failed to fetch banner" },
        { status: 500 }
      );
    }

    const data = response.data as BannerData | null;
    return NextResponse.json({ banner: data ?? null });
  } catch (error) {
    console.error("Error fetching banner:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
