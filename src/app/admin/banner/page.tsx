"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "~/components/Navigation";
import { AdminAuthProvider, useAdminAuth } from "~/context/AdminAuthContext";
import AdminLogin from "~/components/AdminLogin";
import { useToast } from "~/context/ToastContext";

interface BannerData {
  id: string;
  text: string;
  color: string;
}

function AdminBannerPageContent() {
  const { isAuthenticated, isLoading, login, logout } = useAdminAuth();
  const { showToast } = useToast();
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    text: "",
    color: "#000000",
  });

  useEffect(() => {
    void fetchBanner();
  }, []);

  const fetchBanner = async () => {
    try {
      const response = await fetch("/api/banner");
      if (response.ok) {
        const data = await response.json() as { banner: BannerData | null };
        setBanner(data.banner);
        if (data.banner) {
          setFormData({
            text: data.banner.text,
            color: data.banner.color,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching banner:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/banner/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json() as { error: string };
        throw new Error(error.error ?? "Failed to update banner");
      }

      await fetchBanner();
      showToast("Banner updated successfully!", "success");
    } catch (error) {
      console.error("Error updating banner:", error);
      showToast(error instanceof Error ? error.message : "Failed to update banner. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="text-4xl mb-4 animate-pulse">[ loading ]</div>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} />;
  }

  return (
    <main className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-wide mb-2">admin panel - banner</h1>
            <div className="h-[3px] w-20 bg-black"></div>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="btn-brutalist text-xs px-4 py-2">
              back to products
            </Link>
            <Link href="/admin/orders" className="btn-brutalist text-xs px-4 py-2">
              view orders
            </Link>
            <button onClick={logout} className="btn-brutalist text-xs">
              logout
            </button>
          </div>
        </div>

        {/* Banner Preview */}
        {banner && (
          <div className="mb-8">
            <h2 className="text-lg font-bold tracking-wide mb-3">current banner</h2>
            <div className="brutalist-border overflow-hidden">
              <div
                className="w-full py-3 px-6 text-center text-sm font-medium tracking-wide"
                style={{
                  backgroundColor: banner.color,
                  color: getContrastColor(banner.color),
                }}
              >
                {banner.text}
              </div>
            </div>
          </div>
        )}

        {/* Banner Form */}
        <div className="brutalist-border bg-white p-6">
          <h2 className="text-xl font-bold tracking-wide mb-4">
            {banner ? "update banner" : "create banner"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="text" className="block text-sm font-bold tracking-wide mb-2">
                banner text
              </label>
              <input
                type="text"
                id="text"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                className="input-brutalist w-full"
                placeholder="enter banner message"
                required
              />
              <p className="text-xs tracking-wide mt-1">
                this text will be displayed at the top of every page
              </p>
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-bold tracking-wide mb-2">
                background color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-12 w-24 brutalist-border cursor-pointer"
                  required
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => {
                    const value = e.target.value;
                    const regex = /^#[0-9A-Fa-f]{0,6}$/;
                    if (regex.test(value)) {
                      setFormData({ ...formData, color: value });
                    }
                  }}
                  className="input-brutalist flex-1"
                  placeholder="#000000"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  required
                />
              </div>
              <p className="text-xs tracking-wide mt-1">
                hex color code (e.g., #000000 for black, #ffffff for white)
              </p>
            </div>

            {/* Live Preview */}
            <div>
              <label className="block text-sm font-bold tracking-wide mb-2">
                preview
              </label>
              <div className="brutalist-border overflow-hidden">
                <div
                  className="w-full py-3 px-6 text-center text-sm font-medium tracking-wide transition-colors"
                  style={{
                    backgroundColor: formData.color,
                    color: getContrastColor(formData.color),
                  }}
                >
                  {formData.text || "preview will appear here"}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="btn-brutalist-black"
                disabled={saving}
              >
                {saving ? "saving..." : banner ? "update banner" : "create banner"}
              </button>
              <Link href="/admin" className="btn-brutalist">
                cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
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

export default function AdminBannerPage() {
  return (
    <AdminAuthProvider>
      <AdminBannerPageContent />
    </AdminAuthProvider>
  );
}
