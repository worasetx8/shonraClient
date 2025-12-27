'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Script from 'next/script';
import { 
  Menu, Sparkles, ArrowDownWideNarrow, ArrowUpNarrowWide, X,
  Lock, Zap, ArrowUp, ArrowDown, LayoutGrid, Home, Search, Tag, RefreshCw,
  ShoppingBag, Shirt, Heart, Dumbbell, Laptop, Smartphone, Gamepad2, Baby, Car, Music, BookOpen, Camera, Watch, Flame,
  ChevronLeft, ChevronRight, BadgePercent
} from 'lucide-react';
import { useToast } from '@chakra-ui/react';
import Link from 'next/link';
import ModernProductCard from '@/components/ModernProductCard';
import BannerAdsSlider from '@/components/BannerAdsSlider';
import CategorySlider from '@/components/CategorySlider';
import IconBannerList from '@/components/IconBannerList';
import StructuredData from '@/components/StructuredData';
import { generateMetaDescription } from '@/lib/aiSeoService';
import * as ClientAPI from '@/lib/client-api';

interface Product {
  productName: string;
  itemId: string;
  price: number;
  imageUrl: string;
  offerLink: string;
  priceMin?: number;
  priceMax?: number;
  ratingStar?: number;
  priceDiscountRate?: number;
  shopType?: string;
  // Flash Sale specific fields
  isFlashSale?: boolean;
  tag?: string;
  originalPrice?: number;
  soldPercentage?: number;
  soldCount?: number;
  discountRate?: number;
  commission?: number;
  commissionRate?: number;
  shopName?: string;
  salesCount?: number;
}

interface Category {
  id: number;
  name: string;
  is_active: number;
  product_count?: number;
}

interface Tag {
  id: number;
  name: string;
  is_active: number;
  product_count?: number;
}


