/**
 * Next.js Middleware
 *
 * Applies comprehensive security headers to all responses.
 * Admin route authentication is handled by AdminAuthProvider in the admin pages.
 * This middleware runs on the Edge runtime for optimal performance.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Apply security headers to all responses
  const response = NextResponse.next();
  applySecurityHeaders(response, request);
  return response;
}

function applySecurityHeaders(response: NextResponse, _request: NextRequest): void {
  // Get Supabase URL from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).origin : "https://*.supabase.co";

  // Content Security Policy (CSP)
  // Strict CSP to prevent XSS attacks
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval for development
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseDomain} https://api.qrserver.com https://*.supabase.co`, // Allow Supabase, QR code API
    "frame-ancestors 'none'", // Prevent clickjacking
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspHeader);

  // Strict-Transport-Security (HSTS)
  // Force HTTPS for 1 year, including subdomains
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // X-Frame-Options
  // Prevent clickjacking attacks
  response.headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // X-XSS-Protection
  // Enable browser XSS protection (legacy, but still useful)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy
  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy
  // Disable unnecessary browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // X-DNS-Prefetch-Control
  // Control DNS prefetching
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // Remove sensitive server information
  response.headers.delete("X-Powered-By");
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
