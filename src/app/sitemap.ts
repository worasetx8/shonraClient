import { MetadataRoute } from "next";
import { getBackendUrl, createDefaultHeaders } from "@/lib/api-utils";

/**
 * Generate sitemap dynamically from backend API
 * Includes homepage, products, and categories
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://shonra.com";
  const BACKEND_URL = getBackendUrl();

  // Fetch site URL from settings
  try {
    const response = await fetch(`${BACKEND_URL}/api/settings`, {
      headers: createDefaultHeaders(),
      cache: "no-store"
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.site_url) {
        siteUrl = data.data.site_url;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch site URL from API, using default:", error);
  }

  // Static pages
  const routes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0
    }
  ];

  // Fetch products - Use large limit to get all products
  try {
    const productsResponse = await fetch(`${BACKEND_URL}/api/products/public?limit=1000`, {
      headers: createDefaultHeaders(),
      cache: "no-store"
    });

    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      console.log(
        `[Sitemap] Products response:`,
        productsData.success ? `${productsData.data?.length || 0} products` : "failed"
      );

      if (productsData.success && Array.isArray(productsData.data)) {
        productsData.data.forEach((product: any) => {
          // Try multiple possible slug fields
          const slug = product.slug || product.item_id || product.id;
          if (slug) {
            routes.push({
              url: `${siteUrl}/product/${slug}`,
              lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
              changeFrequency: "weekly" as const,
              priority: 0.8
            });
          }
        });
      }
    } else {
      console.warn(`[Sitemap] Products fetch failed with status:`, productsResponse.status);
    }
  } catch (error) {
    console.warn("[Sitemap] Failed to fetch products:", error);
  }

  // Fetch categories
  try {
    const categoriesResponse = await fetch(`${BACKEND_URL}/api/categories/public`, {
      headers: createDefaultHeaders(),
      cache: "no-store"
    });

    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      console.log(
        `[Sitemap] Categories response:`,
        categoriesData.success ? `${categoriesData.data?.length || 0} categories` : "failed"
      );

      if (categoriesData.success && Array.isArray(categoriesData.data)) {
        categoriesData.data.forEach((category: any) => {
          // Generate slug from name or use existing slug/id
          let slug = category.slug;

          if (!slug && category.name) {
            // Create slug from name: "Electronics" -> "electronics"
            slug = category.name
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^\w\-]+/g, "")
              .replace(/\-\-+/g, "-")
              .trim();
          }

          // Fallback to id if still no slug
          if (!slug) {
            slug = category.id;
          }

          if (slug) {
            routes.push({
              url: `${siteUrl}/category/${slug}`,
              lastModified: category.updated_at ? new Date(category.updated_at) : new Date(),
              changeFrequency: "weekly" as const,
              priority: 0.7
            });
          }
        });
      }
    } else {
      console.warn(`[Sitemap] Categories fetch failed with status:`, categoriesResponse.status);
    }
  } catch (error) {
    console.warn("[Sitemap] Failed to fetch categories:", error);
  }

  console.log(`[Sitemap] Total URLs generated: ${routes.length}`);
  return routes;
}
