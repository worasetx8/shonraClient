'use client';

import React, { useState, useEffect, memo, useRef } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Flex,
  Button
} from '@chakra-ui/react';
import { StarIcon } from '@chakra-ui/icons';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    productName: string;
    itemId: string | number;
    price: number;
    priceMin?: number;
    priceMax?: number;
    imageUrl: string;
    ratingStar?: string | number | null;
    priceDiscountRate?: number;
    offerLink: string;
    shopType?: string;
    fromShopee?: boolean; // Indicates if product is from Shopee API
    shopId?: string | number;
    productLink?: string;
    commissionRate?: number;
    sellerCommissionRate?: number;
    shopeeCommissionRate?: number;
    commissionRateOriginal?: number;
    commission?: number;
    shopName?: string;
    salesCount?: number;
    periodStartTime?: number;
    periodEndTime?: number;
    campaignActive?: boolean;
  };
}

const ModernProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle Shop Now click for Shopee products
  const handleShopNow = async (e: React.MouseEvent | React.TouchEvent) => {
    if (!product.fromShopee) {
      // Regular product - just open link
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (isSaving) return;

    setIsSaving(true);
    
    // Prepare product data for saving
    const commissionRateOriginal = (product as any).commissionRateOriginal;
    let commissionRateDecimal = 0;
    
    if (commissionRateOriginal !== undefined) {
      commissionRateDecimal = commissionRateOriginal;
    } else {
      const commissionRatePercent = product.commissionRate || 0;
      commissionRateDecimal = commissionRatePercent > 1 ? commissionRatePercent / 100 : commissionRatePercent;
    }
    
    const sellerCommissionRate = product.sellerCommissionRate !== undefined 
      ? product.sellerCommissionRate 
      : commissionRateDecimal;
    
    // Ensure all numeric values are numbers, not strings
    const productData = {
      itemId: String(product.itemId), // Ensure itemId is string
      productName: product.productName,
      shopName: product.shopName || '',
      shopId: product.shopId ? String(product.shopId) : '',
      price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
      priceMin: product.priceMin ? (typeof product.priceMin === 'string' ? parseFloat(product.priceMin) : product.priceMin) : product.price,
      priceMax: product.priceMax ? (typeof product.priceMax === 'string' ? parseFloat(product.priceMax) : product.priceMax) : product.price,
      commissionRate: commissionRateDecimal,
      sellerCommissionRate: typeof sellerCommissionRate === 'string' ? parseFloat(sellerCommissionRate) : sellerCommissionRate,
      shopeeCommissionRate: product.shopeeCommissionRate ? (typeof product.shopeeCommissionRate === 'string' ? parseFloat(product.shopeeCommissionRate) : product.shopeeCommissionRate) : 0,
      commission: product.commission ? (typeof product.commission === 'string' ? parseFloat(product.commission) : product.commission) : 0,
      imageUrl: product.imageUrl,
      productLink: product.productLink || product.offerLink,
      offerLink: product.offerLink,
      ratingStar: product.ratingStar ? (typeof product.ratingStar === 'string' ? parseFloat(product.ratingStar) : product.ratingStar) : 0,
      sold: product.salesCount ? (typeof product.salesCount === 'string' ? parseInt(product.salesCount) : product.salesCount) : 0,
      discountRate: product.priceDiscountRate ? (typeof product.priceDiscountRate === 'string' ? parseFloat(product.priceDiscountRate) : product.priceDiscountRate) : 0,
      periodStartTime: product.periodStartTime !== undefined ? (typeof product.periodStartTime === 'string' ? parseInt(product.periodStartTime) : product.periodStartTime) : 0,
      periodEndTime: product.periodEndTime !== undefined ? (typeof product.periodEndTime === 'string' ? parseInt(product.periodEndTime) : product.periodEndTime) : 0,
      campaignActive: product.campaignActive !== undefined ? Boolean(product.campaignActive) : false,
      is_flash_sale: false,
    };

    // Navigate immediately to avoid popup blocker (will open in Shopee app if installed)
    window.location.href = product.offerLink;

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
  };

  // Handle card click for products
  const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    if (product.fromShopee) {
      handleShopNow(e);
    } else {
      // Regular products - navigate directly
      window.location.href = product.offerLink;
    }
  };

  // Handle touch start to track initial touch position
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  // Handle touch end - only trigger click if it wasn't a scroll
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // If movement is more than 10px, consider it a scroll, not a tap
    const isScroll = deltaX > 10 || deltaY > 10;
    
    // Reset touch start
    touchStartRef.current = null;

    // Only trigger click if it wasn't a scroll
    if (!isScroll) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        return;
      }
      handleCardClick(e);
    }
  };

  const isMall = product.shopType === '1';
  const rating = typeof product.ratingStar === 'string' ? parseFloat(product.ratingStar) || 0 : Number(product.ratingStar) || 0;
  const hasDiscount = product.priceDiscountRate && product.priceDiscountRate > 0;
  
  // Safe price calculations
  // Use priceMin if available and > 0, otherwise use price, fallback to priceMax
  let currentPrice = 0;
  if (product.priceMin && product.priceMin > 0) {
    currentPrice = Number(product.priceMin);
  } else if (product.price && product.price > 0) {
    currentPrice = Number(product.price);
  } else if (product.priceMax && product.priceMax > 0) {
    currentPrice = Number(product.priceMax);
  }
  
  // Only calculate discountRate if priceDiscountRate exists and is greater than 0
  const discountRate = product.priceDiscountRate && product.priceDiscountRate > 0 ? Number(product.priceDiscountRate) : 0;
  
  // Only calculate original price after component is mounted
  let originalPrice = currentPrice;
  if (mounted && hasDiscount && discountRate > 0 && currentPrice > 0) {
    originalPrice = Math.ceil(currentPrice / (1 - discountRate / 100));
  }
  
  // Don't render if price is 0 (invalid product)
  if (currentPrice === 0) {
    return null;
  }
  
  // Don't render anything until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <Box
        bg="white"
        border="1px"
        borderColor="gray.200"
        borderRadius="sm"
        h="400px"
        w="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="sm" color="gray.400">Loading...</Text>
      </Box>
    );
  }

  // Check if image is from Shopee to bypass optimization
  // Check both explicit flag and URL pattern
  const isShopeeImage = product.fromShopee || product.imageUrl.includes('shopee') || product.imageUrl.includes('susercontent');

  return (
    <Box
      bg="white"
      borderRadius="xl"
      overflow="hidden"
      border="1px"
      borderColor="gray.200"
      _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
      transition="all 0.3s"
      position="relative"
      height="100%"
      display="flex"
      flexDirection="column"
    >
      {product.fromShopee ? (
        // Shopee Search Product - Click entire card to go to Shopee
        <Box
          as="a"
          href={product.offerLink}
          onClick={handleShopNow}
          display="flex"
          flexDirection="column"
          height="100%"
          cursor="pointer"
          _hover={{ textDecoration: 'none' }}
        >
          {/* Image */}
          <Box position="relative" bg="gray.50" aspectRatio={1} overflow="hidden">
            <Image
              src={product.imageUrl}
              alt={product.productName}
              width={400}
              height={400}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    loading="lazy"
                  />
            
            {/* Discount Badge - Top Right */}
            {hasDiscount && discountRate > 0 && (
              <Box
                position="absolute"
                top={2}
                right={2}
                bg="red.600"
                color="white"
                fontSize={{ base: 'xs', md: 'sm' }}
                fontWeight="bold"
                px={2}
                py={1}
                borderRadius="md"
                zIndex={1}
                boxShadow="sm"
              >
                {Math.round(discountRate)}%
              </Box>
            )}
          </Box>

          {/* Content */}
          <VStack align="stretch" p={{ base: 3, md: 4 }} spacing={2} flex={1}>
            {/* Product Name */}
            <Box
              height={{ base: '2.5rem', md: '3rem' }}
              overflow="hidden"
            >
              <Text
                fontSize={{ base: 'xs', md: 'sm' }}
                fontWeight="medium"
                color="gray.800"
                lineHeight="1.2"
                overflow="hidden"
                textOverflow="ellipsis"
                display="-webkit-box"
                wordBreak="break-word"
                css={{
                  WebkitLineClamp: '2',
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {product.productName}
              </Text>
            </Box>

             {/* Price Section  */}

            <HStack spacing={2} align="baseline" justify="space-between">
              <Text color="red.600" fontWeight="bold" fontSize={{ base: 'lg', md: 'xl' }}>
                ฿{currentPrice.toLocaleString()}
              </Text>
              {hasDiscount && (
                <Text fontSize="xs" color="gray.600" textDecoration="line-through">
                  ฿{originalPrice.toLocaleString()}
                </Text>
              )}
            </HStack>
            
            {/* Rating & Reviews */}
            {rating > 0 && (
              <HStack spacing={1}>
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    boxSize={{ base: '10px', md: '12px' }}
                    color={i < Math.floor(rating) ? 'orange.400' : 'gray.300'}
                  />
                ))}
                {product.salesCount && product.salesCount > 0 && (
                  <Text fontSize="xs" color="gray.700" ml={1}>
                    {product.salesCount.toLocaleString()}
                  </Text>
                )}
              </HStack>
            )}

            {/* Button */}
            <Button
              size="sm"
              bg="#DC2626"
              color="white"
              _hover={{ bg: "#B91C1C" }}
              _active={{ bg: "#991B1B" }}
              width="100%"
              borderRadius="full"
              fontSize="xs"
              fontWeight="bold"
              height="36px"
            >
              Add to Cart
            </Button>
          </VStack>
        </Box>
      ) : (
        // Database Product - Hybrid card (detail link + buy button)
        <>
          {/* Clickable Image & Title Area - Goes to Product Detail */}
          <Box
            as="a"
            href={`/product/${product.itemId}`}
            display="block"
            _hover={{ textDecoration: 'none' }}
          >
            {/* Image */}
            <Box position="relative" bg="gray.50" aspectRatio={1} overflow="hidden">
              <Image
                src={product.imageUrl}
                alt={product.productName}
                width={400}
                height={400}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                loading="lazy"
              />
              
              {/* Discount Badge - Top Right */}
              {hasDiscount && discountRate > 0 && (
                <Box
                  position="absolute"
                  top={2}
                  right={2}
                  bg="red.600"
                  color="white"
                  fontSize={{ base: 'xs', md: 'sm' }}
                  fontWeight="bold"
                  px={2}
                  py={1}
                  borderRadius="md"
                  zIndex={1}
                  boxShadow="sm"
                >
                  {Math.round(discountRate)}%
                </Box>
              )}
            </Box>

            {/* Product Name - Clickable to Detail */}
            <Box px={{ base: 3, md: 4 }} pt={{ base: 3, md: 4 }}>
              <Box
                height={{ base: '2.5rem', md: '3rem' }}
                overflow="hidden"
              >
                <Text
                  fontSize={{ base: 'xs', md: 'sm' }}
                  fontWeight="medium"
                  color="gray.800"
                  lineHeight="1.2"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  display="-webkit-box"
                  wordBreak="break-word"
                  css={{
                    WebkitLineClamp: '2',
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {product.productName}
                </Text>
              </Box>
            </Box>
          </Box>

          {/* Price & Info Section - Non-clickable */}
          <VStack align="stretch" px={{ base: 3, md: 4 }} pb={{ base: 3, md: 4 }} pt={2} spacing={2} flex={1}>
            {/* Price Section */}
            <HStack spacing={2} align="baseline" justify="space-between">
              <Text color="red.600" fontWeight="bold" fontSize={{ base: 'lg', md: 'xl' }}>
                ฿{currentPrice.toLocaleString()}
              </Text>
              {hasDiscount && (
                <Text fontSize="xs" color="gray.600" textDecoration="line-through">
                  ฿{originalPrice.toLocaleString()}
                </Text>
              )}
            </HStack>
            
            {/* Rating & Reviews */}
            {rating > 0 && (
              <HStack spacing={1}>
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    boxSize={{ base: '10px', md: '12px' }}
                    color={i < Math.floor(rating) ? 'orange.400' : 'gray.300'}
                  />
                ))}
                {product.salesCount && product.salesCount > 0 && (
                  <Text fontSize="xs" color="gray.700" ml={1}>
                    {product.salesCount.toLocaleString()}
                  </Text>
                )}
              </HStack>
            )}

            {/* Buy Now Button - Direct to Shopee */}
            <Button
              as="a"
              href={product.offerLink}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              bg="#DC2626"
              color="white"
              _hover={{ bg: "#B91C1C" }}
              _active={{ bg: "#991B1B" }}
              width="100%"
              borderRadius="full"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (product.fromShopee) {
                  handleShopNow(e);
                }
              }}
              isLoading={isSaving}
              fontSize="xs"
              fontWeight="bold"
              height="36px"
            >
              Add to Cart
            </Button>
          </VStack>
        </>
      )}
    </Box>
  );
};

// Memoize component to prevent unnecessary re-renders when parent re-renders
export default memo(ModernProductCard, (prevProps, nextProps) => {
  // Only re-render if product data actually changed
  return (
    prevProps.product.itemId === nextProps.product.itemId &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.priceMin === nextProps.product.priceMin &&
    prevProps.product.priceMax === nextProps.product.priceMax &&
    prevProps.product.productName === nextProps.product.productName &&
    prevProps.product.imageUrl === nextProps.product.imageUrl &&
    prevProps.product.ratingStar === nextProps.product.ratingStar &&
    prevProps.product.priceDiscountRate === nextProps.product.priceDiscountRate &&
    prevProps.product.commission === nextProps.product.commission &&
    prevProps.product.shopType === nextProps.product.shopType &&
    prevProps.product.fromShopee === nextProps.product.fromShopee
  );
});