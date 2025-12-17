import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { positionName: string } }) {
  try {
    const { positionName } = params;
    const decodedPositionName = decodeURIComponent(positionName);

    const BACKEND_URL = getBackendUrl();
    const url = `${BACKEND_URL}/api/banners/public/${encodeURIComponent(decodedPositionName)}`;

    // Check if this is a hard refresh (F5) - browser sends Cache-Control: no-cache or Pragma: no-cache
    const cacheControl = request.headers.get("cache-control");
    const pragma = request.headers.get("pragma");
    const isHardRefresh = cacheControl?.includes("no-cache") || pragma === "no-cache";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
      // If hard refresh, bypass cache. Otherwise, use Next.js Data Cache for 5 minutes
      ...(isHardRefresh
        ? { cache: "no-store" }
        : {
            next: {
              revalidate: 300, // Revalidate every 5 minutes
              tags: ["banners", `banners:${decodedPositionName}`] // Tags for manual revalidation
            }
          })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [Banner API Route] Backend error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    // Normalize image URLs to use Next.js proxy route for better image optimization
    // Convert backend image URLs to Next.js proxy URLs
    if (data.success && data.data) {
      const normalizeImageUrl = (imageUrl: string | null): string => {
        if (!imageUrl) return imageUrl || '';
        
        // Skip base64 data URIs and external URLs
        if (imageUrl.startsWith('data:image/') || imageUrl.startsWith('http')) {
          return imageUrl;
        }
        
        // Convert backend image URLs to Next.js proxy URLs
        // Backend returns: /api/uploads/banners/filename.png
        // Convert to: /api/uploads/banners/filename.png (same path, but proxied through Next.js)
        if (imageUrl.startsWith('/api/uploads/banners/')) {
          return imageUrl; // Keep as relative path for Next.js Image optimization
        }
        
        // If it's a full backend URL, extract the path
        if (imageUrl.includes('/api/uploads/banners/')) {
          const match = imageUrl.match(/\/api\/uploads\/banners\/[^/]+$/);
          if (match) {
            return match[0];
          }
        }
        
        return imageUrl;
      };

      // Normalize URLs in banner data
      if (Array.isArray(data.data)) {
        data.data = data.data.map((banner: any) => ({
          ...banner,
          image_url: normalizeImageUrl(banner.image_url)
        }));
      } else if (data.data && typeof data.data === 'object') {
        data.data = {
          ...data.data,
          image_url: normalizeImageUrl(data.data.image_url)
        };
      }
    }

    // Cache-Control: Use stale-while-revalidate pattern for normal requests
    // For hard refresh, set no-cache to prevent browser caching
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": isHardRefresh
          ? "no-cache, no-store, must-revalidate"
          : "public, s-maxage=300, stale-while-revalidate=600"
      }
    });
  } catch (error: any) {
    console.error("❌ [Banner API Route] Error:", error);
    return NextResponse.json(
      { success: false, data: null, message: error.message || "Failed to fetch banner" },
      { status: 500 }
    );
  }
}
