"use client";

import Link from "next/link";
import { useCart } from "~/context/CartContext";

export default function Navigation() {
  const { getTotalItems } = useCart();
  const cartItems = getTotalItems();

  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Link href="/">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight hover:text-gray-600 transition-colors">
                symphony labs
              </h1>
            </Link>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all rounded-md"
            >
              store
            </Link>
            <Link
              href="/about"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all rounded-md"
            >
              about
            </Link>
            <Link
              href="/faq"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all rounded-md"
            >
              faq
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all rounded-md"
            >
              contact
            </Link>
            <Link
              href="/track-order"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all rounded-md"
            >
              track order
            </Link>
            <Link
              href="/checkout"
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all rounded-md relative ml-1"
            >
              cart
              {cartItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-gray-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                  {cartItems}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
