"use client";

import { useState, useRef, useEffect } from "react";
import { COUNTRIES, searchCountries } from "~/lib/countries";

interface ShippingAddress {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

interface ShippingAddressFormProps {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
}

export default function ShippingAddressForm({ address, onChange }: ShippingAddressFormProps) {
  const [countryQuery, setCountryQuery] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState(COUNTRIES);
  const countryInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize country display name if country code is set
    if (address.country) {
      const country = COUNTRIES.find((c) => c.code === address.country);
      if (country) {
        setCountryQuery(country.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount to initialize from prop

  useEffect(() => {
    // Handle clicks outside dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        countryInputRef.current &&
        !countryInputRef.current.contains(event.target as Node)
      ) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    onChange({ ...address, [field]: value });
  };

  const handleCountryInputChange = (value: string) => {
    setCountryQuery(value);
    setShowCountryDropdown(true);

    if (value.trim()) {
      setFilteredCountries(searchCountries(value));
    } else {
      setFilteredCountries(COUNTRIES);
    }
  };

  const handleCountrySelect = (countryCode: string, countryName: string) => {
    setCountryQuery(countryName);
    handleChange("country", countryCode);
    setShowCountryDropdown(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-wide mb-4">shipping address</h2>
      <div className="h-[2px] w-full bg-black mb-4"></div>

      <div>
        <label htmlFor="name" className="block text-sm font-bold tracking-wide mb-2">
          full name *
        </label>
        <input
          type="text"
          id="name"
          value={address.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="input-brutalist w-full"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-bold tracking-wide mb-2">
          email (optional)
        </label>
        <input
          type="email"
          id="email"
          value={address.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="input-brutalist w-full"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-bold tracking-wide mb-2">
          phone (optional)
        </label>
        <input
          type="tel"
          id="phone"
          value={address.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          className="input-brutalist w-full"
          placeholder="+1234567890"
        />
      </div>

      <div>
        <label htmlFor="addressLine1" className="block text-sm font-bold tracking-wide mb-2">
          address line 1 *
        </label>
        <input
          type="text"
          id="addressLine1"
          value={address.addressLine1}
          onChange={(e) => handleChange("addressLine1", e.target.value)}
          className="input-brutalist w-full"
          required
        />
      </div>

      <div>
        <label htmlFor="addressLine2" className="block text-sm font-bold tracking-wide mb-2">
          address line 2
        </label>
        <input
          type="text"
          id="addressLine2"
          value={address.addressLine2}
          onChange={(e) => handleChange("addressLine2", e.target.value)}
          className="input-brutalist w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-bold tracking-wide mb-2">
            city *
          </label>
          <input
            type="text"
            id="city"
            value={address.city}
            onChange={(e) => handleChange("city", e.target.value)}
            className="input-brutalist w-full"
            required
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-bold tracking-wide mb-2">
            state *
          </label>
          <input
            type="text"
            id="state"
            value={address.state}
            onChange={(e) => handleChange("state", e.target.value)}
            className="input-brutalist w-full"
            placeholder="CA"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="zip" className="block text-sm font-bold tracking-wide mb-2">
            zip code *
          </label>
          <input
            type="text"
            id="zip"
            value={address.zip}
            onChange={(e) => handleChange("zip", e.target.value)}
            className="input-brutalist w-full"
            required
          />
        </div>

        <div className="relative">
          <label htmlFor="country" className="block text-sm font-bold tracking-wide mb-2">
            country *
          </label>
          <input
            ref={countryInputRef}
            type="text"
            id="country"
            value={countryQuery}
            onChange={(e) => handleCountryInputChange(e.target.value)}
            onFocus={() => setShowCountryDropdown(true)}
            className="input-brutalist w-full"
            placeholder="Start typing country name..."
            autoComplete="off"
            required
          />
          {showCountryDropdown && filteredCountries.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 brutalist-border bg-white max-h-60 overflow-y-auto"
            >
              {filteredCountries.slice(0, 10).map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country.code, country.name)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-black hover:text-white transition-colors border-b border-black last:border-b-0"
                >
                  <span className="font-bold">{country.name}</span>
                  <span className="text-xs opacity-60 ml-2">({country.code})</span>
                </button>
              ))}
              {filteredCountries.length > 10 && (
                <div className="px-4 py-2 text-xs text-center opacity-60 border-t border-black">
                  + {filteredCountries.length - 10} more countries (keep typing to filter)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { ShippingAddress };
