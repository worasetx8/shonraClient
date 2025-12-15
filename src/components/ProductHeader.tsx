"use client";

import Link from "next/link";
import { Search, X, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import React from "react";

interface Category {
  id: number;
  name: string;
  is_active: number;
  product_count?: number;
}

type SortOption = "relevance" | "price_asc" | "price_desc";

interface Props {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  clearSearch: () => void;
  isSearching: boolean;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  categories: Category[];
  currentCategoryId?: number | "all";
  onCategoryChange: (id: number | "all") => void;
  logoUrl?: string | null;
  websiteName?: string;
}

export default function ProductHeader({
  searchQuery,
  setSearchQuery,
  handleSearch,
  clearSearch,
  isSearching,
  sortBy,
  setSortBy,
  categories,
  currentCategoryId,
  onCategoryChange,
  logoUrl,
  websiteName,
}: Props) {
  return (
    <header className="sticky top-0 z-50 bg-red-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={websiteName} className="w-8 h-8 object-contain rounded-lg" />
            ) : (
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">S</span>
              </div>
            )}
            <span className="text-white font-bold text-xl hidden sm:inline">{websiteName}</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 justify-center">
            <div className="relative w-full max-w-2xl">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 bg-white rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              />
              <button
                type={searchQuery ? "button" : "submit"}
                onClick={searchQuery ? clearSearch : undefined}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-600 hover:text-red-700 transition-colors"
                title={searchQuery ? "Clear search" : "Search"}
              >
                {searchQuery ? <X size={20} /> : <Search size={20} />}
              </button>
            </div>
          </form>

          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center bg-red-700 rounded-lg p-1">
              <button
                onClick={() => setSortBy("relevance")}
                className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                  sortBy === "relevance" ? "bg-white text-red-600" : "text-red-100 hover:text-white"
                }`}
              >
                Relevance
              </button>
              <button
                onClick={() => setSortBy("price_asc")}
                className={`px-3 py-1.5 text-xs font-bold rounded transition flex items-center gap-1 ${
                  sortBy === "price_asc" ? "bg-white text-red-600" : "text-red-100 hover:text-white"
                }`}
              >
                <ArrowDownWideNarrow size={12} /> Price ↑
              </button>
              <button
                onClick={() => setSortBy("price_desc")}
                className={`px-3 py-1.5 text-xs font-bold rounded transition flex items-center gap-1 ${
                  sortBy === "price_desc" ? "bg-white text-red-600" : "text-red-100 hover:text-white"
                }`}
              >
                <ArrowUpNarrowWide size={12} /> Price ↓
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <form 
          onSubmit={handleSearch}
          className="lg:hidden pb-3"
        >
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-2.5 bg-white rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            />
            <button
              type={searchQuery ? "button" : "submit"}
              onClick={searchQuery ? clearSearch : undefined}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-600 hover:text-red-700 transition-colors"
              title={searchQuery ? "Clear search" : "Search"}
            >
              {searchQuery ? <X size={20} /> : <Search size={20} />}
            </button>
          </div>
        </form>

        {/* Mobile Filter Dropdown */}
        <div className="lg:hidden pb-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full px-4 py-2.5 border border-red-700 bg-red-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
          >
            <option value="relevance">ความเกี่ยวข้อง</option>
            <option value="price_asc">ราคา: ต่ำ - สูง</option>
            <option value="price_desc">ราคา: สูง - ต่ำ</option>
          </select>
        </div>
      </div>
    </header>
  );
}
