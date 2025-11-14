"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Display */}
        <div className="mb-8">
          <div className="text-9xl md:text-[12rem] font-bold text-gray-200 leading-none mb-4">
            404
          </div>
          <div className="h-px bg-gray-200 w-24 mx-auto mb-8"></div>
        </div>

        {/* Error Message */}
        <div className="mb-12">
          <h1 className="text-2xl md:text-3xl font-semibold mb-4 text-gray-900 lowercase">
            page not found
          </h1>
          <p className="text-base text-gray-600 leading-relaxed">
            the page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="btn-brutalist-black px-8 py-3 inline-block lowercase"
          >
            return home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-brutalist px-8 py-3 lowercase"
          >
            go back
          </button>
        </div>

        {/* Footer Message */}
        <div className="mt-16 text-xs text-gray-400 lowercase">
          lost? contact us if you need assistance
        </div>
      </div>
    </main>
  );
}
