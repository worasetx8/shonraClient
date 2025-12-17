import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, createDefaultHeaders } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * GET: Fetch a single product by itemId (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { itemId } = params;

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          error: "Item ID is required"
        },
        { status: 400 }
      );
    }

    const BACKEND_URL = getBackendUrl();
    const url = `${BACKEND_URL}/api/products/item/${itemId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: createDefaultHeaders(),
      cache: "no-store"
    });

    if (!response.ok) {
      // If product not found, return 404
      if (response.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Product not found",
            message: "ไม่พบสินค้าที่คุณค้นหา"
          },
          { status: 404 }
        );
      }
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Get product by itemId error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch product",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}


