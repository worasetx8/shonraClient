'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, X, Search, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import ModernProductCard from '@/components/ModernProductCard';
import CategorySlider from '@/components/CategorySlider';
import StructuredData from '@/components/StructuredData';

interface Product {
  id: number;
  item_id: string;
  category_id: number;
  category_name: string;
  product_name: string;
  price: number;
  price_min?: number;
  price_max?: number;
  commission_rate: number;
  commission_amount: number;
  image_url: string;
  shop_name: string;
  shop_id: string;
  product_link: string;
  offer_link: string;
  rating_star: number;
  sales_count: number;
  discount_rate: number;
  status: string;
  is_flash_sale: boolean;
  from_shopee?: boolean;
  commission_rate_original?: number;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  is_active: number;
  product_count?: number;
}

type SortOption = 'relevance' | 'price_asc' | 'price_desc';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [websiteName, setWebsiteName] = useState<string>('SHONRA');
  const [visibleCount, setVisibleCount] = useState(20); // Lazy load - show 20 products initially
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Fetch data - only fetch when slug changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch categories (goes through Next.js API route which proxies to /api/categories/public)
        const catResponse = await fetch('/api/categories');
        const catData = await catResponse.json();
        
        if (!isMounted) return;
        
        if (catData.success && Array.isArray(catData.data)) {
          const activeCategories = catData.data.filter(
            (cat: Category) => cat.is_active === 1
          );
          setCategories(activeCategories);

          // Find current category by slug
          const category = activeCategories.find((cat: Category) => {
            const catSlug = cat.name
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^\w\-]+/g, '')
              .replace(/\-\-+/g, '-')
              .trim();
            return catSlug === slug;
          });

          if (!category) {
            setError('ไม่พบหมวดหมู่ที่ต้องการ');
            setLoading(false);
            return;
          }

          setCurrentCategory(category);

          // Fetch products and settings in parallel
          // Send category_id parameter to filter on backend and use high limit to get all products
          const [prodResponse, settingsResponse] = await Promise.all([
            fetch(`/api/products/public?category_id=${category.id}&limit=10000`),
            fetch('/api/settings')
          ]);

          if (!isMounted) return;

          const prodData = await prodResponse.json();
          if (prodData.success && Array.isArray(prodData.data)) {
            // Products are already filtered by category_id on the backend
            // But keep filter as fallback in case backend doesn't filter properly
            const categoryProducts = prodData.data.filter(
              (prod: Product) => prod.category_id === category.id
            );
            setProducts(categoryProducts);
          }

          // Process settings
          const settingsData = await settingsResponse.json();
          if (settingsData.success && settingsData.data) {
            let logoUrl = settingsData.data.logo_client_url || settingsData.data.logo_url || null;
            if (logoUrl && !logoUrl.startsWith('data:image/') && logoUrl.startsWith('/')) {
              const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.shonra.com';
              logoUrl = `${backendUrl}${logoUrl}`;
            }
            setLogoUrl(logoUrl);
            setWebsiteName(settingsData.data.website_name || 'SHONRA');
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching data:', err);
        setError('ไม่สามารถโหลดข้อมูลได้');
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
  }, [slug]);

  // Sort products when dependencies change
  useEffect(() => {
    const productsToSort = hasSearched ? searchResults : products;
    let sorted = [...productsToSort];

    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    }

    setFilteredProducts(sorted);
  }, [hasSearched, searchResults, products, sortBy]);

  // Reset visible count when filtered products change
  useEffect(() => {
    setVisibleCount(20);
  }, [filteredProducts]);

  // Combined scroll handler for lazy load and back to top button
  useEffect(() => {
    // Use requestAnimationFrame to batch DOM reads and avoid forced reflow
    const handleScroll = () => {
      requestAnimationFrame(() => {
        // Batch all DOM reads together
        const scrollY = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        
        // Back to top button visibility
        setShowBackToTop(scrollY > 400);
        
        // Lazy load more products
        if (windowHeight + scrollY >= scrollHeight - 500 && visibleCount < filteredProducts.length) {
          setVisibleCount(prev => Math.min(prev + 20, filteredProducts.length));
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredProducts.length, visibleCount]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Update document metadata dynamically (only when data is ready)
  useEffect(() => {
    if (currentCategory && !loading) {
      const pageTitle = `${currentCategory.name} - ${websiteName}`;
      const pageDescription = `ช็อปสินค้าหมวดหมู่ ${currentCategory.name} คุณภาพดี ราคาถูก จาก Shopee ที่ ${websiteName} | พบสินค้า ${filteredProducts.length} รายการ`;
      
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
      updateMetaTag('keywords', `${currentCategory.name}, shopee, affiliate, ส่วนลด, ${websiteName}`);
      updateMetaTag('og:title', pageTitle, true);
      updateMetaTag('og:description', pageDescription, true);
      updateMetaTag('og:url', `https://www.shonra.com/category/${slug}`, true);
      updateMetaTag('og:type', 'website', true);
      updateMetaTag('og:locale', 'th_TH', true);
      updateMetaTag('twitter:title', pageTitle, true);
      updateMetaTag('twitter:description', pageDescription, true);
      
      if (filteredProducts.length > 0) {
        updateMetaTag('og:image', filteredProducts[0].image_url, true);
        updateMetaTag('twitter:image', filteredProducts[0].image_url, true);
      }
    }
  }, [currentCategory?.id, filteredProducts.length, websiteName, slug, loading]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      clearSearch();
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Search in Shopee API using GET with query parameters
      const params = new URLSearchParams({
        search: searchQuery.trim(),
        page: '1',
      });

      const response = await fetch(`/api/shopee/search?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        console.error(`Search API error: ${response.status} ${response.statusText}`);
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const data = await response.json();
      
      // Backend wraps data in formatResponse, check both possible structures
      const nodes = data.data?.data?.productOfferV2?.nodes || data.data?.productOfferV2?.nodes || [];
      
      if (data.success && nodes && nodes.length > 0) {
        // Map Shopee results to Product format
        const mappedResults: Product[] = nodes
          .filter((item: any) => {
            const hasValidPrice = (item.price && item.price > 0) || 
                                 (item.priceMin && item.priceMin > 0) || 
                                 (item.priceMax && item.priceMax > 0);
            return item.itemId && item.productName && item.imageUrl && item.offerLink && hasValidPrice;
          })
          .map((item: any) => {
            let displayPrice = 0;
            if (item.priceMin && item.priceMin > 0) {
              displayPrice = item.priceMin;
            } else if (item.price && item.price > 0) {
              displayPrice = item.price;
            } else if (item.priceMax && item.priceMax > 0) {
              displayPrice = item.priceMax;
            }

            const commissionRateDecimal = parseFloat(item.commissionRate || 0);
            const commissionRatePercent = commissionRateDecimal * 100;
            
            let commissionAmount = parseFloat(item.commission) || 0;
            if (commissionAmount === 0 && displayPrice > 0 && commissionRateDecimal > 0) {
              commissionAmount = displayPrice * commissionRateDecimal;
            }

            return {
              id: 0,
              item_id: item.itemId?.toString() || '',
              category_id: currentCategory?.id || 0,
              category_name: currentCategory?.name || '',
              product_name: item.productName || '',
              price: displayPrice,
              price_min: item.priceMin && item.priceMin > 0 ? item.priceMin : displayPrice,
              price_max: item.priceMax && item.priceMax > 0 ? item.priceMax : displayPrice,
              commission_rate: commissionRatePercent,
              commission_amount: commissionAmount,
              commission_rate_original: commissionRateDecimal, // Store original decimal for saving
              image_url: item.imageUrl || '',
              shop_name: item.shopName || '',
              shop_id: item.shopId?.toString() || '',
              product_link: item.productLink || `https://shopee.co.th/product/${item.shopId}/${item.itemId}`,
              offer_link: item.offerLink || '',
              rating_star: item.ratingStar || 0,
              sales_count: item.sales || 0,
              discount_rate: item.priceDiscountRate || 0,
              status: 'active',
              is_flash_sale: false,
              from_shopee: true, // Mark as Shopee search result
              updated_at: new Date().toISOString(),
              // Add missing fields for saving product
              periodStartTime: item.periodStartTime || 0,
              periodEndTime: item.periodEndTime || 0,
              campaignActive: item.campaignActive !== undefined ? item.campaignActive : false,
              sellerCommissionRate: item.sellerCommissionRate || commissionRateDecimal,
              shopeeCommissionRate: item.shopeeCommissionRate || 0,
            };
          })
          .filter((item: Product) => item.price > 0);
        
        setSearchResults(mappedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
    setSearchResults([]);
    setFilteredProducts(products);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-16 bg-gray-200 animate-pulse"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-12 bg-gray-200 rounded-xl mb-6 animate-pulse"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentCategory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="text-6xl">😕</div>
            <h2 className="text-2xl font-bold text-gray-800">
              {error || 'ไม่พบหมวดหมู่'}
            </h2>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Generate SEO metadata
  const pageTitle = `${currentCategory.name} - ${websiteName}`;
  const pageDescription = `ช็อปสินค้าหมวดหมู่ ${currentCategory.name} คุณภาพดี ราคาถูก จาก Shopee ที่ ${websiteName} | พบสินค้า ${filteredProducts.length} รายการ`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.shonra.com';
  const canonicalUrl = `${siteUrl}/category/${slug}`;

  return (
    <>
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Breadcrumb Structured Data */}
      <StructuredData
        type="BreadcrumbList"
        data={[
          {
            name: 'หน้าแรก',
            url: siteUrl,
          },
          {
            name: currentCategory.name,
            url: canonicalUrl,
          },
        ]}
      />

      {/* ItemList Structured Data for Products */}
      {filteredProducts.length > 0 && (
        <Script
          id="product-list-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              numberOfItems: filteredProducts.length,
              itemListElement: filteredProducts.slice(0, 20).map((product, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'Product',
                  '@id': `${canonicalUrl}#product-${product.item_id}`,
                  name: product.product_name,
                  description: `${product.product_name} - ${product.shop_name}`,
                  image: product.image_url,
                  url: `${siteUrl}/product/${product.item_id}`,
                  brand: {
                    '@type': 'Brand',
                    name: product.shop_name,
                  },
                  ...(product.rating_star > 0 && {
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: product.rating_star,
                      bestRating: 5,
                      worstRating: 1,
                      ratingCount: product.sales_count || 1,
                    },
                  }),
                  offers: {
                    '@type': 'Offer',
                    price: product.price,
                    priceCurrency: 'THB',
                    availability: 'https://schema.org/InStock',
                    url: product.offer_link,
                    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    description: `${product.product_name} - ส่งฟรีทั่วไทย`,
                    shippingDetails: {
                      '@type': 'OfferShippingDetails',
                      shippingRate: {
                        '@type': 'MonetaryAmount',
                        value: '0',
                        currency: 'THB',
                      },
                      shippingDestination: {
                        '@type': 'DefinedRegion',
                        addressCountry: 'TH',
                      },
                      deliveryTime: {
                        '@type': 'ShippingDeliveryTime',
                        businessDays: {
                          '@type': 'OpeningHoursSpecification',
                          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                        },
                        cutoffTime: '14:00',
                        handlingTime: {
                          '@type': 'QuantitativeValue',
                          minValue: 1,
                          maxValue: 3,
                          unitCode: 'DAY',
                        },
                        transitTime: {
                          '@type': 'QuantitativeValue',
                          minValue: 1,
                          maxValue: 5,
                          unitCode: 'DAY',
                        },
                      },
                    },
                    hasMerchantReturnPolicy: {
                      '@type': 'MerchantReturnPolicy',
                      applicableCountry: 'TH',
                      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                      merchantReturnDays: 7,
                      returnMethod: 'https://schema.org/ReturnByMail',
                      returnFees: 'https://schema.org/FreeReturn',
                    },
                    seller: {
                      '@type': 'Organization',
                      name: product.shop_name,
                    },
                  },
                },
              })),
            }),
          }}
        />
      )}

      {/* CollectionPage Structured Data */}
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${currentCategory.name} - ${websiteName}`,
            description: pageDescription,
            url: canonicalUrl,
            inLanguage: 'th-TH',
            isPartOf: {
              '@type': 'WebSite',
              name: websiteName,
              url: typeof window !== 'undefined' ? window.location.origin : 'https://www.shonra.com',
            },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: filteredProducts.length,
            },
          }),
        }}
      />

    <div className="min-h-screen bg-gray-50">
      {/* Custom Header with Search & Filter */}
      <header className="sticky top-0 z-50 bg-red-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row: Logo + Search + Filter */}
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
              onSubmit={handleSearch}
              className="flex-1 lg:flex lg:justify-center"
            >
              <div className="relative w-full lg:max-w-2xl">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-2 lg:py-2.5 bg-white rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-sm lg:text-base"
                />
                <button
                  type={searchQuery ? "button" : "submit"}
                  onClick={searchQuery ? clearSearch : undefined}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-600 hover:text-red-700 transition-colors"
                  title={searchQuery ? "Clear search" : "Search"}
                >
                  {searchQuery ? <X size={18} className="lg:w-5 lg:h-5" /> : <Search size={18} className="lg:w-5 lg:h-5" />}
                </button>
              </div>
            </form>

            {/* Filter Controls - Mobile & Desktop (Same UI) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center bg-red-700 rounded-lg p-1">
                <button
                  onClick={() => setSortBy('relevance')}
                  className={`px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-bold rounded transition ${
                    sortBy === 'relevance' ? 'bg-white text-red-600' : 'text-red-100 hover:text-white'
                  }`}
                >
                  Relevance
                </button>
                <button
                  onClick={() => setSortBy('price_asc')}
                  className={`px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-bold rounded transition flex items-center gap-0.5 lg:gap-1 ${
                    sortBy === 'price_asc' ? 'bg-white text-red-600' : 'text-red-100 hover:text-white'
                  }`}
                >
                  <ArrowDownWideNarrow size={10} className="lg:w-3 lg:h-3" /> <span className="hidden sm:inline">Price</span> ↑
                </button>
                <button
                  onClick={() => setSortBy('price_desc')}
                  className={`px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-bold rounded transition flex items-center gap-0.5 lg:gap-1 ${
                    sortBy === 'price_desc' ? 'bg-white text-red-600' : 'text-red-100 hover:text-white'
                  }`}
                >
                  <ArrowUpNarrowWide size={10} className="lg:w-3 lg:h-3" /> <span className="hidden sm:inline">Price</span> ↓
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Category Slider - Full Width for Sticky */}
      <CategorySlider
        categories={categories}
        activeCategory={currentCategory?.id || 'all'}
        onCategoryChange={(categoryId) => {
          // Navigate with router.push for SEO-friendly URLs
          if (categoryId === 'all') {
            // Go to homepage for "All" category
            router.push('/');
          } else {
            const category = categories.find(cat => cat.id === categoryId);
            if (category) {
              const categorySlug = category.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .trim();
              router.push(`/category/${categorySlug}`);
            }
          }
        }}
        getCategoryIcon={() => null}
      />

      {/* Info Bar - Fixed (แสดงตลอดเวลา) */}
      <div className="fixed top-[128px] left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Hidden H1 for SEO */}
          <h1 className="sr-only">สินค้าหมวดหมู่ {currentCategory.name} - {websiteName}</h1>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              {hasSearched ? (
                isSearching ? (
                  'กำลังค้นหา...'
                ) : (
                  <>ผลการค้นหา <span className="font-semibold">"{searchQuery}"</span> ({searchResults.length} รายการ)</>
                )
              ) : (
                <>แสดง <span className="font-semibold">{filteredProducts.length}</span> สินค้า</>
              )}
            </p>
            {hasSearched && (
              <button
                onClick={clearSearch}
                className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-1"
              >
                <X size={16} /> ล้างการค้นหา
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[120px] lg:pt-20 pb-6">

        {/* Products Grid */}
        {isSearching ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
                <div className="bg-gray-200 rounded-lg h-40 mb-3"></div>
                <div className="bg-gray-200 rounded h-4 mb-2"></div>
                <div className="bg-gray-200 rounded h-3 w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 lg:gap-4">
              {filteredProducts.slice(0, visibleCount).map((product, index) => (
              <ModernProductCard
                key={`${product.item_id}-${index}`}
                product={{
                  productName: product.product_name,
                  itemId: product.item_id,
                  price: product.price,
                  priceMin: product.price_min,
                  priceMax: product.price_max,
                  imageUrl: product.image_url,
                  ratingStar: product.rating_star,
                  ...(product.discount_rate && product.discount_rate > 0 && { priceDiscountRate: product.discount_rate }),
                  offerLink: product.offer_link,
                  shopName: product.shop_name,
                  shopId: product.shop_id,
                  productLink: product.product_link,
                  salesCount: product.sales_count,
                  commissionRate: product.commission_rate,
                  commission: product.commission_amount,
                  fromShopee: product.from_shopee,
                  commissionRateOriginal: product.commission_rate_original,
                  // Add missing fields for Shopee products
                  periodStartTime: (product as any).periodStartTime || 0,
                  periodEndTime: (product as any).periodEndTime || 0,
                  campaignActive: (product as any).campaignActive !== undefined ? (product as any).campaignActive : false,
                  sellerCommissionRate: (product as any).sellerCommissionRate,
                  shopeeCommissionRate: (product as any).shopeeCommissionRate,
                }}
              />
            ))}
            </div>

            {/* Loading indicator when lazy loading */}
            {visibleCount < filteredProducts.length && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <p className="text-sm text-gray-600 mt-2">กำลังโหลดสินค้าเพิ่มเติม...</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white p-20 rounded-2xl shadow-md text-center">
            <div className="text-6xl mb-4">
              {hasSearched ? '🔍' : '📦'}
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              {hasSearched ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้าในหมวดหมู่นี้'}
            </h2>
            <p className="text-gray-500 mb-6">
              {hasSearched 
                ? `ลองค้นหาด้วยคำอื่นหรือเลือกหมวดหมู่อื่น`
                : 'กรุณาตรวจสอบอีกครั้งในภายหลัง'
              }
            </p>
            {hasSearched ? (
              <button
                onClick={clearSearch}
                className="inline-block px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                ล้างการค้นหา
              </button>
            ) : (
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                เลือกหมวดหมู่อื่น
              </Link>
            )}
          </div>
        )}

        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-all"
            aria-label="Back to top"
          >
            <ArrowUp size={20} />
          </button>
        )}
      </div>
    </div>
    </>
  );
}
