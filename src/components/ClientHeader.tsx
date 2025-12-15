'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function ClientHeader() {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [websiteName, setWebsiteName] = useState<string>('Shonra');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success && data.data) {
        setLogoUrl(data.data.logo_client_url || data.data.logo_url || '');
        setWebsiteName(data.data.website_name || 'Shonra');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };



  return (
    <>
      {/* Simple Header - Just Logo */}
      <header className="sticky top-0 z-50 bg-red-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              {/* Mobile: Show text "SHONRA" */}
              <span className="text-white font-bold text-xl sm:hidden logo-font">{websiteName.toUpperCase()}</span>
              
              {/* Desktop: Show logo */}
              <div className="hidden sm:flex items-center gap-3">
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
              </div>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