export default function NewHomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [flashSaleBanner, setFlashSaleBanner] = useState<{
    image_url: string;
    target_url: string | null;
    alt_text: string | null;
    open_new_tab: boolean;
  } | null>(null);
  const [popupBanners, setPopupBanners] = useState<Array<{
    image_url: string;
    target_url: string | null;
    alt_text: string | null;
    open_new_tab: boolean;
  }>>([]);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
  const [isPopupBannerOpen, setIsPopupBannerOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashSaleLoading, setFlashSaleLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [websiteName, setWebsiteName] = useState<string>('SHONRA');
  
  // UI State
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [activeTags, setActiveTags] = useState<number[]>([]); // Multi-select tags
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFlashSaleModalOpen, setIsFlashSaleModalOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [shopeeSearchResults, setShopeeSearchResults] = useState<Product[]>([]); // Shopee API results
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingShopee, setIsSearchingShopee] = useState(false);
  const [sortOption, setSortOption] = useState<'relevance' | 'price_asc' | 'price_desc'>('relevance');
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(16); // จำนวนสินค้าที่แสดงต่อหน้า (load more)
  const [searchSettings, setSearchSettings] = useState({
    min_search_results: 10,
    min_commission_rate: 10,
    min_rating_star: 4.5
  });
  // Removed defaultCountdown state to prevent continuous re-renders
  const [hasMoreFlashSale, setHasMoreFlashSale] = useState<boolean>(false); // ตรวจสอบว่ามีสินค้า Flash Sale เพิ่มเติมหรือไม่
  const [bannerKey, setBannerKey] = useState<number>(0); // Key for forcing image reload
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false); // Loading state for auto-load
  const hasReadSearchParam = useRef<boolean>(false); // Track if we've read the search param from URL
  
  const scrollContainerRef = useRef<HTMLElement>(null);
  const flashSaleContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null); // Ref for Intersection Observer
  const toast = useToast();

  // Cookie helper functions
  const setCookie = useCallback((name: string, value: string, hours: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + hours * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }, []);

  const getCookie = useCallback((name: string): string | null => {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }, []);

  // Check if popup should be shown
  const shouldShowPopup = useCallback((): boolean => {
    const hidePopup = getCookie('hide_popup_banner');
    if (hidePopup === 'true') {
      const hideTime = parseInt(getCookie('hide_popup_banner_time') || '0');
      const now = Date.now();
      // 24 hours = 86400000 milliseconds
      if (now - hideTime < 86400000) {
        return false; // Still within 24 hours
      }
      // 24 hours passed, clear cookie
      setCookie('hide_popup_banner', '', -1);
      setCookie('hide_popup_banner_time', '', -1);
    }
    return true;
  }, [getCookie, setCookie]);

  // Fetch Popup Banner function - Support multiple banners
  const fetchPopupBanner = useCallback(async () => {
    try {
      // Check cookie first
      if (!shouldShowPopup()) {
        setPopupBanners([]);
        return;
      }

      const data = await ClientAPI.fetchBanners('Banner Popup');
      
      if (data.success && data.data) {
        // Handle both single banner (object) and multiple banners (array)
        // Backend now always returns array, but keep this check for safety
        const bannersData = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);
        
        if (bannersData.length === 0) {
          return; // No banners to show
        }
        
        const processedBanners = bannersData.map((banner: any) => {
          // Image URLs are already normalized by the API route to use Next.js proxy
          // Relative paths like /api/uploads/banners/... will work with both Next.js Image and regular img tags
          // since they're proxied through Next.js API routes
          return {
            image_url: banner.image_url, // Use URL as-is (already normalized by API route)
            target_url: banner.target_url || null,
            alt_text: banner.alt_text || 'Banner Popup',
            open_new_tab: banner.open_new_tab === 1 || banner.open_new_tab === true,
          };
        });
        
        setPopupBanners(processedBanners);
        setCurrentPopupIndex(0); // Reset to first banner
        
        // Show popup after a short delay for better UX
        if (processedBanners.length > 0) {
          setTimeout(() => {
            setIsPopupBannerOpen(true);
          }, 500);
        }
      } else {
        setPopupBanners([]);
      }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Popup Banner fetch error:', error);
        }
        setPopupBanners([]);
      }
  }, [shouldShowPopup]);

  // Slide navigation functions
  const goToNextSlide = useCallback(() => {
    setCurrentPopupIndex((prev) => (prev + 1) % popupBanners.length);
  }, [popupBanners.length]);

  const goToPrevSlide = useCallback(() => {
    setCurrentPopupIndex((prev) => (prev - 1 + popupBanners.length) % popupBanners.length);
  }, [popupBanners.length]);


  // Auto-play slider for popup banners
  useEffect(() => {
    if (!isPopupBannerOpen || popupBanners.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentPopupIndex((prev) => (prev + 1) % popupBanners.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isPopupBannerOpen, popupBanners.length]);

  // Update document metadata dynamically for SEO
  useEffect(() => {
    const pageTitle = `${websiteName} - ช็อปสินค้าออนไลน์ Shopee Affiliate ราคาดี ส่วนลดสูง`;
    const pageDescription = `ช็อปสินค้าคุณภาพดี ราคาถูก จาก Shopee ที่ ${websiteName} | สินค้าหลากหลายหมวดหมู่ โปรโมชั่นดีทุกวัน`;
    
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
    updateMetaTag('keywords', `shopee, affiliate, ส่วนลด, ช็อปออนไลน์, ${websiteName}, โปรโมชั่น`);
    updateMetaTag('og:title', pageTitle, true);
    updateMetaTag('og:description', pageDescription, true);
    updateMetaTag('og:url', typeof window !== 'undefined' ? window.location.href : 'https://www.shonra.com', true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:locale', 'th_TH', true);
    updateMetaTag('og:site_name', websiteName, true);
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', pageTitle, true);
    updateMetaTag('twitter:description', pageDescription, true);
    
    if (displayProducts.length > 0 && displayProducts[0].imageUrl) {
      updateMetaTag('og:image', displayProducts[0].imageUrl, true);
      updateMetaTag('twitter:image', displayProducts[0].imageUrl, true);
    }
  }, [websiteName, displayProducts]);

  // Handle popup close
  const handleClosePopup = useCallback(() => {
    setIsPopupBannerOpen(false);
    
    if (dontShowAgain) {
      // Set cookie to hide for 24 hours
      setCookie('hide_popup_banner', 'true', 24);
      setCookie('hide_popup_banner_time', Date.now().toString(), 24);
    }
    
    setDontShowAgain(false);
  }, [dontShowAgain, setCookie]);

  // Fetch Flash Sale Banner function
  const fetchFlashSaleBanner = useCallback(async () => {
    try {
      const data = await ClientAPI.fetchBanners('Flash Sale Banner');
      
      if (data.success && data.data) {
        // Backend returns array, so get first banner
        const banner = Array.isArray(data.data) ? data.data[0] : data.data;
        
        if (banner && banner.image_url) {
          // Image URLs are already normalized by the API route to use Next.js proxy
          // Relative paths like /api/uploads/banners/... will work with regular img tags
          // since they're proxied through Next.js API routes
          const imageUrl = banner.image_url;
          
          // Only update banner if URL actually changed to prevent unnecessary re-renders
          setFlashSaleBanner((prevBanner) => {
            // If banner URL hasn't changed, don't update (prevent re-render)
            if (prevBanner && prevBanner.image_url === imageUrl) {
              return prevBanner;
            }
            // Update banner key only when URL changes
            setBannerKey(prev => prev + 1);
            return {
              image_url: imageUrl, // Use URL as-is (already normalized by API route)
              target_url: banner.target_url || null,
              alt_text: banner.alt_text || 'Flash Sale Banner',
              open_new_tab: banner.open_new_tab === 1 || banner.open_new_tab === true,
            };
          });
        } else {
          // Banner data exists but no image_url - keep existing banner if any
          // Don't clear banner state to prevent flickering
        }
      } else {
        // ไม่มี banner active → keep existing banner if any
        // Don't clear banner state to prevent flickering
      }
    } catch (error) {
      console.error('Flash Sale Banner fetch error:', error);
      // Don't clear banner state on error to prevent flickering
      // Keep existing banner if any
    }
  }, []);

  // Fetch Flash Sale products function - memoized
  const fetchFlashSaleProducts = useCallback(async () => {
    setFlashSaleLoading(true);
    try {
      const data = await ClientAPI.fetchFlashSaleProducts({ limit: '20' });

      if (!data.success) {
        setFlashSaleProducts([]);
        return;
      }

      const productsArray = data.data || [];
      
      const filteredProducts = productsArray.filter((product: any) => 
        product.price && product.image_url && product.offer_link
      );

      // Find max sales count to normalize percentage
      const maxSales = filteredProducts.length > 0 
        ? Math.max(...filteredProducts.map((p: any) => p.sales_count || 0))
        : 1;

      // Helper: normalize period_end_time ที่อาจเป็น millisecond ให้มาอยู่ในหน่วยวินาที
      const normalizeEndTime = (raw: any, nowSec: number) => {
        if (typeof raw !== 'number' || !isFinite(raw)) return 0;
        // ถ้าตัวเลขใหญ่เกิน 2 พันล้าน แปลว่าน่าจะเป็น millisecond → แปลงเป็นวินาที
        if (raw > 2000000000) {
          return Math.floor(raw / 1000);
        }
        return raw;
      };

      const nowSec = Math.floor(Date.now() / 1000);

      const transformedProducts = filteredProducts.map((product: any) => {
        const salesCount = product.sales_count || 0;
        // Calculate percentage based on max sales in the list (0-100%)
        const soldPercentage = maxSales > 0 ? Math.min(100, Math.round((salesCount / maxSales) * 100)) : 0;

        const periodEndSec = normalizeEndTime(product.period_end_time, nowSec);

        return {
          productName: product.product_name || 'Unknown Product',
          itemId: product.item_id || '',
          price: product.price || 0,
          imageUrl: product.image_url || '',
          offerLink: product.offer_link || '',
          commission: product.commission_amount || 0,
          commissionRate: product.commission_rate || 0,
          shopName: product.shop_name || 'Unknown Shop',
          ratingStar: product.rating_star || 0,
          salesCount: salesCount,
          discountRate: product.discount_rate || 0,
          isFlashSale: true, // Mark as flash sale
          tag: 'Flash Sale',
          originalPrice: product.price * (1 + (product.discount_rate || 0) / 100),
          soldPercentage: soldPercentage, // Calculated from real sales count
          soldCount: salesCount, // Use real sales count from database
          periodEndTime: periodEndSec, // ใช้หน่วยวินาทีสำหรับ countdown
        };
      });

      setFlashSaleProducts(transformedProducts);
      
      // Removed default countdown reset
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Flash Sale products fetch error:', err);
      }
      setFlashSaleProducts([]);
    } finally {
      setFlashSaleLoading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const data = await ClientAPI.fetchCategories();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching categories:', err);
      }
    }
  }, []);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const data = await ClientAPI.fetchTags();
      if (data.success) {
        setTags(data.data || []);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching tags:', err);
      }
    }
  }, []);

  // Fetch settings (logo, website name, search settings)
  const fetchSettings = useCallback(async () => {
    try {
      const data = await ClientAPI.fetchSettings();
      if (data.success && data.data) {
          let logoUrl = data.data.logo_client_url || data.data.logo_url || null;
          
          // Convert relative path to full URL if needed
          if (logoUrl) {
            // Check if it's base64 data URI
            const isBase64 = logoUrl.startsWith('data:image/');
            
            // If it's a relative path (starts with /), convert to full backend URL
            if (!isBase64 && logoUrl.startsWith('/')) {
              const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.shonra.com';
              logoUrl = `${backendUrl}${logoUrl}`;
            }
            // If it's already a full URL (starts with http), use as is
            // If it's base64, use as is
          }
          
          setLogoUrl(logoUrl);
          setWebsiteName(data.data.website_name || 'SHONRA');
          
          // Generate AI meta description if enabled
          if (process.env.NEXT_PUBLIC_ENABLE_AI_SEO === 'true') {
            const content = `SHONRA Platform - ${data.data.website_name || 'SHONRA'} - All amazing deals, flash sales, and earn commissions`;
            generateMetaDescription({
              content,
              type: 'homepage',
              language: 'th',
            }).then((aiDescription) => {
              if (aiDescription) {
                // Update meta description
                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) {
                  metaDesc.setAttribute('content', aiDescription);
                }
                // Update Open Graph description
                const ogDesc = document.querySelector('meta[property="og:description"]');
                if (ogDesc) {
                  ogDesc.setAttribute('content', aiDescription);
                }
              }
            }).catch((err) => {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to generate AI meta description:', err);
              }
            });
          }
          
          // Update search settings from API
          setSearchSettings({
            min_search_results: data.data.min_search_results || 10,
            min_commission_rate: data.data.min_commission_rate || 10,
            min_rating_star: data.data.min_rating_star || 4.5
          });
        }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching settings:', err);
      }
    }
  }, []);

  // Load more products function
  const loadMoreProducts = useCallback(() => {
    if (isLoadingMore || !displayProducts.length) return;
    
    setIsLoadingMore(true);
    // Simulate slight delay for better UX
    setTimeout(() => {
      setVisibleCount((prev) => prev + 16);
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, displayProducts.length]);

  // Intersection Observer for auto-load when scroll reaches load more button
  useEffect(() => {
    if (!loadMoreRef.current || hasSearched) return; // Don't auto-load when searching

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore) {
          const canLoadMore = displayProducts.length > visibleCount;
          if (canLoadMore) {
            // Call loadMoreProducts directly without including it in dependencies
            setIsLoadingMore(true);
            setTimeout(() => {
              setVisibleCount((prev) => prev + 16);
              setIsLoadingMore(false);
            }, 300);
          }
        }
      },
      {
        root: null,
        rootMargin: '200px', // Start loading 200px before reaching the button
        threshold: 0.1,
      }
    );

    const currentRef = loadMoreRef.current;
    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [visibleCount, displayProducts.length, hasSearched, isLoadingMore]); // Removed loadMoreProducts from dependencies

  // Fetch products function
  const fetchProducts = useCallback(async (categoryId?: number | 'all', tagIds?: number[] | 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        status: 'active'
      });

      if (categoryId && categoryId !== 'all') {
        params.append('category_id', categoryId.toString());
      }

      if (tagIds && tagIds !== 'all') {
        if (Array.isArray(tagIds) && tagIds.length > 0) {
          // Support multiple tag IDs - send multiple params
          tagIds.forEach(tagId => {
            params.append('tag_id', tagId.toString());
          });
        }
      }

      const paramsObj = Object.fromEntries(params.entries());
      const data = await ClientAPI.fetchProducts(paramsObj);

      if (!data.success) {
        throw new Error(data.message || 'Error fetching products');
      }

      const productsArray = data.data || [];
      const transformedProducts = productsArray
        .filter((product: any) => product.price && product.image_url && product.offer_link)
        .map((product: any) => ({
          productName: product.product_name || 'Unknown Product',
          itemId: product.item_id || '',
          price: product.price || 0,
          imageUrl: product.image_url || '',
          offerLink: product.offer_link || '',
          priceMin: product.price_min,
          priceMax: product.price_max,
          ratingStar: product.rating_star,
          priceDiscountRate: product.discount_rate,
          shopType: product.shop_type,
          commission: product.commission_amount || 0,
          commissionRate: product.commission_rate || 0,
          shopName: product.shop_name || 'Unknown Shop',
          salesCount: product.sales_count || 0,
          isFlashSale: product.is_flash_sale || false,
        }));

      setProducts(transformedProducts);
      const shuffledProducts = shuffleArray([...transformedProducts]);
      setDisplayProducts(shuffledProducts);
      setVisibleCount(16); // รีเซ็ตจำนวนที่แสดงทุกครั้งที่โหลดสินค้าชุดใหม่

    } catch (err: any) {
      console.error('Error fetching products:', err);
      setProducts([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Utility functions
  const shuffleArray = (array: Product[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get category icon based on name
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('อิเล็กทรอนิก') || name.includes('electronic') || name.includes('tech')) return <Laptop size={16} />;
    if (name.includes('แฟชั่น') || name.includes('fashion') || name.includes('เสื้อผ้า')) return <Shirt size={16} />;
    if (name.includes('ความงาม') || name.includes('beauty') || name.includes('เครื่องสำอาง')) return <Heart size={16} />;
    if (name.includes('กีฬา') || name.includes('sport') || name.includes('ออกกำลังกาย')) return <Dumbbell size={16} />;
    if (name.includes('บ้าน') || name.includes('home') || name.includes('living')) return <Home size={16} />;
    if (name.includes('มือถือ') || name.includes('phone') || name.includes('smartphone')) return <Smartphone size={16} />;
    if (name.includes('เกม') || name.includes('game')) return <Gamepad2 size={16} />;
    if (name.includes('เด็ก') || name.includes('baby') || name.includes('kid')) return <Baby size={16} />;
    if (name.includes('รถ') || name.includes('car') || name.includes('auto')) return <Car size={16} />;
    if (name.includes('ดนตรี') || name.includes('music') || name.includes('audio')) return <Music size={16} />;
    if (name.includes('หนังสือ') || name.includes('book')) return <BookOpen size={16} />;
    if (name.includes('กล้อง') || name.includes('camera')) return <Camera size={16} />;
    if (name.includes('นาฬิกา') || name.includes('watch')) return <Watch size={16} />;
    return <ShoppingBag size={16} />; // Default icon
  };

  /**
   * Toggle tag selection (multi-select)
   * Automatically triggers product fetch with updated tags
   */
  const toggleTag = useCallback((tagId: number) => {
    setActiveTags((prev) => {
      const newTags = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      // Trigger fetchProducts with updated tags
      const tagsToUse = newTags.length > 0 ? newTags : 'all';
      fetchProducts(activeCategory, tagsToUse);
      
      return newTags;
    });
  }, [activeCategory]);

  /**
   * Filter products by category and/or tags
   * Updates active filters and triggers product fetch
   * Clears search when category changes
   */
  const filterProducts = useCallback((categoryId: number | 'all', tagIds?: number[]) => {
    // Clear search when changing category
    if (hasSearched || searchQuery.trim()) {
      setSearchQuery('');
      setHasSearched(false);
      setSearchResults([]);
      setShopeeSearchResults([]);
      setIsSearching(false);
      setIsSearchingShopee(false);
    }
    
    setActiveCategory(categoryId);
    if (tagIds !== undefined) {
      setActiveTags(tagIds);
      const tagsToUse = tagIds.length > 0 ? tagIds : 'all';
      fetchProducts(categoryId, tagsToUse);
    } else {
      const tagsToUse = activeTags.length > 0 ? activeTags : 'all';
      fetchProducts(categoryId, tagsToUse);
    }
  }, [activeTags, hasSearched, searchQuery]);

  // Search Shopee only (for product detail page redirect)
  const handleSearchShopeeOnly = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShopeeSearchResults([]);
      setIsSearching(false);
      setIsSearchingShopee(false);
      return;
    }

    // Switch to "All Items" category when searching
    setActiveCategory('all');
    setHasSearched(true);
    setIsSearching(false); // Not searching in database
    setIsSearchingShopee(true); // Searching in Shopee
    
    // Clear database results
    setSearchResults([]);
    
    try {
      // Search Shopee API directly
      const shopeeData = await ClientAPI.searchShopeeProducts({
        search: query,
        page: '1',
        commissionRate: String(searchSettings.min_commission_rate || 10),
        ratingStar: String(searchSettings.min_rating_star || 4.5)
      });

      // Backend wraps data in formatResponse, so structure is: data.data.productOfferV2.nodes
      const nodes = shopeeData.data?.data?.productOfferV2?.nodes || shopeeData.data?.productOfferV2?.nodes;
      
      if (shopeeData.success && nodes && nodes.length > 0) {
        const shopeeProducts = nodes
          .filter((product: any) => {
            const hasValidPrice = (product.price && product.price > 0) || 
                                 (product.priceMin && product.priceMin > 0) || 
                                 (product.priceMax && product.priceMax > 0);
            return product.itemId && product.productName && product.imageUrl && product.offerLink && hasValidPrice;
          })
          .map((product: any) => {
            const commissionRateFromAPI = parseFloat(product.commissionRate || 0);
            const sellerCommissionRate = parseFloat(product.sellerCommissionRate || 0);
            const commissionRateDecimal = commissionRateFromAPI > 0 ? commissionRateFromAPI : sellerCommissionRate;
            const commissionRatePercent = commissionRateDecimal * 100;
            
            let displayPrice = 0;
            if (product.priceMin && product.priceMin > 0) {
              displayPrice = product.priceMin;
            } else if (product.price && product.price > 0) {
              displayPrice = product.price;
            } else if (product.priceMax && product.priceMax > 0) {
              displayPrice = product.priceMax;
            }
            
            if (displayPrice === 0) {
              return null;
            }
            
            let commissionAmount = parseFloat(product.commission) || 0;
            if (commissionAmount === 0 && displayPrice > 0 && commissionRateDecimal > 0) {
              commissionAmount = displayPrice * commissionRateDecimal;
            }
            
            const commissionValue = commissionAmount > 0 ? commissionAmount : undefined;
            
            return {
              productName: product.productName || 'Unknown Product',
              itemId: product.itemId || '',
              price: displayPrice,
              imageUrl: product.imageUrl || '',
              offerLink: product.offerLink || '',
              priceMin: product.priceMin && product.priceMin > 0 ? product.priceMin : displayPrice,
              priceMax: product.priceMax && product.priceMax > 0 ? product.priceMax : displayPrice,
              ratingStar: product.ratingStar || 0,
              ...(product.priceDiscountRate && product.priceDiscountRate > 0 && { priceDiscountRate: product.priceDiscountRate }),
              shopType: product.shopType,
              ...(commissionValue !== undefined && { commission: commissionValue }),
              commissionRate: commissionRatePercent,
              shopName: product.shopName || 'Unknown Shop',
              salesCount: product.sales || 0,
              isFlashSale: false,
              fromShopee: true,
              shopId: product.shopId,
              productLink: product.productLink,
              ...(sellerCommissionRate > 0 && { sellerCommissionRate: sellerCommissionRate }),
              ...(product.shopeeCommissionRate && product.shopeeCommissionRate > 0 && { shopeeCommissionRate: product.shopeeCommissionRate }),
              ...(commissionRateDecimal > 0 && { commissionRateOriginal: commissionRateDecimal }),
              periodStartTime: product.periodStartTime || 0,
              periodEndTime: product.periodEndTime || 0,
              campaignActive: product.campaignActive !== undefined ? product.campaignActive : false,
            };
          });

        const validProducts = shopeeProducts.filter((p: any) => p !== null);
        if (validProducts.length > 0) {
          setShopeeSearchResults(validProducts);
        } else {
          setShopeeSearchResults([]);
        }
      } else {
        setShopeeSearchResults([]);
      }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Shopee search error:', error);
        }
        setShopeeSearchResults([]);
    } finally {
      setIsSearchingShopee(false);
    }
  }, [searchSettings]);

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShopeeSearchResults([]);
      setIsSearching(false);
      setIsSearchingShopee(false);
      return;
    }

    // Switch to "All Items" category when searching
    setActiveCategory('all');
    setHasSearched(true);
    setIsSearching(true);
    try {
      // 1. Search in our database first
      const params = new URLSearchParams({
        search: query,
        limit: '50'
      });

      const paramsObj = Object.fromEntries(params.entries());
      const data = await ClientAPI.fetchProducts(paramsObj);

      if (data.success) {
        const transformedResults = (data.data || [])
          .filter((product: any) => product.price && product.image_url && product.offer_link)
          .map((product: any) => ({
            productName: product.product_name || 'Unknown Product',
            itemId: product.item_id || '',
            price: product.price || 0,
            imageUrl: product.image_url || '',
            offerLink: product.offer_link || '',
            priceMin: product.price_min,
            priceMax: product.price_max,
            ratingStar: product.rating_star,
            priceDiscountRate: product.discount_rate,
            shopType: product.shop_type,
            commission: product.commission_amount || 0,
            commissionRate: product.commission_rate || 0,
            shopName: product.shop_name || 'Unknown Shop',
            salesCount: product.sales_count || 0,
            isFlashSale: product.is_flash_sale || false,
            fromShopee: false, // Mark as from our database
          }));
        setSearchResults(transformedResults);

        // 2. If results < min_search_results, search Shopee API
        const minResults = searchSettings.min_search_results || 10;
        if (transformedResults.length < minResults) {
          setIsSearchingShopee(true);
          try {
            // Use ClientAPI to call backend directly
            const shopeeData = await ClientAPI.searchShopeeProducts({
              search: query,
              page: '1',
              commissionRate: String(searchSettings.min_commission_rate || 10),
              ratingStar: String(searchSettings.min_rating_star || 4.5)
            });


            // Backend wraps data in formatResponse, so structure is: data.data.productOfferV2.nodes
            const nodes = shopeeData.data?.data?.productOfferV2?.nodes || shopeeData.data?.productOfferV2?.nodes;
            
            if (shopeeData.success && nodes && nodes.length > 0) {
              // Backend already filters, so we just map the data
              // Only filter out products with missing required fields
              const shopeeProducts = nodes
                .filter((product: any) => {
                  // Only filter out products with missing essential fields
                  // Also check if product has valid price (price, priceMin, or priceMax > 0)
                  const hasValidPrice = (product.price && product.price > 0) || 
                                       (product.priceMin && product.priceMin > 0) || 
                                       (product.priceMax && product.priceMax > 0);
                  return product.itemId && product.productName && product.imageUrl && product.offerLink && hasValidPrice;
                })
                .map((product: any) => {
                  // Shopee API has both commissionRate and sellerCommissionRate
                  // Both are in decimal format (0.1 = 10%)
                  // Backend uses commissionRate for commission_rate column
                  // Use commissionRate from API directly (already in decimal)
                  const commissionRateFromAPI = parseFloat(product.commissionRate || 0);
                  const sellerCommissionRate = parseFloat(product.sellerCommissionRate || 0);
                  
                  // Use commissionRate from API if available, otherwise fallback to sellerCommissionRate
                  // This matches backend behavior
                  const commissionRateDecimal = commissionRateFromAPI > 0 ? commissionRateFromAPI : sellerCommissionRate;
                  const commissionRatePercent = commissionRateDecimal * 100; // Convert to percentage for display
                  
                  // Use priceMin if price is 0 or undefined, otherwise use price
                  // Try priceMin first, then price, then priceMax
                  let displayPrice = 0;
                  if (product.priceMin && product.priceMin > 0) {
                    displayPrice = product.priceMin;
                  } else if (product.price && product.price > 0) {
                    displayPrice = product.price;
                  } else if (product.priceMax && product.priceMax > 0) {
                    displayPrice = product.priceMax;
                  }
                  
                  // Skip products with no valid price
                  if (displayPrice === 0) {
                    return null;
                  }
                  
                  // Calculate commission amount if not provided or is 0
                  // Commission = price * commissionRate (in decimal)
                  let commissionAmount = parseFloat(product.commission) || 0;
                  if (commissionAmount === 0 && displayPrice > 0 && commissionRateDecimal > 0) {
                    commissionAmount = displayPrice * commissionRateDecimal;
                  }
                  
                  // Only include commission if it's greater than 0
                  const commissionValue = commissionAmount > 0 ? commissionAmount : undefined;
                  
                  return {
                    productName: product.productName || 'Unknown Product',
                    itemId: product.itemId || '',
                    price: displayPrice,
                    imageUrl: product.imageUrl || '',
                    offerLink: product.offerLink || '',
                    priceMin: product.priceMin && product.priceMin > 0 ? product.priceMin : displayPrice,
                    priceMax: product.priceMax && product.priceMax > 0 ? product.priceMax : displayPrice,
                    ratingStar: product.ratingStar || 0,
                    ...(product.priceDiscountRate && product.priceDiscountRate > 0 && { priceDiscountRate: product.priceDiscountRate }),
                    shopType: product.shopType,
                    ...(commissionValue !== undefined && { commission: commissionValue }),
                    commissionRate: commissionRatePercent, // Convert to percentage for display
                    shopName: product.shopName || 'Unknown Shop',
                    salesCount: product.sales || 0,
                    isFlashSale: false,
                    fromShopee: true, // Mark as from Shopee API
                    // Additional Shopee fields - include all fields from API
                    shopId: product.shopId,
                    productLink: product.productLink,
                    ...(sellerCommissionRate > 0 && { sellerCommissionRate: sellerCommissionRate }),
                    ...(product.shopeeCommissionRate && product.shopeeCommissionRate > 0 && { shopeeCommissionRate: product.shopeeCommissionRate }),
                    // Store original commissionRate from API (decimal) for saving
                    ...(commissionRateDecimal > 0 && { commissionRateOriginal: commissionRateDecimal }),
                    periodStartTime: product.periodStartTime || 0, // Include from API
                    periodEndTime: product.periodEndTime || 0, // Include from API
                    campaignActive: product.campaignActive !== undefined ? product.campaignActive : false, // Include from API if available
                  };
                });

              
              // Filter out null values (products with invalid price)
              const validProducts = shopeeProducts.filter((p: any) => p !== null);
              if (validProducts.length > 0) {
                setShopeeSearchResults(validProducts);
              } else {
                setShopeeSearchResults([]);
              }
            } else {
              setShopeeSearchResults([]);
            }
          } catch (shopeeError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Shopee search error:', shopeeError);
            }
            // Don't show error toast for Shopee search, just log it
            setShopeeSearchResults([]);
          } finally {
            setIsSearchingShopee(false);
          }
        } else {
          setShopeeSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search products',
        status: 'error',
        duration: 3000,
      });
    }
    setIsSearching(false);
  }, [toast, searchSettings]);

  const onSearchSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
    setSearchResults([]);
    setShopeeSearchResults([]); // Clear Shopee search results
    setIsSearching(false);
    setIsSearchingShopee(false); // Clear Shopee searching state
    setVisibleCount(16); // รีเซ็ตจำนวนที่แสดง
    
    // Remove search and shopee query parameters from URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('search');
      url.searchParams.delete('shopee');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
    
    // Reset the flag so we can read search param again if user navigates back
    hasReadSearchParam.current = false;
    pendingSearchRef.current = null; // Clear pending search
    
    // Reload all products to show default view
    fetchProducts(activeCategory, activeTags.length > 0 ? activeTags : 'all');
  };

  // Store search params from URL
  const pendingSearchRef = useRef<{ query: string; shopeeOnly: boolean } | null>(null);

  // Check for search query parameter on mount (only once)
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasReadSearchParam.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      const shopeeOnly = urlParams.get('shopee') === 'true';
      
      if (searchParam && searchParam.trim()) {
        hasReadSearchParam.current = true; // Mark as read
        setSearchQuery(searchParam.trim());
        pendingSearchRef.current = { query: searchParam.trim(), shopeeOnly };
      }
    }
  }, []); // Only run once on mount

  // Trigger search when data is loaded
  useEffect(() => {
    if (pendingSearchRef.current && (products.length > 0 || !loading)) {
      const { query, shopeeOnly } = pendingSearchRef.current;
      
      // Clear pending search
      pendingSearchRef.current = null;
      
      if (shopeeOnly) {
        // Search Shopee only (from product detail page redirect)
        handleSearchShopeeOnly(query);
      } else {
        // Normal search (database first, then Shopee if needed)
        handleSearch(query);
      }
    }
  }, [products.length, loading, handleSearch, handleSearchShopeeOnly]);

  // Effects
  useEffect(() => {
    // Optimize API calls: Run independent calls in parallel
    // Critical data first, then product data, then flash sale data
    const loadData = async () => {
      try {
        // First batch - critical data (can run in parallel)
        await Promise.all([
          fetchSettings(),
          fetchCategories(),
          fetchTags(),
        ]);
        
        // Second batch - product data (can run in parallel with flash sale)
        await Promise.all([
          fetchProducts('all', 'all'),
          fetchFlashSaleProducts(),
          fetchFlashSaleBanner(),
          fetchPopupBanner(),
        ]);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error loading initial data:', error);
        }
      }
    };
    
    loadData();
  }, [fetchSettings, fetchCategories, fetchTags, fetchProducts, fetchFlashSaleProducts, fetchFlashSaleBanner, fetchPopupBanner]);

  // Memoize sorted products - use products directly to prevent infinite loops
  const sortedProducts = useMemo(() => {
    if (hasSearched) {
      // When searching, use search results directly
      return shopeeSearchResults.length > 0 ? shopeeSearchResults : searchResults;
    }
    
    // Always use products array directly, not displayProducts
    if (sortOption === 'price_asc' || sortOption === 'price_desc') {
      if (products.length === 0) return products;
      return [...products].sort((a, b) => {
        if (sortOption === 'price_asc') {
          return (a.price || 0) - (b.price || 0);
        } else {
          return (b.price || 0) - (a.price || 0);
        }
      });
    } else if (sortOption === 'relevance') {
      if (products.length === 0) return products;
      return shuffleArray([...products]);
    }
    return products;
  }, [sortOption, hasSearched, products, shopeeSearchResults, searchResults]);

  // Update displayProducts when source data or sort option changes
  useEffect(() => {
    setDisplayProducts(sortedProducts);
  }, [sortedProducts]);


  // Removed global timer tick to prevent continuous re-renders
  // Countdown timer is now static - only shows initial time from database

  // ตรวจสอบว่ามีสินค้า Flash Sale เพิ่มเติมด้านล่างหรือไม่
  useEffect(() => {
    const container = flashSaleContainerRef.current;
    if (!container) return;

    // Use requestAnimationFrame to batch DOM reads and avoid forced reflow
    const checkScroll = () => {
      requestAnimationFrame(() => {
        // Batch all DOM reads together
        const { scrollTop, scrollHeight, clientHeight } = container;
        // ถ้ายัง scroll ได้อีก (มีเนื้อหาเพิ่มเติม) และยังไม่ scroll ถึงด้านล่าง
        const hasMore = scrollHeight > clientHeight && scrollTop + clientHeight < scrollHeight - 10;
        setHasMoreFlashSale(hasMore);
      });
    };

    // ตรวจสอบเมื่อ scroll
    container.addEventListener('scroll', checkScroll);
    // ตรวจสอบเมื่อโหลดสินค้าใหม่
    checkScroll();

    // ตรวจสอบอีกครั้งหลังจาก render
    const timeout = setTimeout(checkScroll, 100);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      clearTimeout(timeout);
    };
  }, [flashSaleProducts, flashSaleLoading]);

  /**
   * Format seconds to HH:MM:SS format
   * Used for Flash Sale countdown timer
   */
  const formatCountdown = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // Scroll listener for back to top
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Use requestAnimationFrame to batch DOM reads and avoid forced reflow
    const handleScroll = () => {
      requestAnimationFrame(() => {
        setShowBackToTop(container.scrollTop > 400);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Product List Structured Data */}
      {displayProducts.length > 0 && (
        <Script
          id="product-list-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              numberOfItems: displayProducts.length,
              itemListElement: displayProducts.slice(0, 20).map((product, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'Product',
                  '@id': `${typeof window !== 'undefined' ? window.location.origin : 'https://www.shonra.com'}/product/${product.itemId}`,
                  name: product.productName,
                  description: `${product.productName} - ${product.shopName || 'Shopee'}`,
                  image: product.imageUrl,
                  url: `/product/${product.itemId}`,
                  ...(product.shopName && {
                    brand: {
                      '@type': 'Brand',
                      name: product.shopName,
                    },
                  }),
                  ...(product.ratingStar && product.ratingStar > 0 && {
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: product.ratingStar,
                      bestRating: 5,
                      worstRating: 1,
                      ratingCount: product.salesCount || 1,
                    },
                  }),
                  offers: {
                    '@type': 'Offer',
                    price: product.price,
                    priceCurrency: 'THB',
                    availability: 'https://schema.org/InStock',
                    url: product.offerLink,
                    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    description: `${product.productName} - ส่งฟรีทั่วไทย`,
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
                    ...(product.shopName && {
                      seller: {
                        '@type': 'Organization',
                        name: product.shopName,
                      },
                    }),
                  },
                },
              })),
            }),
          }}
        />
      )}

      {/* Flash Sale Products Structured Data */}
      {flashSaleProducts.length > 0 && (
        <Script
          id="flash-sale-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'Flash Sale Products',
              description: 'สินค้าลดราคาพิเศษ',
              numberOfItems: flashSaleProducts.length,
              itemListElement: flashSaleProducts.slice(0, 10).map((product, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'Product',
                  name: product.productName,
                  image: product.imageUrl,
                  offers: {
                    '@type': 'Offer',
                    price: product.price,
                    priceCurrency: 'THB',
                    availability: 'https://schema.org/InStock',
                    priceValidUntil: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    description: `${product.productName} - ส่งฟรีทั่วไทย`,
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
                  },
                },
              })),
            }),
          }}
        />
      )}

      {/* WebPage Structured Data */}
      <Script
        id="webpage-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `${websiteName} - ช็อปสินค้าออนไลน์ Shopee Affiliate`,
            description: `ช็อปสินค้าคุณภาพดี ราคาถูก จาก Shopee ที่ ${websiteName}`,
            url: typeof window !== 'undefined' ? window.location.href : 'https://www.shonra.com',
            inLanguage: 'th-TH',
            isPartOf: {
              '@type': 'WebSite',
              '@id': `${typeof window !== 'undefined' ? window.location.origin : 'https://www.shonra.com'}/#website`,
            },
            ...(displayProducts.length > 0 && {
              mainEntity: {
                '@type': 'ItemList',
                numberOfItems: displayProducts.length,
              },
            }),
          }),
        }}
      />

    <div className="h-screen flex flex-col lg:flex-row bg-gray-50 overflow-hidden">
      {/* Structured Data for SEO */}
      <StructuredData type="Organization" />
      <StructuredData type="WebSite" />
      
      {/* LEFT SIDEBAR (Desktop) / Mobile Menu */}
      <aside className={`
        lg:w-72 bg-white border-r border-gray-200 flex-col shadow-lg
        ${isMobileMenuOpen ? 'fixed inset-0 z-50 flex' : 'hidden lg:flex'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 bg-red-600 flex items-center justify-between px-4 shadow-md">
          <button 
            onClick={() => {
              // Clear all filters and reset to home state
              setActiveCategory('all');
              setActiveTags([]);
              setSearchQuery('');
              setHasSearched(false);
              setSearchResults([]);
              setShopeeSearchResults([]);
              setIsSearching(false);
              setIsSearchingShopee(false);
              setVisibleCount(16);
              fetchProducts('all', 'all');
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
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
            <span className="text-white font-bold text-xl logo-font">{websiteName}</span>
          </button>
          
          {/* Mobile close button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="lg:hidden text-white hover:bg-red-700 p-2 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content - Only Banner Ads */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          {/* Banner Ads Slider */}
          <div className="flex-shrink-0 p-4 pb-0">
            <BannerAdsSlider autoPlayInterval={5000} />
          </div>

          {/* Icon Banners */}
          <div className="flex-shrink-0">
            <IconBannerList />
          </div>

          {/* Spacer for pushing content to bottom */}
          <div className="flex-1"></div>

          {/* Banner Spacial - Bottom */}
          <div className="flex-shrink-0 px-4 pb-3">
            <BannerAdsSlider positionName="Banner Spacial" autoPlayInterval={5000} />
          </div>

          {/* Version Info */}
          <div className="flex-shrink-0 py-3 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Version</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700">1.0.0</span>
            </div>
          </div>

          {/* Version Info */}
          {/* {tags.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tags</h3>
                {activeTags.length > 0 && (
                  <button
                    onClick={() => {
                      setActiveTags([]);
                      fetchProducts(activeCategory, 'all');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {tags.map((tag) => {
                  const isSelected = activeTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        toggleTag(tag.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors
                        ${isSelected
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                          : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                        }
                      `}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600' 
                          : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-sm flex-1 truncate">{tag.name}</span>
                      {tag.product_count !== undefined && tag.product_count > 0 && (
                        <span className="text-xs text-gray-400 flex-shrink-0">({tag.product_count})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )} */}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-red-600 shadow-lg flex items-center px-4 lg:px-6 gap-4 z-40">
          
          {/* Mobile Logo & Search */}
          <div className="flex items-center gap-3 lg:hidden flex-1">
            {/* Mobile Logo */}
            <button 
              onClick={() => {
                // Clear all filters and reset to home state
                setActiveCategory('all');
                setActiveTags([]);
                setSearchQuery('');
                setHasSearched(false);
                setSearchResults([]);
                setShopeeSearchResults([]);
                setIsSearching(false);
                setIsSearchingShopee(false);
                setVisibleCount(16);
                fetchProducts('all', 'all');
              }}
              className="flex items-center gap-2 flex-shrink-0 hover:opacity-90 transition-opacity"
            >
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
            </button>
            
            {/* Mobile Search Bar */}
            <form onSubmit={onSearchSubmit} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-2 rounded-lg border border-red-300 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                />
                <button
                  type={searchQuery ? "button" : "submit"}
                  onClick={searchQuery ? clearSearch : undefined}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-red-600 hover:text-red-700 transition-colors"
                  title={searchQuery ? "Clear search" : "Search"}
                >
                  {searchQuery ? <X size={20} /> : <Search size={20} />}
                </button>
              </div>
            </form>
          </div>

          {/* Desktop Search Bar - Centered and Expanded */}
          <div className="hidden lg:flex flex-1 justify-center px-4">
            <form onSubmit={onSearchSubmit} className="w-full max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-red-300 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent shadow-sm"
                />
                <button
                  type={searchQuery ? "button" : "submit"}
                  onClick={searchQuery ? clearSearch : undefined}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-red-600 hover:text-red-700 transition-colors"
                  title={searchQuery ? "Clear search" : "Search"}
                >
                  {searchQuery ? <X size={20} /> : <Search size={20} />}
                </button>
              </div>
            </form>
          </div>

          {/* Filter Controls */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center bg-red-700 rounded-lg p-1">
              <button
                onClick={() => setSortOption('relevance')}
                className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                  sortOption === 'relevance' ? 'bg-white text-red-600' : 'text-red-100 hover:text-white'
                }`}
              >
                Relevance
              </button>
              <button
                onClick={() => setSortOption('price_asc')}
                className={`px-3 py-1.5 text-xs font-bold rounded transition flex items-center gap-1 ${
                  sortOption === 'price_asc' ? 'bg-white text-red-600' : 'text-red-100 hover:text-white'
                }`}
              >
                <ArrowDownWideNarrow size={12} /> Price ↑
              </button>
              <button
                onClick={() => setSortOption('price_desc')}
                className={`px-3 py-1.5 text-xs font-bold rounded transition flex items-center gap-1 ${
                  sortOption === 'price_desc' ? 'bg-white text-red-600' : 'text-red-100 hover:text-white'
                }`}
              >
                <ArrowUpNarrowWide size={12} /> Price ↓
              </button>
            </div>
          </div>

          {/* Mobile Filter Button - Removed (filter is in sidebar) */}
        </header>

        {/* Category Slider - Below Header */}
        <CategorySlider
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={(categoryId) => {
            filterProducts(categoryId, activeTags);
          }}
          getCategoryIcon={getCategoryIcon}
        />

        {/* CONTENT AREA */}
        <section 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-gray-50"
        >
          <div className="p-4 lg:p-6 pt-[70px] lg:pt-6">
            {/* SEO H1 - Hidden but accessible */}
            <h1 className="sr-only">{websiteName} - ช็อปสินค้าออนไลน์ Shopee Affiliate ราคาดี ส่วนลดสูง</h1>
            
            {/* Search Results Header */}
            {hasSearched && (searchResults.length > 0 || shopeeSearchResults.length > 0) && (
              <div className="mb-6 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">
                    Search Results ({shopeeSearchResults.length > 0 ? shopeeSearchResults.length : searchResults.length})
                  </h2>
                  <button
                    onClick={clearSearch}
                    className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-1"
                  >
                    <X size={16} /> Clear Search
                  </button>
                </div>
              </div>
            )}

            {/* Products Grid */}
            {loading || (isSearching && !isSearchingShopee) ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
                    <div className="bg-gray-200 rounded-lg h-40 mb-3"></div>
                    <div className="bg-gray-200 rounded h-4 mb-2"></div>
                    <div className="bg-gray-200 rounded h-3 w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {(() => {
                  const isSearchingByKeyword = hasSearched;

                  // กรณีมีการค้นหา: ถ้า query Shopee แล้ว → แสดง Shopee results, ถ้าไม่ → แสดง database results
                  if (isSearchingByKeyword) {
                    // โหลดจาก Shopee อยู่
                    if (isSearchingShopee) {
                      return (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
                              <div className="bg-gray-200 rounded-lg h-40 mb-3"></div>
                              <div className="bg-gray-200 rounded h-4 mb-2"></div>
                              <div className="bg-gray-200 rounded h-3 w-2/3"></div>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // ถ้ามี Shopee results → แสดง Shopee results (เพราะ query มาเพื่อเพิ่มเติม)
                    if (shopeeSearchResults.length > 0) {
                      return (
                        <div className="grid grid-cols-2 gap-2 pb-16 lg:pb-4 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
                          {shopeeSearchResults.map((product) => (
                            <ModernProductCard key={product.itemId} product={product} />
                          ))}
                        </div>
                      );
                    }

                    // ถ้าไม่มี Shopee results → แสดง database results (ถ้ามี)
                    if (searchResults.length > 0) {
                      return (
                        <div className="grid grid-cols-2 gap-2 pb-16 lg:pb-4 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
                          {searchResults.map((product) => (
                            <ModernProductCard key={product.itemId} product={product} />
                          ))}
                        </div>
                      );
                    }

                    // กำลังค้นหาแต่ไม่มีผลลัพธ์เลย (ทั้งในระบบและ Shopee)
                    return (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-6 bg-white rounded-full mb-4">
                          <Sparkles size={48} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No products found</h3>
                        <p className="text-gray-500 mb-4">Try adjusting your search or filters.</p>
                        <button
                          onClick={() => {
                            clearSearch();
                            filterProducts('all', []);
                          }}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                        >
                          Clear Filters
                        </button>
                      </div>
                    );
                  }

                  // กรณีไม่ได้ค้นหา: แสดงสินค้าของเราเองตามปกติ + ปุ่ม Load More
                  if (displayProducts.length > 0) {
                    const visibleProducts = displayProducts.slice(0, visibleCount);
                    const canLoadMore = displayProducts.length > visibleCount;

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2 pb-16 lg:pb-4 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
                          {visibleProducts.map((product) => (
                            <ModernProductCard key={product.itemId} product={product} />
                          ))}
                        </div>
                        {canLoadMore && (
                          <div 
                            ref={loadMoreRef}
                            className="flex flex-col items-center justify-center mt-8 mb-4"
                          >
                            {isLoadingMore ? (
                              <div className="flex items-center gap-3 text-gray-600">
                                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm font-medium">กำลังโหลดสินค้าเพิ่มเติม...</span>
                              </div>
                            ) : (
                              <button
                                onClick={loadMoreProducts}
                                className="group relative px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                              >
                                <span className="relative z-10 flex items-center gap-2">
                                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                  โหลดสินค้าเพิ่มเติม
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              </button>
                            )}
                            <p className="text-xs text-gray-500 mt-3">
                              แสดง {visibleProducts.length} จาก {displayProducts.length} รายการ
                            </p>
                          </div>
                        )}
                      </>
                    );
                  }

                  // ไม่มีสินค้าเลย
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="p-6 bg-white rounded-full mb-4">
                        <Sparkles size={48} className="text-gray-300" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No products found</h3>
                      <p className="text-gray-500 mb-4">Try adjusting your search or filters.</p>
                      <button
                        onClick={() => {
                          clearSearch();
                          filterProducts('all', []);
                        }}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                      >
                        Clear Filters
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </section>

        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-all"
          >
            <ArrowUp size={20} />
          </button>
        )}
      </main>

      {/* RIGHT SIDEBAR - Flash Deals (Desktop) */}
      <aside className="hidden lg:flex w-80 bg-white border-l border-gray-200 flex-col shadow-lg">
        {/* Flash Sale Banner - Always Show at Top */}
        <div className="w-full flex-shrink-0 relative z-0">
          {flashSaleBanner && flashSaleBanner.image_url ? (
            flashSaleBanner.target_url && flashSaleBanner.target_url.trim() !== '' ? (
              <a
                href={flashSaleBanner.target_url}
                className="block cursor-pointer relative z-10"
                onClick={(e) => {
                  e.preventDefault();
                  if (flashSaleBanner.target_url && flashSaleBanner.target_url.trim() !== '') {
                    window.location.href = flashSaleBanner.target_url;
                  }
                }}
              >
                <img 
                  key={bannerKey}
                  src={flashSaleBanner.image_url} 
                  alt={flashSaleBanner.alt_text || "Flash Sale Banner"}
                  className="w-full h-auto object-cover pointer-events-none"
                  width={320}
                  height={180}
                  loading="eager"
                  draggable="false"
                  onError={(e) => {
                    // Handle image loading errors gracefully
                    console.error('Failed to load flash sale banner image:', flashSaleBanner.image_url);
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-full h-16 bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center';
                    placeholder.innerHTML = '<span class="text-white font-bold text-base">Flash Sale</span>';
                    target.parentElement?.appendChild(placeholder);
                  }}
                />
              </a>
            ) : (
              <img 
                key={bannerKey}
                src={flashSaleBanner.image_url} 
                alt={flashSaleBanner.alt_text || "Flash Sale Banner"}
                className="w-full h-auto object-cover"
                width={320}
                height={180}
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const placeholder = document.createElement('div');
                  placeholder.className = 'w-full h-16 bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center';
                  placeholder.innerHTML = '<span class="text-white font-bold text-base">Flash Sale</span>';
                  target.parentElement?.appendChild(placeholder);
                }}
              />
            )
          ) : (
            <div className="w-full h-16 bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-base">Flash Sale</span>
            </div>
          )}
        </div>

        {/* Flash Deals Content - Scrollable */}
        <div 
          ref={flashSaleContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide relative"
        >
          {/* Products Container */}
          <div className="p-3">
          {flashSaleLoading ? (
            // Loading skeleton - 2 columns
            <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2 animate-pulse">
                <div className="w-full aspect-square bg-gray-200 rounded-lg mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
            </div>
          ) : flashSaleProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
            {flashSaleProducts.map((product, index) => {
              const endTime = (product as any).periodEndTime || 0;
              const nowSec = Math.floor(Date.now() / 1000);
              let remaining: number;

              if (endTime > 0 && endTime > nowSec) {
                remaining = Math.max(endTime - nowSec, 0);
              } else {
                remaining = 0;
              }

              return (
              <a
                key={product.itemId || index}
                href={product.offerLink}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = product.offerLink;
                }}
                className="block bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition"
              >
                <div className="relative">
                  <img 
                    src={product.imageUrl} 
                    alt={product.productName}
                    className="w-full aspect-square object-cover"
                  />
                  {/* Discount Badge */}
                  {product.discountRate && product.discountRate > 0 && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] px-2 py-1 font-bold">
                      -{product.discountRate}%
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h4 className="text-xs font-medium text-gray-900 mb-1 overflow-hidden" style={{ 
                    height: '2.5rem',
                    lineHeight: '1.25rem'
                  }}>
                    {product.productName}
                  </h4>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-red-600 font-bold text-sm">
                      ฿{product.price?.toLocaleString()}
                    </span>
                    {product.originalPrice && product.originalPrice !== product.price && (
                      <span className="text-gray-400 line-through text-[10px]">
                        ฿{product.originalPrice?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {remaining > 0 && (
                    <div className="text-[10px] text-red-600 font-semibold mb-1">
                      ⏱ {formatCountdown(remaining)}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-red-600 h-1.5 rounded-full transition-all" 
                        style={{ width: `${product.soldPercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {product.soldCount?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </a>
            );
            })}
            </div>
          ) : (
            // No Flash Sale products
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">⚡</div>
              <p className="text-sm">No Flash Sale products available</p>
              <p className="text-xs mt-1">Check back later!</p>
            </div>
          )}
          </div>
          
          {/* Scroll Indicator - แสดงเมื่อมีสินค้าเพิ่มเติมด้านล่าง */}
          {hasMoreFlashSale && (
            <div className="sticky bottom-0 left-0 right-0 pointer-events-none z-10">
              {/* Gradient Fade */}
              <div className="h-16 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
              {/* Scroll Indicator */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                <div className="flex flex-col items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-gray-200">
                  <ArrowDown className="w-4 h-4 text-red-600 animate-bounce" />
                  <span className="text-xs text-gray-600 font-medium">เลื่อนดูเพิ่ม</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Flash Sale Modal - Mobile Only */}
      {isFlashSaleModalOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsFlashSaleModalOpen(false)}
        >
          {/* Modal Content */}
          <div 
            className="w-full max-w-lg max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Top Right Corner */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFlashSaleModalOpen(false);
              }}
              className="absolute top-2 right-2 z-30 p-1.5 bg-white/95 hover:bg-white text-gray-700 hover:text-red-600 rounded-full shadow-lg transition-all hover:scale-110 backdrop-blur-sm border border-gray-200"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
            
            {/* Flash Sale Banner - Fixed at Top */}
            <div className="w-full flex-shrink-0 relative">
              {flashSaleBanner && flashSaleBanner.image_url ? (
                flashSaleBanner.target_url && flashSaleBanner.target_url.trim() !== '' ? (
                  <a
                    href={flashSaleBanner.target_url}
                    className="block cursor-pointer relative z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      if (flashSaleBanner.target_url && flashSaleBanner.target_url.trim() !== '') {
                        window.location.href = flashSaleBanner.target_url;
                      }
                    }}
                  >
                    <img 
                      key={bannerKey}
                      src={flashSaleBanner.image_url} 
                      alt={flashSaleBanner.alt_text || "Flash Sale Banner"}
                      className="w-full h-auto object-cover pointer-events-none"
                      width={640}
                      height={360}
                      loading="eager"
                      draggable="false"
                      onError={(e) => {
                        // Handle image loading errors gracefully
                        console.error('Failed to load flash sale banner image:', flashSaleBanner.image_url);
                        // If image fails to load, show placeholder
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const placeholder = document.createElement('div');
                        placeholder.className = 'w-full h-16 bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center';
                        placeholder.innerHTML = '<span class="text-white font-bold text-base">Flash Sale</span>';
                        target.parentElement?.appendChild(placeholder);
                      }}
                    />
                  </a>
                ) : (
                  <img 
                    key={bannerKey}
                    src={flashSaleBanner.image_url} 
                    alt={flashSaleBanner.alt_text || "Flash Sale Banner"}
                    className="w-full h-auto object-cover"
                    width={640}
                    height={360}
                    loading="eager"
                    onError={(e) => {
                      // Handle image loading errors gracefully
                      console.error('Failed to load flash sale banner image:', flashSaleBanner.image_url);
                      // If image fails to load, show placeholder
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const placeholder = document.createElement('div');
                      placeholder.className = 'w-full h-16 bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center';
                      placeholder.innerHTML = '<span class="text-white font-bold text-base">Flash Sale</span>';
                      target.parentElement?.appendChild(placeholder);
                    }}
                  />
                )
              ) : (
                // No banner from database - show placeholder or nothing
                <div className="w-full h-16 bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-base">Flash Sale</span>
                </div>
              )}
            </div>

            {/* Flash Sale Products - Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3">
              {flashSaleLoading ? (
                // Loading skeleton - 2 columns
                <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-2 animate-pulse">
                    <div className="w-full aspect-square bg-gray-200 rounded-lg mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
                </div>
              ) : flashSaleProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                {flashSaleProducts.map((product, index) => {
                  const endTime = (product as any).periodEndTime || 0;
                  const nowSec = Math.floor(Date.now() / 1000);
                  let remaining: number;

                  if (endTime > 0 && endTime > nowSec) {
                    remaining = Math.max(endTime - nowSec, 0);
                  } else {
                    remaining = 0;
                  }

                  return (
                    <a
                      key={product.itemId || index}
                      href={product.offerLink}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = product.offerLink;
                      }}
                      className="block bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition"
                    >
                      <div className="relative">
                        <img 
                          src={product.imageUrl} 
                          alt={product.productName}
                          className="w-full aspect-square object-cover"
                        />
                        {/* Discount Badge */}
                        {product.discountRate && product.discountRate > 0 && (
                          <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] px-2 py-1 font-bold">
                            -{product.discountRate}%
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h4 className="text-xs font-medium text-gray-900 mb-1 overflow-hidden" style={{ 
                          height: '2.5rem',
                          lineHeight: '1.25rem'
                        }}>
                          {product.productName}
                        </h4>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-red-600 font-bold text-sm">
                            ฿{product.price?.toLocaleString()}
                          </span>
                          {product.originalPrice && product.originalPrice !== product.price && (
                            <span className="text-gray-400 line-through text-[10px]">
                              ฿{product.originalPrice?.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {remaining > 0 && (
                          <div className="text-[10px] text-red-600 font-semibold mb-1">
                            ⏱ {formatCountdown(remaining)}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-red-600 h-1.5 rounded-full transition-all" 
                              style={{ width: `${product.soldPercentage || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">
                            {product.soldCount?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">⚡</div>
                  <p className="text-sm">No Flash Sale products available</p>
                  <p className="text-xs mt-1">Check back later!</p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-14 flex items-center justify-around z-40">
        <button 
          onClick={() => filterProducts('all', [])}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${
            activeCategory === 'all' ? 'text-red-600' : 'text-gray-400'
          }`}
        >
          <Home size={24} />
          <span className="text-[11px] font-medium">Home</span>
        </button>
        
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400"
        >
          <BadgePercent 
            size={24} 
            className="text-green-500 drop-shadow-sm"
          />
          <span className="text-[11px] font-medium">เก็บคูปอง</span>
        </button>
        
        {/* Flash Sale Button */}
        <button
          onClick={() => setIsFlashSaleModalOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 hover:text-red-600 transition-colors"
        >
          <Flame 
            size={24} 
            className="text-yellow-500 drop-shadow-sm"
            fill="currentColor"
          />
          <span className="text-[11px] font-medium">Flash Sale</span>
        </button>
      </nav>

      {/* Banner Popup Modal - Support Multiple Banners with Slide */}
      {isPopupBannerOpen && popupBanners.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4">
          {/* Overlay - No click to close */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-none"
          />
          
          {/* Modal Content - Fit to image size */}
          <div className="relative bg-white rounded-lg md:rounded-xl shadow-2xl max-w-[92vw] md:max-w-[500px] w-full transform transition-all duration-300 ease-out scale-100 opacity-100 flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Slide Container - Replace style */}
            <div className="relative bg-white" style={{ width: '100%' }}>
              {/* Banner Images - Replace style (only show current slide) */}
              {popupBanners.map((banner, index) => (
                <div
                  key={index}
                  className={`w-full flex items-center justify-center transition-opacity duration-500 ease-in-out ${
                    index === currentPopupIndex ? 'opacity-100 z-10 relative' : 'opacity-0 z-0 pointer-events-none absolute inset-0'
                  }`}
                >
                  <div className="relative w-full flex items-center justify-center">
                    <img 
                      src={banner.image_url} 
                      alt={banner.alt_text || `Banner Popup ${index + 1}`}
                      className="block w-full h-auto max-h-[calc(90vh-80px)] object-contain"
                      style={{ maxHeight: 'calc(90vh - 80px)' }}
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                    {/* SHOP NOW Button - Only show if target_url exists */}
                    {banner.target_url && banner.target_url.trim() !== '' && (
                      <a
                        href={banner.target_url}
                        className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-40 px-6 md:px-8 py-2.5 md:py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm md:text-base rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (banner.target_url) {
                            window.location.href = banner.target_url;
                          }
                        }}
                      >
                        SHOP NOW
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {/* Navigation Arrows - Always show if more than 1 banner */}
              {popupBanners.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrevSlide();
                    }}
                    className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-30 bg-white/70 hover:bg-white/90 active:bg-white rounded-full p-2 md:p-2.5 shadow-lg border border-gray-200/70 hover:border-gray-300 transition-all hover:scale-110 active:scale-95 opacity-70 hover:opacity-100"
                    aria-label="Previous banner"
                  >
                    <ChevronLeft size={20} className="md:w-6 md:h-6 text-gray-800" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNextSlide();
                    }}
                    className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-30 bg-white/70 hover:bg-white/90 active:bg-white rounded-full p-2 md:p-2.5 shadow-lg border border-gray-200/70 hover:border-gray-300 transition-all hover:scale-110 active:scale-95 opacity-70 hover:opacity-100"
                    aria-label="Next banner"
                  >
                    <ChevronRight size={20} className="md:w-6 md:h-6 text-gray-800" strokeWidth={2.5} />
                  </button>
                </>
              )}

            </div>

            {/* Footer with Checkbox */}
            <div className="bg-white border-t border-gray-200 px-4 md:px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-lg md:rounded-b-xl flex-shrink-0">
              <label className="flex items-center gap-2 cursor-pointer group w-full sm:w-auto">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer transition-all"
                />
                <span className="text-xs md:text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  ไม่แสดงอีก 24 ชั่วโมง
                </span>
              </label>
              
              <button
                onClick={handleClosePopup}
                className="w-full sm:w-auto px-5 md:px-6 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-md font-medium text-sm transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
    </>
  );
}