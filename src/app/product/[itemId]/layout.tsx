import type { Metadata } from 'next';
import { getBackendUrl } from '@/lib/api-utils';

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://shonra.com';
const DEFAULT_SITE_NAME = 'SHONRA';

interface Product {
  product_name: string;
  price: number;
  shop_name: string;
  category_name: string;
  image_url: string;
}

async function getProduct(itemId: string): Promise<Product | null> {
  try {
    const BACKEND_URL = getBackendUrl();
    const response = await fetch(`${BACKEND_URL}/api/products/item/${itemId}`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SHONRA-Frontend/1.0'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    console.error('[Product Layout] Failed to fetch product:', error);
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ itemId: string }> | { itemId: string } }
): Promise<Metadata> {
  // Handle both Promise and direct params (Next.js 13-15 compatibility)
  const resolvedParams = await Promise.resolve(params);
  const { itemId } = resolvedParams;
  const product = await getProduct(itemId);

  // If product not found, use default metadata
  if (!product) {
    return {
      title: 'สินค้าไม่พบ',
      description: 'ไม่พบสินค้าที่คุณค้นหา',
    };
  }

  // Format price (match formatPrice function in page.tsx)
  const formattedPrice = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(product.price)
    .replace('THB', '฿');

  // Create description with product name
  const description = `${product.product_name} ราคา ${formattedPrice} จาก ${product.shop_name} | ${product.category_name} | ${DEFAULT_SITE_NAME}`;
  const title = `${product.product_name} - ${DEFAULT_SITE_NAME}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: product.image_url,
          width: 1200,
          height: 1200,
          alt: product.product_name,
        },
      ],
      url: `${DEFAULT_SITE_URL}/product/${itemId}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [product.image_url],
    },
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

