'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Banner {
  id: number;
  image_url: string;
  target_url: string | null;
  alt_text: string | null;
  open_new_tab: boolean;
}

interface BannerAdsSliderProps {
  autoPlayInterval?: number;
  positionName?: string;
  initialBanners?: Banner[];
}

export default function BannerAdsSlider({ 
  autoPlayInterval = 5000, 
  positionName = 'Banner Ads',
  initialBanners = []
}: BannerAdsSliderProps) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(initialBanners.length === 0);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch banners only if no initial banners provided
  useEffect(() => {
    if (initialBanners.length > 0) {
      setIsLoading(false);
      return;
    }

    const fetchBanners = async () => {
      try {
        const encodedPosition = encodeURIComponent(positionName);
        const response = await fetch(`/api/banners/public/${encodedPosition}`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          setBanners(data.data);
        }
      } catch (error) {
        console.error('Error fetching banner ads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, [positionName, initialBanners.length]);

  // Auto-play functionality
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [banners.length, autoPlayInterval, isPaused]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleBannerClick = (banner: Banner) => {
    if (banner.target_url) {
      if (banner.open_new_tab) {
        window.open(banner.target_url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = banner.target_url;
      }
    }
  };

  const isBannerSpecial = positionName === 'Banner Spacial';
  const aspectRatio = isBannerSpecial ? '0.84/1' : '16/9';
  const borderRadius = isBannerSpecial ? '' : 'rounded-lg';

  if (isLoading) {
    return (
      <div className={`w-full bg-gray-100 overflow-hidden ${borderRadius}`}>
        <div style={{ aspectRatio }} className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <div 
      className={`relative w-full bg-white overflow-hidden shadow-sm group ${borderRadius}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Banner Images */}
      <div className="relative overflow-hidden" style={{ aspectRatio }}>
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className={`relative w-full h-full ${banner.target_url ? 'cursor-pointer' : ''}`}
              onClick={() => handleBannerClick(banner)}
            >
              {/* Use regular img tag for all banner images (works with both relative and absolute URLs) */}
              {/* First image (index 0) is LCP element - use fetchpriority="high" for faster loading */}
              <img
                src={banner.image_url}
                alt={banner.alt_text || 'Banner'}
                className="absolute inset-0 w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                onError={(e) => {
                  // Handle image loading errors gracefully
                  console.error('Failed to load banner image:', banner.image_url);
                  // Hide the broken image
                  const target = e.currentTarget;
                  target.style.display = 'none';
                }}
              />
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Previous banner"
            >
              <ChevronLeft size={18} className="text-gray-800" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Next banner"
            >
              <ChevronRight size={18} className="text-gray-800" />
            </button>
          </>
        )}
      </div>

      {/* Dots Navigation */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
