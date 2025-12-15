import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, getAuthToken, createAuthHeaders, validateAuth } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const productData = await request.json();

    // Get auth token (optional - for backoffice use)
    const token = getAuthToken(request);
    const BACKEND_URL = getBackendUrl();
    const apiUrl = `${BACKEND_URL}/api/products/check`;

    // Send token if available (for backoffice), otherwise backend will handle auth check
    const headers = token && validateAuth(token) 
      ? createAuthHeaders(token) 
      : { "Content-Type": "application/json" };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Check Product API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to check product"
      },
      { status: 500 }
    );
  }
}
