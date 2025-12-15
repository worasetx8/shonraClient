'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface IconBanner {
  id: number;
  image_url: string;
  target_url: string | null;
  alt_text: string | null;
  title: string | null;
  description: string | null;
  open_new_tab: boolean;
  sort_order: number;
}

export default function IconBannerList() {
  const [banners, setBanners] = useState<IconBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await fetch('/api/banners/public/Icon%20Left');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          // Sort by sort_order (ascending)
          const sortedBanners = [...data.data].sort((a, b) => {
            const orderA = a.sort_order ?? 999999;
            const orderB = b.sort_order ?? 999999;
            return orderA - orderB;
          });
          
          setBanners(sortedBanners);
        }
      } catch (error) {
        console.error('Error fetching icon banners:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  const handleBannerClick = (banner: IconBanner) => {
    if (banner.target_url) {
      if (banner.open_new_tab) {
        window.open(banner.target_url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = banner.target_url;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="py-3 lg:px-4 lg:py-3">
        {/* Mobile: Horizontal Scroll */}
        <div className="flex lg:hidden gap-3 overflow-x-auto px-3" style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-100 animate-pulse"></div>
          ))}
        </div>
        {/* Desktop: Grid */}
        <div className="hidden lg:grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-full bg-gray-100 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="py-3 lg:px-4 lg:py-3">
      {/* Mobile: Horizontal Scroll */}
      <div className="flex lg:hidden gap-3 overflow-x-auto px-3 snap-x snap-mandatory" style={{ 
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
        {banners.map((banner) => (
          <div key={banner.id} className="flex flex-col items-center gap-1 flex-shrink-0 snap-start">
            <button
              onClick={() => handleBannerClick(banner)}
              className="group relative w-16 h-16 rounded-full overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              title={banner.alt_text || banner.title || ''}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100"></div>
              <div className="relative w-full h-full p-2 flex items-center justify-center">
                <Image
                  src={banner.image_url}
                  alt={banner.alt_text || banner.title || 'Icon'}
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                />
              </div>
              <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-200 rounded-full"></div>
            </button>
            {banner.title && (
              <span className="text-[14px] text-center text-gray-700 font-medium leading-tight line-clamp-2 w-16">
                {banner.title}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: Grid */}
      <div className="hidden lg:grid grid-cols-4 gap-3">
        {banners.map((banner) => (
          <div key={banner.id} className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleBannerClick(banner)}
              className="group relative aspect-square w-full rounded-full overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
              title={banner.alt_text || banner.title || ''}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100"></div>
              <div className="relative w-full h-full p-2.5 flex items-center justify-center">
                <Image
                  src={banner.image_url}
                  alt={banner.alt_text || banner.title || 'Icon'}
                  fill
                  className="object-contain p-2"
                  sizes="80px"
                />
              </div>
              <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-200 rounded-full"></div>
            </button>
            {banner.title && (
              <span className="text-[10px] text-center text-gray-700 font-medium leading-snug line-clamp-2 px-0.5 w-full">
                {banner.title}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
