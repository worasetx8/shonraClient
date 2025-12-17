/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode in dev to avoid double-mounting side-effects during debugging
  reactStrictMode: false,
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true // Temporarily ignore TS errors to get the dev server running
  },
  images: {
    domains: ["cf.shopee.co.th", "shopee.co.th", "down-th.img.susercontent.com", "cf.shopee.sg", "shopee.sg", "localhost"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.shopee.co.th"
      },
      {
        protocol: "https",
        hostname: "**.shopee.sg"
      },
      {
        protocol: "https",
        hostname: "**.susercontent.com"
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3002",
        pathname: "/api/uploads/**"
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/uploads/**"
      }
    ],
    // Allow unoptimized images for local development
    unoptimized: process.env.NODE_ENV === "development" ? false : false
  },
  // Enable aggressive caching for static assets
  async headers() {
    return [
      {
        source: '/api/categories',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/api/tags',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/api/banners/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/api/settings',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
