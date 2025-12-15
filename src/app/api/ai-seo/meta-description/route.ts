import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, getAuthToken, createAuthHeaders, validateAuth } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get auth token (optional - for backoffice use)
    const token = getAuthToken(request);
    const BACKEND_URL = getBackendUrl();

    // Send token if available (for backoffice), otherwise backend will handle auth check
    const headers = token && validateAuth(token) 
      ? createAuthHeaders(token) 
      : { "Content-Type": "application/json" };

    const response = await fetch(`${BACKEND_URL}/api/ai-seo/meta-description`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate meta description",
        error: error.message
      },
      { status: 500 }
    );
  }
}
