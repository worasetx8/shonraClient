import { MetadataRoute } from "next";
import { getBackendUrl } from "@/lib/api-utils";

/**
 * Generate robots.txt dynamically from API settings
 * Falls back to default if API is unavailable
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  let sitemapUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://shonra.com"}/sitemap.xml`;

  try {
    const BACKEND_URL = getBackendUrl();
    const response = await fetch(`${BACKEND_URL}/api/settings`, {
      next: { revalidate: 300, tags: ["settings"] }, // Cache for 5 minutes
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.sitemap_url) {
        sitemapUrl = data.data.sitemap_url;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch sitemap URL from API, using default:", error);
  }

  return {
    rules: [
      // Googlebot - Allow public pages, block sensitive paths
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: [
          "/api/",
          "/backoffice/",
          "/maintenance/",
          "/not-found",
          "/404",
          "/favicon.ico"
        ]
      },
      // Bingbot - Same as Googlebot
      {
        userAgent: "Bingbot",
        allow: ["/"],
        disallow: [
          "/api/",
          "/backoffice/",
          "/maintenance/",
          "/not-found",
          "/404",
          "/favicon.ico"
        ]
      },
      // All other bots
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/backoffice/",
          "/maintenance/",
          "/not-found",
          "/404",
          "/favicon.ico"
        ]
      }
    ],
    sitemap: sitemapUrl
  };
}
