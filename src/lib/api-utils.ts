import { NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * Get backend URL from environment variable
 * For server-side (API routes): Use BACKEND_URL or internal Docker network name
 * For client-side: Use NEXT_PUBLIC_BACKEND_URL
 */
export function getBackendUrl(): string {
  // Server-side: Use BACKEND_URL or internal Docker network name
  if (typeof window === "undefined") {
    // Running in Node.js (server-side)
    // Try BACKEND_URL first (for Docker internal network)
    // Fallback to NEXT_PUBLIC_BACKEND_URL (for public URL)
    // Last fallback to public URL
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.shonra.com";
    // Log for debugging (only in development or when explicitly enabled)
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_BACKEND_URL === 'true') {
      console.log(`[getBackendUrl] Server-side BACKEND_URL: ${process.env.BACKEND_URL || 'not set'}`);
      console.log(`[getBackendUrl] Server-side NEXT_PUBLIC_BACKEND_URL: ${process.env.NEXT_PUBLIC_BACKEND_URL || 'not set'}`);
      console.log(`[getBackendUrl] Using: ${backendUrl}`);
    }
    return backendUrl;
  }
  // Client-side: Use NEXT_PUBLIC_BACKEND_URL
  // In production, NEXT_PUBLIC_BACKEND_URL should always be set
  // Fallback to production URL if not set (better than localhost)
  return process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'production' ? "https://api.shonra.com" : "http://localhost:3002");
}

/**
 * Create default headers for backend requests with User-Agent
 * Includes optional secret header for production security
 * @returns Headers object with User-Agent, Content-Type, and optional secret header
 */
export function createDefaultHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "User-Agent": "SHONRA-Frontend/1.0"
  };

  // Add secret header in production if configured (for additional security)
  // This header is only sent from Next.js server-side (not exposed to client)
  if (typeof window === "undefined" && process.env.NEXTJS_API_SECRET) {
    (defaultHeaders as Record<string, string>)["X-NextJS-API-Secret"] = process.env.NEXTJS_API_SECRET;
  }

  if (additionalHeaders) {
    return { ...defaultHeaders, ...additionalHeaders };
  }

  return defaultHeaders;
}

/**
 * Extract authentication token from request (cookie or Authorization header)
 * @returns token string or null if not found
 */
export function getAuthToken(request: NextRequest): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get("auth-token")?.value || request.headers.get("Authorization")?.replace("Bearer ", "");
  return token || null;
}

/**
 * Create headers for authenticated backend requests
 * @returns Headers object with Authorization and Content-Type
 */
export function createAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "SHONRA-Frontend/1.0"
  };
}

/**
 * Validate authentication token
 * @returns true if token exists, false otherwise
 */
export function validateAuth(token: string | null): boolean {
  return token !== null && token.trim() !== "";
}
