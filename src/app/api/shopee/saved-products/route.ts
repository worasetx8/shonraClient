import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, getAuthToken, createAuthHeaders, validateAuth } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    const status = searchParams.get("status") || "active";
    const search = searchParams.get("search") || "";

    const params: Record<string, string> = {
      page,
      limit,
      status
    };

    // Only add search if it's not empty
    if (search) {
      params.search = search;
    }

    // Get auth token (optional - for backoffice use)
    const token = getAuthToken(request);
    const BACKEND_URL = getBackendUrl();
    const apiUrl = `${BACKEND_URL}/api/products/saved?${new URLSearchParams(params)}`;
    
    // Send token if available (for backoffice), otherwise backend will handle auth check
    const headers = token && validateAuth(token) 
      ? createAuthHeaders(token) 
      : { "Content-Type": "application/json" };
    
    const response = await fetch(apiUrl, {
      headers
    });

    // Handle 401 (Unauthorized) - endpoint requires auth but no token provided
    if (response.status === 401) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required. This endpoint requires login."
        },
        { status: 401 }
      );
    }

    if (!response.ok) {
      let errorMessage = `Backend returned ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If response is not JSON, use the default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Get Saved Products API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch saved products"
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, status } = body;

    if (!itemId || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "Item ID and status are required"
        },
        { status: 400 }
      );
    }

    // Get auth token (optional - for backoffice use)
    const token = getAuthToken(request);
    const BACKEND_URL = getBackendUrl();
    const apiUrl = `${BACKEND_URL}/api/products/status`;
    
    // Send token if available (for backoffice), otherwise backend will handle auth check
    const headers = token && validateAuth(token) 
      ? createAuthHeaders(token) 
      : { "Content-Type": "application/json" };
    
    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ itemId, status })
    });

    if (!response.ok) {
      let errorMessage = `Backend returned ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If response is not JSON, use the default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Update Product Status API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update product status"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, status } = body;

    if (!itemId || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "ItemId and status are required"
        },
        { status: 400 }
      );
    }

    // Get auth token (optional - for backoffice use)
    const token = getAuthToken(request);
    const BACKEND_URL = getBackendUrl();
    const apiUrl = `${BACKEND_URL}/api/products/status`;

    // Send token if available (for backoffice), otherwise backend will handle auth check
    const headers = token && validateAuth(token) 
      ? createAuthHeaders(token) 
      : { "Content-Type": "application/json" };

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ itemId, status })
    });

    if (!response.ok) {
      let errorMessage = `Backend returned ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If response is not JSON, use the default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Update Product Status API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update product status"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, itemId } = body;

    // Support both id (database ID) and itemId (product ID)
    const targetId = id || itemId;

    if (!targetId) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required"
        },
        { status: 400 }
      );
    }

    // Get auth token (optional - for backoffice use)
    const token = getAuthToken(request);
    const BACKEND_URL = getBackendUrl();
    const apiUrl = `${BACKEND_URL}/api/products/saved/delete`;
    
    // Send token if available (for backoffice), otherwise backend will handle auth check
    const headers = token && validateAuth(token) 
      ? createAuthHeaders(token) 
      : { "Content-Type": "application/json" };
    
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ id: targetId })
    });

    if (!response.ok) {
      let errorMessage = `Backend returned ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If response is not JSON, use the default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Delete Product API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete product"
      },
      { status: 500 }
    );
  }
}
