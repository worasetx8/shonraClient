'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  is_active: number;
  product_count?: number;
}

interface CategorySliderProps {
  categories: Category[];
  activeCategory: number | 'all';
  onCategoryChange: (categoryId: number | 'all') => void;
  getCategoryIcon: (categoryName: string) => JSX.Element | null;
}

export default function CategorySlider({ 
  categories, 
  activeCategory, 
  onCategoryChange,
  getCategoryIcon 
}: CategorySliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeCategoryRef = useRef<HTMLButtonElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Auto-scroll active category to center
  useEffect(() => {
    if (scrollContainerRef.current && activeCategoryRef.current) {
      const container = scrollContainerRef.current;
      const activeButton = activeCategoryRef.current;
      
      // Check if mobile (touch device) - check outside setTimeout
      const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
      
      // Wait for layout to be ready - longer delay for mobile
      const timeoutId = setTimeout(() => {
        if (container && activeButton) {
          if (isMobile) {
            // On mobile, use scrollIntoView for better compatibility
            activeButton.scrollIntoView({
              behavior: (CategorySlider as any).__hasMounted ? 'smooth' : 'auto',
              block: 'nearest',
              inline: 'center'
            });
          } else {
            // On desktop, calculate precise center position
            const containerWidth = container.clientWidth;
            const buttonLeft = activeButton.offsetLeft;
            const buttonWidth = activeButton.offsetWidth;
            const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
            
            container.scrollTo({ 
              left: Math.max(0, scrollPosition), 
              behavior: (CategorySlider as any).__hasMounted ? 'smooth' : 'auto' as ScrollBehavior 
            });
          }
          
          (CategorySlider as any).__hasMounted = true;
          
          // Update scroll buttons after scroll
          setTimeout(() => checkScrollButtons(), 100);
        }
      }, isMobile ? 150 : 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [categories]);

  // Add mouse wheel scroll functionality
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent default vertical scroll
      e.preventDefault();
      
      // Scroll horizontally based on wheel delta
      container.scrollLeft += e.deltaY;
      
      // Update scroll buttons visibility
      checkScrollButtons();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = direction === 'left'
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="fixed lg:sticky top-16 lg:top-16 z-40 bg-white border-b border-gray-200 shadow-sm w-full">
      <div className="relative max-w-7xl mx-auto px-0 lg:px-6 w-full">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="hidden lg:block absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 transition-all duration-200 hover:scale-110 hover:shadow-xl"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} className="text-gray-700" />
          </button>
        )}

        {/* Categories Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          className="flex items-center gap-2 lg:gap-2.5 overflow-x-auto overflow-y-hidden scrollbar-hide py-3 px-3 lg:px-0 w-full touch-scroll"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          } as React.CSSProperties}
        >
          {/* All Items Button */}
          <button
            ref={activeCategory === 'all' ? activeCategoryRef : null}
            onClick={() => onCategoryChange('all')}
            className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-full whitespace-nowrap font-medium text-xs lg:text-sm transition-all duration-200 flex-shrink-0 ${
              activeCategory === 'all'
                ? 'bg-red-500 text-white shadow-md hover:bg-red-600'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <LayoutGrid size={14} className="lg:w-4 lg:h-4" />
            <span>All</span>
          </button>

          {/* Category Buttons */}
          {categories.map((category) => (
            <button
              key={category.id}
              ref={activeCategory === category.id ? activeCategoryRef : null}
              onClick={() => onCategoryChange(category.id)}
              className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-full whitespace-nowrap font-medium text-xs lg:text-sm transition-all duration-200 flex-shrink-0 ${
                activeCategory === category.id
                  ? 'bg-red-500 text-white shadow-md hover:bg-red-600'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className="text-sm lg:text-base">{getCategoryIcon(category.name)}</span>
              <span>{category.name}</span>
              {category.product_count !== undefined && category.product_count > 0 && (
                <span className={`text-xs font-semibold px-1.5 lg:px-2 py-0.5 rounded-full ${
                  activeCategory === category.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {category.product_count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="hidden lg:block absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 transition-all duration-200 hover:scale-110 hover:shadow-xl"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} className="text-gray-700" />
          </button>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .touch-scroll {
          -webkit-overflow-scrolling: touch !important;
          overflow-scrolling: touch !important;
          touch-action: pan-x !important;
          overscroll-behavior-x: contain !important;
        }
        @media (max-width: 1024px) {
          .touch-scroll {
            -webkit-overflow-scrolling: touch !important;
            overflow-scrolling: touch !important;
            touch-action: pan-x !important;
            overscroll-behavior-x: contain !important;
            will-change: scroll-position;
          }
          .touch-scroll button {
            touch-action: manipulation;
            pointer-events: auto;
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
