'use client';

interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'Product' | 'BreadcrumbList';
  data?: any;
}

export default function StructuredData({ type, data }: StructuredDataProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shonra.com';
  const siteName = 'SHONRA';

  const getStructuredData = () => {
    switch (type) {
      case 'Organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: siteName,
          url: siteUrl,
          logo: `${siteUrl}/logo.png`,
          description: 'Shopee Affiliate Platform - All amazing deals and earn commissions',
          sameAs: [
            // Add social media URLs here when available
            // 'https://www.facebook.com/shonra',
            // 'https://twitter.com/shonra',
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Service',
            // Add contact information if available
          },
        };

      case 'WebSite':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteName,
          url: siteUrl,
          description: 'All amazing deals and earn commissions with SHONRA',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${siteUrl}/?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        };

      case 'Product':
        if (!data) return null;
        
        // Build offers object with all required fields
        const offers: any = {
          '@type': 'Offer',
          url: data.offerLink || data.url,
          priceCurrency: 'THB',
          price: data.price || data.priceMin,
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: data.shopName || 'Shopee',
          },
          // Merchant listings required fields
          description: data.offerDescription || data.description || `${data.productName || data.name} - Best deals on Shopee`,
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
        };

        // Add priceValidUntil if provided
        if (data.priceValidUntil) {
          offers.priceValidUntil = data.priceValidUntil;
        }

        // Build aggregateRating with ratingCount
        const aggregateRating = data.ratingStar
          ? {
              '@type': 'AggregateRating',
              ratingValue: data.ratingStar,
              bestRating: '5',
              worstRating: '1',
              ratingCount: data.ratingCount || data.salesCount || data.reviewCount || 1,
            }
          : undefined;

        // Build review array (at least one review if rating exists)
        const reviews = data.ratingStar && data.ratingCount
          ? [
              {
                '@type': 'Review',
                author: {
                  '@type': 'Person',
                  name: 'Customer',
                },
                datePublished: new Date().toISOString().split('T')[0],
                reviewBody: data.reviewBody || `Great product with ${data.ratingStar} star rating`,
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: data.ratingStar,
                  bestRating: '5',
                  worstRating: '1',
                },
              },
            ]
          : undefined;

        return {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: data.productName || data.name,
          image: data.imageUrl || data.image,
          description: data.description || `${data.productName || data.name} - Best deals on Shopee`,
          brand: {
            '@type': 'Brand',
            name: data.shopName || 'Shopee',
          },
          offers,
          ...(aggregateRating && { aggregateRating }),
          ...(reviews && { review: reviews }),
        };

      case 'BreadcrumbList':
        if (!data || !Array.isArray(data)) return null;
        return {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: data.map((item: any, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url || `${siteUrl}${item.path}`,
          })),
        };

      default:
        return null;
    }
  };

  const structuredData = getStructuredData();

  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}


