/**
 * Client-side API utilities for making requests directly to backend
 * Use these functions in React components (client-side only)
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Make a GET request to backend API from client-side
 */
export async function fetchFromBackend(endpoint: string, options: FetchOptions = {}) {
  const { params, ...fetchOptions } = options;

  let url = `${BACKEND_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch settings from backend
 */
export async function fetchSettings() {
  return fetchFromBackend("/api/settings");
}

/**
 * Fetch categories from backend
 */
export async function fetchCategories() {
  return fetchFromBackend("/api/categories/public");
}

/**
 * Fetch tags from backend
 */
export async function fetchTags() {
  return fetchFromBackend("/api/tags/public");
}

/**
 * Fetch products from backend
 * Use Next.js API route to avoid IP blocking and CORS issues
 */
export async function fetchProducts(params: {
  page?: string;
  limit?: string;
  category_id?: string;
  tag_id?: string;
  search?: string;
  status?: string;
}) {
  // Use Next.js API route instead of calling backend directly
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page);
  if (params.limit) searchParams.set('limit', params.limit);
  if (params.category_id) searchParams.set('category_id', params.category_id);
  if (params.tag_id) searchParams.set('tag_id', params.tag_id);
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);

  const response = await fetch(`/api/products/public?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch flash sale products
 */
export async function fetchFlashSaleProducts(params: { page?: string; limit?: string }) {
  return fetchFromBackend("/api/products/flash-sale", { params });
}

/**
 * Fetch banners by position
 * Use Next.js API route to get normalized URLs (converts relative paths to absolute backend URLs)
 */
export async function fetchBanners(positionName: string) {
  const encodedPosition = encodeURIComponent(positionName);
  const response = await fetch(`/api/banners/public/${encodedPosition}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Search Shopee products from backend
 * Calls backend API directly from client-side
 */
export async function searchShopeeProducts(params: {
  page?: string;
  search?: string;
  commissionRate?: string;
  ratingStar?: string;
}) {
  const searchParams: Record<string, string> = {};
  if (params.page) searchParams.page = params.page;
  if (params.search) searchParams.search = params.search;
  if (params.commissionRate) searchParams.commissionRate = params.commissionRate;
  if (params.ratingStar) searchParams.ratingStar = params.ratingStar;

  return fetchFromBackend("/api/products/search", { params: searchParams });
}
