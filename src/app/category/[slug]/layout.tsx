import type { Metadata } from 'next';
import { getBackendUrl } from '@/lib/api-utils';

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://shonra.com';
const DEFAULT_SITE_NAME = 'SHONRA';

interface Category {
  id: number;
  name: string;
  is_active: number;
}

interface Product {
  image_url: string;
}

// Helper function to create category slug (same logic as in page.tsx)
function createCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .trim();
}

async function getCategoryBySlug(slug: string): Promise<{ category: Category | null; productCount: number; firstProductImage?: string }> {
  try {
    const BACKEND_URL = getBackendUrl();
    
    // Fetch categories
    const catResponse = await fetch(`${BACKEND_URL}/api/categories/public`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SHONRA-Frontend/1.0'
      },
      cache: 'no-store'
    });

    if (!catResponse.ok) {
      return { category: null, productCount: 0 };
    }

    const catData = await catResponse.json();
    if (!catData.success || !Array.isArray(catData.data)) {
      return { category: null, productCount: 0 };
    }

    // Find category by slug
    const activeCategories = catData.data.filter((cat: Category) => cat.is_active === 1);
    const category = activeCategories.find((cat: Category) => {
      const catSlug = createCategorySlug(cat.name);
      return catSlug === slug;
    });

    if (!category) {
      return { category: null, productCount: 0 };
    }

    // Fetch products for this category (limit to reasonable number for metadata)
    const prodResponse = await fetch(`${BACKEND_URL}/api/products/public?category_id=${category.id}&limit=100`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SHONRA-Frontend/1.0'
      },
      cache: 'no-store'
    });

    let productCount = 0;
    let firstProductImage: string | undefined;

    if (prodResponse.ok) {
      const prodData = await prodResponse.json();
      if (prodData.success && Array.isArray(prodData.data)) {
        productCount = prodData.data.length;
        if (prodData.data.length > 0 && prodData.data[0].image_url) {
          firstProductImage = prodData.data[0].image_url;
        }
      }
    }

    return { category, productCount, firstProductImage };
  } catch (error) {
    console.error('[Category Layout] Failed to fetch category:', error);
    return { category: null, productCount: 0 };
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
): Promise<Metadata> {
  // Handle both Promise and direct params (Next.js 13-15 compatibility)
  const resolvedParams = await Promise.resolve(params);
  const { slug } = resolvedParams;
  
  const { category, productCount, firstProductImage } = await getCategoryBySlug(slug);

  // If category not found, use default metadata
  if (!category) {
    return {
      title: 'หมวดหมู่ไม่พบ',
      description: 'ไม่พบหมวดหมู่ที่คุณค้นหา',
    };
  }

  // Create description with category name
  const productCountText = productCount > 0 ? `${productCount} รายการ` : 'หลายรายการ';
  const description = `ช็อปสินค้าหมวดหมู่ ${category.name} คุณภาพดี ราคาถูก จาก Shopee ที่ ${DEFAULT_SITE_NAME} | พบสินค้า ${productCountText}`;
  const title = `${category.name} - ${DEFAULT_SITE_NAME}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: firstProductImage ? [
        {
          url: firstProductImage,
          width: 1200,
          height: 1200,
          alt: category.name,
        },
      ] : undefined,
      url: `${DEFAULT_SITE_URL}/category/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: firstProductImage ? [firstProductImage] : undefined,
    },
  };
}

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

