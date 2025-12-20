"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, Star, ShoppingCart, Home, Search, X, Store } from "lucide-react";
import CategorySlider from "@/components/CategorySlider";
import StructuredData from "@/components/StructuredData";

interface Product {
  id: number;
  item_id: string;
  category_id: number;
  category_name: string;
  product_name: string;
  price: number;
  image_url: string;
  shop_name: string;
  shop_id?: string;
  offer_link: string;
  rating_star: number;
  sales_count: number;
  discount_rate: number;
  commission_rate?: number;
  commission_amount?: number;
  seller_commission_rate?: number;
  shopee_commission_rate?: number;
  price_min?: number;
  price_max?: number;
  product_link?: string;
  period_start_time?: number;
  period_end_time?: number;
  campaign_active?: boolean;
}

interface Category {
  id: number;
  name: string;
  is_active: number;
}

// Helper function to create category slug
const createCategorySlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .trim();
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [websiteName, setWebsiteName] = useState<string>("SHONRA");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Memoize related products to avoid recalculation
  const relatedProducts = useMemo(() => {
    if (!product || !products.length) return [];
    return products.filter(
      (p) => p.category_id === product.category_id && p.item_id !== product.item_id
    );
  }, [product, products]);

  // Handle category change
  const handleCategoryChange = useCallback(
    (categoryId: number | 'all') => {
      if (categoryId === 'all') {
        router.push('/');
      } else {
        const category = categories.find((cat) => cat.id === categoryId);
        if (category) {
          router.push(`/category/${createCategorySlug(category.name)}`);
        }
      }
    },
    [categories, router]
  );

  // Fetch data - only fetch when itemId changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch product by itemId directly (more efficient)
        const [catResp, prodResp, settingsResp, relatedProdResp] = await Promise.all([
          fetch("/api/categories"), // This goes through Next.js API route which proxies to /api/categories/public
          fetch(`/api/products/item/${itemId}`),
          fetch("/api/settings"),
          // Fetch related products (same category, limit to reasonable number)
          fetch("/api/products/public?limit=100"),
        ]);

        if (!isMounted) return;

        // Check if product response is ok
        if (!prodResp.ok) {
          const errorData = await prodResp.json().catch(() => ({}));
          setError(errorData.message || errorData.error || `ไม่พบสินค้า (${prodResp.status})`);
          setLoading(false);
          return;
        }

        const catData = await catResp.json();
        const prodData = await prodResp.json();
        const settingsData = await settingsResp.json();
        const relatedProdData = await relatedProdResp.json();

        if (!isMounted) return;

        if (catData.success && Array.isArray(catData.data)) {
          const activeCategories = catData.data.filter((c: Category) => c.is_active === 1);
          setCategories(activeCategories);
        }

        // Handle product data
        if (prodData.success && prodData.data) {
          const found = prodData.data;
          setProduct(found);

          // Set current category from product
          if (catData.success && Array.isArray(catData.data)) {
            const cat = catData.data.find((c: Category) => c.id === found.category_id) || null;
            setCurrentCategory(cat);
          }

          // Set related products (for related products section)
          if (relatedProdData.success && Array.isArray(relatedProdData.data)) {
            // Filter to same category and exclude current product
            const related = relatedProdData.data.filter(
              (p: Product) => p.category_id === found.category_id && p.item_id !== found.item_id
            );
            setProducts(related);
          } else {
            // If related products fetch failed, set empty array
            setProducts([]);
          }
        } else {
          // Product not found or error
          const errorMessage = prodData.message || prodData.error || "ไม่พบสินค้าที่คุณค้นหา";
          setError(errorMessage);
          setLoading(false);
          return;
        }

        if (settingsData.success && settingsData.data) {
          setWebsiteName(settingsData.data.website_name || "SHONRA");
          let logoUrl = settingsData.data.logo_client_url || settingsData.data.logo_url || null;
          if (logoUrl && !logoUrl.startsWith('data:image/') && logoUrl.startsWith('/')) {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.shonra.com';
            logoUrl = `${backendUrl}${logoUrl}`;
          }
          setLogoUrl(logoUrl);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error fetching data:", err);
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [itemId]);

  // Scroll handler for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Handle Shop Now click - save product and navigate
  const handleShopNow = useCallback(async (e: React.MouseEvent) => {
    if (!product) return;

    e.preventDefault();
    e.stopPropagation();

    if (isSaving) return;

    setIsSaving(true);

    // Prepare product data for saving
    // Convert commission_rate from percentage to decimal if needed
    let commissionRateDecimal = 0;
    if (product.commission_rate !== undefined) {
      const rate = typeof product.commission_rate === 'string' ? parseFloat(product.commission_rate) : product.commission_rate;
      commissionRateDecimal = rate > 1 ? rate / 100 : rate;
    }

    // Ensure all numeric values are numbers, not strings
    const productData = {
      itemId: String(product.item_id), // Ensure itemId is string
      productName: product.product_name,
      shopName: product.shop_name || '',
      shopId: product.shop_id ? String(product.shop_id) : '',
      price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
      priceMin: product.price_min ? (typeof product.price_min === 'string' ? parseFloat(product.price_min) : product.price_min) : product.price,
      priceMax: product.price_max ? (typeof product.price_max === 'string' ? parseFloat(product.price_max) : product.price_max) : product.price,
      commissionRate: commissionRateDecimal,
      sellerCommissionRate: product.seller_commission_rate ? (typeof product.seller_commission_rate === 'string' ? parseFloat(product.seller_commission_rate) : product.seller_commission_rate) : commissionRateDecimal,
      shopeeCommissionRate: product.shopee_commission_rate ? (typeof product.shopee_commission_rate === 'string' ? parseFloat(product.shopee_commission_rate) : product.shopee_commission_rate) : 0,
      commission: product.commission_amount ? (typeof product.commission_amount === 'string' ? parseFloat(product.commission_amount) : product.commission_amount) : 0,
      imageUrl: product.image_url,
      productLink: product.product_link || product.offer_link,
      offerLink: product.offer_link,
      ratingStar: product.rating_star ? (typeof product.rating_star === 'string' ? parseFloat(product.rating_star) : product.rating_star) : 0,
      sold: product.sales_count ? (typeof product.sales_count === 'string' ? parseInt(product.sales_count) : product.sales_count) : 0,
      discountRate: product.discount_rate ? (typeof product.discount_rate === 'string' ? parseFloat(product.discount_rate) : product.discount_rate) : 0,
      periodStartTime: product.period_start_time ? (typeof product.period_start_time === 'string' ? parseInt(product.period_start_time) : product.period_start_time) : 0,
      periodEndTime: product.period_end_time ? (typeof product.period_end_time === 'string' ? parseInt(product.period_end_time) : product.period_end_time) : 0,
      campaignActive: product.campaign_active !== undefined ? Boolean(product.campaign_active) : false,
      is_flash_sale: false,
    };

    // Navigate immediately to avoid popup blocker
    window.location.href = product.offer_link;

    // Save product in background using sendBeacon (guaranteed delivery)
    try {
      const blob = new Blob([JSON.stringify(productData)], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/products/save-from-frontend', blob);
      
      if (!sent) {
        // Fallback to fetch if sendBeacon fails (rare)
        console.warn('sendBeacon failed, using fetch fallback');
        fetch('/api/products/save-from-frontend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
          keepalive: true,
        }).catch(err => console.error('Fetch fallback error:', err));
      }
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSaving(false);
    }
  }, [product, isSaving]);

  // Format functions
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(price)
      .replace("THB", "฿");
  }, []);

  // Memoize computed values
  const originalPrice = useMemo(() => {
    return product && product.discount_rate > 0 
      ? product.price / (1 - product.discount_rate / 100) 
      : null;
  }, [product?.price, product?.discount_rate]);

  const categorySlug = useMemo(() => {
    return currentCategory ? createCategorySlug(currentCategory.name) : '';
  }, [currentCategory?.name]);

  // Update document metadata for SEO (only when product data is ready)
  useEffect(() => {
    if (!product || loading) return;
    
    const pageTitle = `${product.product_name} - ${websiteName}`;
    const formattedPrice = formatPrice(product.price);
    const pageDescription = `${product.product_name} ราคา ${formattedPrice} จาก ${product.shop_name} | ${currentCategory?.name || product.category_name} | ${websiteName}`;
    
    document.title = pageTitle;
    
    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaTag('description', pageDescription);
    updateMetaTag('keywords', `${product.product_name}, ${currentCategory?.name || product.category_name}, shopee, affiliate, ส่วนลด, ${websiteName}`);
    updateMetaTag('og:title', pageTitle, true);
    updateMetaTag('og:description', pageDescription, true);
    updateMetaTag('og:url', `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shonra.com'}/product/${itemId}`, true);
    updateMetaTag('og:type', 'product', true);
    updateMetaTag('og:locale', 'th_TH', true);
    updateMetaTag('og:image', product.image_url, true);
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', pageTitle, true);
    updateMetaTag('twitter:description', pageDescription, true);
    updateMetaTag('twitter:image', product.image_url, true);
  }, [product?.item_id, websiteName, currentCategory?.name, itemId, loading, formatPrice]);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  }, []);

  // Handle search submit - redirect to homepage with search query
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}&shopee=true`);
    }
  }, [searchQuery, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen lg:h-screen bg-gray-50 lg:overflow-hidden lg:flex lg:flex-col">
        {/* Custom Header with Search Skeleton */}
        <header className="sticky top-0 z-50 bg-red-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center gap-2 lg:gap-4">
              <div className="w-8 h-8 bg-white rounded-lg animate-pulse flex-shrink-0" />
              <div className="flex-1 lg:flex lg:justify-center">
                <div className="w-full lg:max-w-2xl h-10 bg-white rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </header>

        <CategorySlider
          categories={categories}
          activeCategory={currentCategory?.id || 'all'}
          onCategoryChange={handleCategoryChange}
          getCategoryIcon={() => null}
        />
        <div className="hidden lg:block fixed top-[128px] left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <span>/</span>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <span>/</span>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-0 lg:px-8 pt-[70px] lg:pt-20 pb-4 lg:pb-6 lg:flex-1 lg:overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 lg:h-full">
            <div className="lg:col-span-8 bg-white p-0 lg:p-6 rounded-none lg:rounded-xl shadow-md lg:overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6">
                <div className="h-[250px] lg:h-[400px] bg-gray-200 animate-pulse" />
                <div className="space-y-2.5 lg:space-y-4 p-3 lg:p-0">
                  <div className="h-6 lg:h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 lg:h-6 bg-gray-200 rounded w-2/3 animate-pulse" />
                  <div className="h-8 lg:h-10 bg-gray-200 rounded w-1/3 animate-pulse" />
                  <div className="h-10 lg:h-12 bg-gray-200 rounded w-1/2 animate-pulse" />
                  <div className="h-5 lg:h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-4 bg-white p-3 lg:p-4 rounded-lg lg:rounded-xl shadow-md lg:flex lg:flex-col lg:min-h-0">
              <div className="h-4 lg:h-5 bg-gray-200 rounded w-1/2 mb-2 lg:mb-3 animate-pulse lg:flex-shrink-0" />
              <div className="lg:hidden overflow-x-auto pb-2 -mx-3 px-3">
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-32 bg-gray-50 rounded-lg p-2">
                      <div className="w-full h-24 bg-gray-200 rounded mb-2 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded mb-1 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden lg:flex lg:flex-1 lg:overflow-y-auto lg:pr-2">
                <div className="space-y-2 w-full">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <div className="w-12 h-12 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-50 bg-red-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={websiteName}
                    className="w-8 h-8 object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-red-600 font-bold text-lg logo-font">S</span>
                  </div>
                )}
                <span className="text-white font-bold text-xl hidden sm:inline logo-font">{websiteName}</span>
              </Link>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="text-6xl">😕</div>
            <h2 className="text-2xl font-bold text-gray-800">{error || "ไม่พบสินค้า"}</h2>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              <Home size={20} />
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shonra.com';
  const canonicalUrl = `${siteUrl}/product/${itemId}`;
  const breadcrumbData = [
    { name: 'หน้าแรก', url: siteUrl },
    { name: currentCategory?.name || product.category_name, url: categorySlug ? `${siteUrl}/category/${categorySlug}` : siteUrl },
    { name: product.product_name, url: canonicalUrl },
  ];

  return (
    <>
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      <StructuredData
        type="Product"
        data={{
          name: product.product_name,
          image: product.image_url,
          description: `${product.product_name} จาก ${product.shop_name}`,
          brand: product.shop_name,
          offers: {
            price: product.price,
            priceCurrency: "THB",
            availability: "https://schema.org/InStock",
            url: product.offer_link,
          },
          aggregateRating:
            product.rating_star > 0
              ? { ratingValue: product.rating_star, reviewCount: product.sales_count }
              : undefined,
        }}
      />
      
      {/* BreadcrumbList Structured Data */}
      <StructuredData type="BreadcrumbList" data={breadcrumbData} />

      <div className="min-h-screen lg:h-screen bg-gray-50 lg:overflow-hidden lg:flex lg:flex-col">
        {/* Custom Header with Search */}
        <header className="sticky top-0 z-50 bg-red-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Top Row: Logo + Search */}
            <div className="h-16 flex items-center gap-2 lg:gap-4">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-shrink-0">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={websiteName}
                    className="w-8 h-8 object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-red-600 font-bold text-lg">S</span>
                  </div>
                )}
                <span className="text-white font-bold text-xl hidden sm:inline logo-font">{websiteName}</span>
              </Link>

              {/* Search Bar - Mobile & Desktop */}
              <form 
                onSubmit={handleSearchSubmit}
                className="flex-1 lg:flex lg:justify-center"
              >
                <div className="relative w-full lg:max-w-2xl">
                  <input
                    type="text"
                    placeholder="ค้นหาสินค้าใน Shopee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-12 py-2 lg:py-2.5 bg-white rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-sm lg:text-base"
                  />
                  <button
                    type={searchQuery ? "button" : "submit"}
                    onClick={searchQuery ? () => setSearchQuery("") : undefined}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-600 hover:text-red-700 transition-colors"
                    title={searchQuery ? "Clear search" : "Search"}
                  >
                    {searchQuery ? <X size={18} className="lg:w-5 lg:h-5" /> : <Search size={18} className="lg:w-5 lg:h-5" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </header>

        <CategorySlider
          categories={categories}
          activeCategory={currentCategory?.id || 'all'}
          onCategoryChange={handleCategoryChange}
          getCategoryIcon={() => null}
        />
        <div className="hidden lg:block fixed top-[128px] left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 lg:py-3">
            <div className="flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm text-gray-600 overflow-x-auto">
              <Link href="/" className="hover:text-red-600 transition-colors whitespace-nowrap">
                หน้าแรก
              </Link>
              <span>/</span>
              <Link
                href={categorySlug ? `/category/${categorySlug}` : '#'}
                className="hover:text-red-600 transition-colors whitespace-nowrap"
              >
                {currentCategory?.name || product.category_name}
              </Link>
              <span>/</span>
              <span className="text-gray-400 truncate">{product.product_name}</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-0 lg:px-8 pt-[70px] lg:pt-20 pb-4 lg:pb-6 lg:flex-1 lg:overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 lg:h-full">
            <div className="lg:col-span-8 bg-white p-0 lg:p-6 rounded-none lg:rounded-xl shadow-md lg:overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6">
                <div className="flex items-start justify-center bg-gray-50 lg:bg-transparent relative">
                  <img
                    src={product.image_url}
                    alt={product.product_name}
                    className="w-full h-auto lg:max-h-[500px] object-contain"
                  />
                  {/* Discount Badge - Top Right */}
                  {product.discount_rate > 0 && (
                    <div className="absolute top-2 right-2 bg-orange-400 text-white text-xs lg:text-sm font-bold px-2 py-1 rounded-md shadow-lg">
                      {Math.round(product.discount_rate)}%
                    </div>
                  )}
                </div>
                <div className="space-y-2.5 lg:space-y-4 p-3 lg:p-0">
                  <h1 className="text-base lg:text-2xl font-bold leading-tight">
                    {product.product_name}
                  </h1>
                  <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
                    {product.rating_star > 0 && (
                      <div className="flex items-center gap-1">
                        <Star size={16} className="lg:w-[18px] lg:h-[18px] text-orange-400" />
                        <span className="font-semibold text-sm lg:text-base">
                          {Number(product.rating_star).toFixed(1)}
                        </span>
                      </div>
                    )}
                    <div className="text-gray-600 text-xs lg:text-sm">
                      ขายแล้ว {formatNumber(product.sales_count)}
                    </div>
                  </div>
                  {/* Price Section - Left/Right Layout like Product Card */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-xl lg:text-3xl font-bold text-red-600">
                      {formatPrice(product.price)}
                    </div>
                    {originalPrice && (
                      <div className="text-xs lg:text-sm text-gray-400 line-through">
                        {formatPrice(originalPrice)}
                      </div>
                    )}
                  </div>
                  
                  {/* Shop Name - Prominent Display */}
                  {product.shop_name && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <Store size={18} className="text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-blue-600 font-medium mb-0.5">ร้านค้า</div>
                        <div className="text-sm lg:text-base font-semibold text-blue-900 truncate">
                          {product.shop_name}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleShopNow}
                    disabled={isSaving}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 lg:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart size={18} /> {isSaving ? 'กำลังบันทึก...' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-4 bg-white p-3 lg:p-4 rounded-lg lg:rounded-xl shadow-md lg:flex lg:flex-col lg:min-h-0">
              <h3 className="font-semibold text-sm lg:text-base mb-2 lg:mb-3 lg:flex-shrink-0">
                สินค้าในหมวดนี้
              </h3>
              <div className="lg:hidden overflow-x-auto pb-2 -mx-3 px-3">
                <div className="flex gap-2">
                  {relatedProducts.map((p) => (
                    <Link
                      key={p.item_id}
                      href={`/product/${p.item_id}`}
                      className="flex-shrink-0 w-32 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                    >
                      <img
                        src={p.image_url}
                        className="w-full h-24 object-cover rounded mb-2"
                        alt={p.product_name}
                      />
                      <div className="text-xs text-gray-700 line-clamp-2 mb-1">
                        {p.product_name}
                      </div>
                      <div className="text-xs font-semibold text-red-600">{formatPrice(p.price)}</div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden lg:flex lg:flex-1 lg:overflow-y-auto lg:pr-2 custom-scrollbar">
                <div className="space-y-2 w-full">
                  {relatedProducts.map((p) => (
                    <Link
                      key={p.item_id}
                      href={`/product/${p.item_id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <img
                        src={p.image_url}
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                        alt={p.product_name}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-700 line-clamp-2">{p.product_name}</div>
                        <div className="text-xs font-semibold text-red-600 mt-1">
                          {formatPrice(p.price)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: #f1f1f1;
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #cbd5e1;
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #94a3b8;
                }
              `}</style>
            </div>
          </div>
          {showBackToTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors z-50"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
