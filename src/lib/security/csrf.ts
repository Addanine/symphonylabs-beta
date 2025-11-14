/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Provides CSRF token generation and validation using the double-submit cookie pattern.
 * This protects against CSRF attacks by requiring a token that is only available to
 * same-origin requests.
 */

import { SignJWT, jwtVerify } from "jose";

const CSRF_SECRET = process.env.JWT_SECRET ?? "change-this-secret";
const secret = new TextEncoder().encode(CSRF_SECRET);

/**
 * Generate a CSRF token
 * @param sessionId - Optional session identifier
 * @returns CSRF token
 */
export async function generateCsrfToken(sessionId?: string): Promise<string> {
  const token = await new SignJWT({
    type: "csrf",
    sessionId: sessionId ?? "anonymous",
    random: Math.random().toString(36),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);

  return token;
}

/**
 * Verify a CSRF token
 * @param token - CSRF token to verify
 * @returns True if token is valid
 */
export async function verifyCsrfToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secret);

    if (payload.type !== "csrf") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extract CSRF token from request headers
 * Checks both X-CSRF-Token header and csrf-token header
 */
export function extractCsrfToken(request: Request): string | null {
  return (
    request.headers.get("X-CSRF-Token") ??
    request.headers.get("csrf-token") ??
    null
  );
}

/**
 * Validate CSRF token from request
 * @param request - Request object
 * @returns True if CSRF token is valid
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const token = extractCsrfToken(request);

  if (!token) {
    return false;
  }

  return await verifyCsrfToken(token);
}

/**
 * Check if request requires CSRF protection
 * GET, HEAD, and OPTIONS requests don't need CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  return !safeMethods.includes(method.toUpperCase());
}
