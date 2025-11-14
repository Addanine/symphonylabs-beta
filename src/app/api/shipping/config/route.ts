import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";

interface ShippingConfig {
  id: string;
  mode: "basic" | "advanced";
  domestic_rate: number;
  international_rate: number;
  domestic_countries: string[];
  country_rates: Record<string, number>;
  default_rate: number;
}

export async function GET() {
  try {
    const result = await supabase
      .from("shipping_config")
      .select("*")
      .single();

    if (result.error) {
      console.error("Error fetching shipping config:", result.error);
      return NextResponse.json(
        { error: "Failed to fetch shipping configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data as unknown as ShippingConfig);
  } catch (error) {
    console.error("Error in shipping config GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      mode: string;
      domestic_rate?: number;
      international_rate?: number;
      domestic_countries?: string[];
      country_rates?: Record<string, number>;
      default_rate?: number;
    };

    // First, try to get existing config
    const { data: existingConfig } = await supabase
      .from("shipping_config")
      .select("id")
      .single();

    let result;
    if (existingConfig) {
      // Update existing config
      result = await supabase
        .from("shipping_config")
        .update({
          mode: body.mode,
          domestic_rate: body.domestic_rate,
          international_rate: body.international_rate,
          domestic_countries: body.domestic_countries,
          country_rates: body.country_rates as unknown as string,
          default_rate: body.default_rate,
        })
        .eq("id", existingConfig.id)
        .select()
        .single();
    } else {
      // Insert new config
      result = await supabase
        .from("shipping_config")
        .insert({
          mode: body.mode,
          domestic_rate: body.domestic_rate,
          international_rate: body.international_rate,
          domestic_countries: body.domestic_countries,
          country_rates: body.country_rates as unknown as string,
          default_rate: body.default_rate,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("Error saving shipping config:", result.error);
      return NextResponse.json(
        { error: "Failed to save shipping configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data as unknown as ShippingConfig });
  } catch (error) {
    console.error("Error in shipping config POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
