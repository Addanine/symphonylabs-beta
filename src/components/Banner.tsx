"use client";

import { useEffect, useState } from "react";

interface BannerData {
  id: string;
  text: string;
  color: string;
}

export default function Banner() {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await fetch("/api/banner");
        if (response.ok) {
          const data = await response.json() as { banner: BannerData | null };
          setBanner(data.banner);
        }
      } catch (error) {
        console.error("Error fetching banner:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchBanner();
  }, []);

  if (loading || !banner?.text) {
    return null;
  }

  return (
    <div
      className="w-full py-3 px-6 text-center text-sm font-medium tracking-wide"
      style={{ backgroundColor: banner.color, color: getContrastColor(banner.color) }}
    >
      {banner.text}
    </div>
  );
}

// Helper function to determine if text should be light or dark based on background
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
