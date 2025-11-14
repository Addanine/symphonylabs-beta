import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";
import { verifyAdminAuth } from "~/lib/security/jwt";

interface BannerUpdateRequest {
  text: string;
  color: string;
}

// POST - Update or create banner
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminPayload = await verifyAdminAuth(request);

    if (!adminPayload) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = (await request.json().catch(() => null)) as unknown;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { text, color } = body as BannerUpdateRequest;

    // Validate input
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!color || typeof color !== "string" || !colorRegex.test(color)) {
      return NextResponse.json(
        { error: "Valid hex color is required (e.g., #000000)" },
        { status: 400 }
      );
    }

    // Check if a banner already exists
    const { data: existingBanner } = await supabase
      .from("banner")
      .select("id")
      .limit(1)
      .single();

    if (existingBanner) {
      // Update existing banner
      const { error: updateError } = await supabase
        .from("banner")
        .update({ text: text.trim(), color })
        .eq("id", existingBanner.id);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update banner" },
          { status: 500 }
        );
      }
    } else {
      // Create new banner
      const { error: insertError } = await supabase
        .from("banner")
        .insert([{ text: text.trim(), color }]);

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to create banner" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating banner:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
