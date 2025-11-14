/**
 * JWT Authentication Utility
 *
 * Provides secure JWT token generation and verification for admin authentication.
 * Uses the jose library for standards-compliant JWT operations.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "~/env";

const JWT_SECRET = env.JWT_SECRET;
const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = "symphony-labs";
const JWT_AUDIENCE = "symphony-labs-admin";

// Convert secret to Uint8Array for jose
const secret = new TextEncoder().encode(JWT_SECRET);

export interface AdminTokenPayload extends JWTPayload {
  username: string;
  role: "admin";
  iat: number;
  exp: number;
}

/**
 * Generate a JWT token for an admin user
 * @param username - Admin username
 * @param expiresIn - Token expiration time (default: 8 hours)
 * @returns Signed JWT token
 */
export async function generateAdminToken(
  username: string,
  expiresIn = "8h"
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Convert expiresIn to seconds
  const expirationSeconds = parseExpiresIn(expiresIn);

  const token = await new SignJWT({
    username,
    role: "admin",
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt(now)
    .setExpirationTime(now + expirationSeconds)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .sign(secret);

  return token;
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded token payload if valid, null otherwise
 */
export async function verifyAdminToken(
  token: string
): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Validate payload structure
    if (
      !payload.username ||
      typeof payload.username !== "string" ||
      payload.role !== "admin"
    ) {
      return null;
    }

    return payload as AdminTokenPayload;
  } catch (error) {
    // Token is invalid, expired, or malformed
    // Only log non-expiration errors to avoid cluttering logs with expected expired token attempts
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ERR_JWT_EXPIRED"
    ) {
      // Token expired - this is expected behavior, don't log as error
      return null;
    }
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1] ?? null;
}

/**
 * Verify admin authentication from request
 * @param request - Next.js request object
 * @returns Admin payload if authenticated, null otherwise
 */
export async function verifyAdminAuth(
  request: Request
): Promise<AdminTokenPayload | null> {
  const authHeader = request.headers.get("Authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return null;
  }

  return await verifyAdminToken(token);
}

/**
 * Parse expiration string to seconds
 * Supports formats like "1h", "30m", "7d"
 */
function parseExpiresIn(expiresIn: string): number {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  if (isNaN(value)) {
    throw new Error(`Invalid expiresIn format: ${expiresIn}`);
  }

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      throw new Error(`Invalid expiresIn unit: ${unit}`);
  }
}

/**
 * Check if token is about to expire (within 30 minutes)
 * @param payload - JWT payload
 * @returns True if token expires soon
 */
export function isTokenExpiringSoon(payload: AdminTokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;
  return expiresIn < 30 * 60; // Less than 30 minutes
}
