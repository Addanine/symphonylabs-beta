"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "~/components/Navigation";
import { AdminAuthProvider, useAdminAuth } from "~/context/AdminAuthContext";
import AdminLogin from "~/components/AdminLogin";
import { useToast } from "~/context/ToastContext";
import { COUNTRIES, getCountryName } from "~/lib/countries";

interface ShippingConfig {
  id: string;
  mode: "basic" | "advanced";
  domestic_rate: number;
  international_rate: number;
  domestic_countries: string[];
  country_rates: Record<string, number>;
  default_rate: number;
}

function AdminShippingContent() {
  const { isAuthenticated, isLoading, login, logout } = useAdminAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ShippingConfig>({
    id: "",
    mode: "basic",
    domestic_rate: 0,
    international_rate: 0,
    domestic_countries: ["US"],
    country_rates: {},
    default_rate: 25,
  });

  // Advanced mode state
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countryRate, setCountryRate] = useState("");

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/shipping/config");
      if (response.ok) {
        const data = await response.json() as ShippingConfig;
        setConfig(data);
      }
    } catch (error) {
      console.error("Error fetching shipping config:", error);
      showToast("Failed to load shipping configuration", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchConfig();
    }
  }, [isAuthenticated, fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/shipping/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error("Failed to save configuration");
      }

      showToast("Shipping configuration saved successfully", "success");
      await fetchConfig();
    } catch (error) {
      console.error("Error saving shipping config:", error);
      showToast("Failed to save shipping configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const addCountryRate = () => {
    if (!selectedCountry || countryRate === "") {
      showToast("Please select a country and enter a rate", "warning");
      return;
    }

    const rate = parseFloat(countryRate);
    if (isNaN(rate) || rate < 0) {
      showToast("Please enter a valid rate", "warning");
      return;
    }

    setConfig({
      ...config,
      country_rates: {
        ...config.country_rates,
        [selectedCountry]: rate,
      },
    });

    setSelectedCountry("");
    setCountryRate("");
  };

  const removeCountryRate = (countryCode: string) => {
    const newRates = { ...config.country_rates };
    delete newRates[countryCode];
    setConfig({
      ...config,
      country_rates: newRates,
    });
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
            <h1 className="text-3xl font-bold tracking-wide mb-2">shipping configuration</h1>
            <div className="h-[3px] w-20 bg-black"></div>
          </div>
          <button onClick={logout} className="btn-brutalist text-xs">
            logout
          </button>
        </div>

        {/* Mode Selection */}
        <div className="brutalist-border bg-white p-6 mb-6">
          <h2 className="text-xl font-bold tracking-wide mb-4">shipping mode</h2>
          <div className="h-[2px] w-full bg-black mb-4"></div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={() => setConfig({ ...config, mode: "basic" })}
              className={`brutalist-border p-4 text-left transition-all ${
                config.mode === "basic"
                  ? "bg-black text-white"
                  : "bg-white hover:translate-x-1 hover:translate-y-1"
              }`}
            >
              <div className="text-lg font-bold tracking-wide mb-2">basic mode</div>
              <div className="text-xs tracking-wide opacity-80">
                simple domestic vs international rates
              </div>
            </button>

            <button
              onClick={() => setConfig({ ...config, mode: "advanced" })}
              className={`brutalist-border p-4 text-left transition-all ${
                config.mode === "advanced"
                  ? "bg-black text-white"
                  : "bg-white hover:translate-x-1 hover:translate-y-1"
              }`}
            >
              <div className="text-lg font-bold tracking-wide mb-2">advanced mode</div>
              <div className="text-xs tracking-wide opacity-80">
                custom rates for each country
              </div>
            </button>
          </div>
        </div>

        {/* Basic Mode Configuration */}
        {config.mode === "basic" && (
          <div className="brutalist-border bg-white p-6 mb-6">
            <h2 className="text-xl font-bold tracking-wide mb-4">basic configuration</h2>
            <div className="h-[2px] w-full bg-black mb-4"></div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold tracking-wide mb-2">
                  domestic countries (comma-separated country codes)
                </label>
                <input
                  type="text"
                  value={config.domestic_countries.join(", ")}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      domestic_countries: e.target.value
                        .split(",")
                        .map((c) => c.trim().toUpperCase())
                        .filter((c) => c),
                    })
                  }
                  className="input-brutalist w-full"
                  placeholder="US, CA"
                />
                <p className="text-xs tracking-wide mt-1 opacity-60">
                  e.g., US, CA, MX (use ISO country codes)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold tracking-wide mb-2">
                  domestic shipping rate ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.domestic_rate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      domestic_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input-brutalist w-full"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold tracking-wide mb-2">
                  international shipping rate ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.international_rate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      international_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input-brutalist w-full"
                  placeholder="25.00"
                />
              </div>
            </div>
          </div>
        )}

        {/* Advanced Mode Configuration */}
        {config.mode === "advanced" && (
          <div className="brutalist-border bg-white p-6 mb-6">
            <h2 className="text-xl font-bold tracking-wide mb-4">advanced configuration</h2>
            <div className="h-[2px] w-full bg-black mb-4"></div>

            {/* Default Rate */}
            <div className="mb-6">
              <label className="block text-sm font-bold tracking-wide mb-2">
                default shipping rate ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={config.default_rate}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    default_rate: parseFloat(e.target.value) || 0,
                  })
                }
                className="input-brutalist w-full"
                placeholder="25.00"
              />
              <p className="text-xs tracking-wide mt-1 opacity-60">
                used for countries not explicitly configured below
              </p>
            </div>

            {/* Add Country Rate */}
            <div className="mb-6">
              <label className="block text-sm font-bold tracking-wide mb-2">
                add country-specific rate
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="input-brutalist flex-1"
                >
                  <option value="">select country...</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={countryRate}
                  onChange={(e) => setCountryRate(e.target.value)}
                  className="input-brutalist w-32"
                  placeholder="0.00"
                />
                <button onClick={addCountryRate} className="btn-brutalist-black px-4">
                  add
                </button>
              </div>
            </div>

            {/* Country Rates List */}
            <div>
              <h3 className="text-sm font-bold tracking-wide mb-3">configured rates</h3>
              {Object.keys(config.country_rates).length === 0 ? (
                <div className="text-center py-8 brutalist-border bg-gray-50">
                  <p className="text-sm tracking-wide opacity-60">
                    no country-specific rates configured
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(config.country_rates)
                    .sort(([, a], [, b]) => a - b)
                    .map(([countryCode, rate]) => (
                      <div
                        key={countryCode}
                        className="brutalist-border bg-white p-3 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold tracking-wide">
                            {getCountryName(countryCode)}
                          </span>
                          <span className="text-xs tracking-wide opacity-60 ml-2">
                            ({countryCode})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">${rate.toFixed(2)}</span>
                          <button
                            onClick={() => removeCountryRate(countryCode)}
                            className="text-xs hover:opacity-50"
                          >
                            ✕ remove
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-brutalist-black flex-1"
          >
            {saving ? "saving..." : "save configuration"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function AdminShippingPage() {
  return (
    <AdminAuthProvider>
      <AdminShippingContent />
    </AdminAuthProvider>
  );
}
