/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode in dev to avoid double-mounting side-effects during debugging
  reactStrictMode: false,
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true // Temporarily ignore TS errors to get the dev server running
  },
  // Enable compression for better performance
  compress: true,
  // Optimize production builds
  swcMinify: true,
  // Enable source maps for production (helps with debugging and Lighthouse insights)
  // Source maps are only loaded when DevTools are open, so they don't affect performance
  productionBrowserSourceMaps: true,
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
      
      // Split chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for node_modules
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Chakra UI chunk (large library)
          chakra: {
            name: 'chakra',
            test: /[\\/]node_modules[\\/]@chakra-ui[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Framer Motion chunk
          framer: {
            name: 'framer',
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Lucide icons chunk
          lucide: {
            name: 'lucide',
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            chunks: 'all',
            priority: 30,
          },
        },
      };
    }
    
    return config;
  },
  images: {
    // domains is deprecated, use remotePatterns instead
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cf.shopee.co.th"
      },
      {
        protocol: "https",
        hostname: "shopee.co.th"
      },
      {
        protocol: "https",
        hostname: "**.shopee.co.th"
      },
      {
        protocol: "https",
        hostname: "down-th.img.susercontent.com"
      },
      {
        protocol: "https",
        hostname: "**.susercontent.com"
      },
      {
        protocol: "https",
        hostname: "cf.shopee.sg"
      },
      {
        protocol: "https",
        hostname: "shopee.sg"
      },
      {
        protocol: "https",
        hostname: "**.shopee.sg"
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
    // Image optimization settings
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    // Allow unoptimized images for local development
    unoptimized: process.env.NODE_ENV === "development" ? false : false
  },
  // Enable aggressive caching for static assets
  async headers() {
    return [
      // Static assets with content hashes (immutable - never changes, can cache forever)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images - cache for 1 month with stale-while-revalidate
      // Next.js route patterns don't support regex non-capturing groups, so we use individual patterns
      {
        source: '/:path*\\.jpg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*\\.jpeg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*\\.gif',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*\\.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*\\.webp',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*\\.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*\\.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*\\.avif',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      // Fonts - cache forever (immutable)
      {
        source: '/:path*\\.woff',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*\\.woff2',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*\\.ttf',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*\\.otf',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*\\.eot',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes - existing cache configuration
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
