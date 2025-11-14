import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";

interface ShippingConfig {
  mode: "basic" | "advanced";
  domestic_rate: number;
  international_rate: number;
  domestic_countries: string[];
  country_rates: Record<string, number>;
  default_rate: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      country: string;
    };

    const country = body.country;

    if (!country) {
      return NextResponse.json(
        { error: "Country is required" },
        { status: 400 }
      );
    }

    // Fetch shipping configuration
    const result = await supabase
      .from("shipping_config")
      .select("*")
      .single();

    if (result.error || !result.data) {
      console.error("Error fetching shipping config:", result.error);
      return NextResponse.json(
        { error: "Failed to fetch shipping configuration" },
        { status: 500 }
      );
    }

    const shippingConfig = result.data as unknown as ShippingConfig;
    let shippingCost = 0;

    if (shippingConfig.mode === "basic") {
      // Basic mode: domestic vs international
      const isDomestic = (shippingConfig.domestic_countries ?? ["US"]).includes(country);
      shippingCost = isDomestic
        ? (shippingConfig.domestic_rate ?? 0)
        : (shippingConfig.international_rate ?? 0);
    } else if (shippingConfig.mode === "advanced") {
      // Advanced mode: per-country rates
      const countryRates = shippingConfig.country_rates ?? {};
      shippingCost = countryRates[country] !== undefined
        ? countryRates[country] ?? 0
        : (shippingConfig.default_rate ?? 0);
    }

    return NextResponse.json({
      shippingCost,
      country,
    });
  } catch (error) {
    console.error("Error calculating shipping cost:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
