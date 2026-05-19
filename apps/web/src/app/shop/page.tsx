'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Star, ShoppingCart, SlidersHorizontal, Search, X,
  ChevronDown, ArrowUpDown, Leaf, Sparkles, Filter,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productsApi, categoriesApi, settingsApi } from '@/lib/api';
import { useCartStore } from '@/store/cart.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toArray(d: any): any[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.products)) return d.products;
  if (Array.isArray(d.data)) return d.data;
  return [];
}

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name', label: 'Name A–Z' },
];

// ─── Star Row ─────────────────────────────────────────────────────────────────
function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
      ))}
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: any }) {
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.images?.[0] || '',
      price: product.price,
      quantity: 1,
      weight: product.weight,
    });
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    handleAdd(e);
    router.push('/checkout');
  };

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      {/* Image */}
      <div className="relative bg-gray-50 aspect-square overflow-hidden">
        <Image
          src={product.images?.[0] || '#'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
              -{discount}%
            </span>
          )}
          {product.isNewArrival && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> New
            </span>
          )}
          {product.isOrganic && (
            <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center gap-0.5">
              <Leaf className="w-2.5 h-2.5" /> Organic
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <p className="text-xs text-gray-400 font-medium truncate">{product.brand?.name || product.category?.name || ''}</p>
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem]">
          {product.name}
          {product.weight && <span className="text-gray-400 font-normal"> · {product.weight}</span>}
        </p>
        <StarRow rating={product.rating || 4} />
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-base font-bold text-primary">
            ৳{typeof product.price === 'number' ? product.price.toFixed(0) : product.price}
          </span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-xs text-gray-400 line-through">
              ৳{typeof product.comparePrice === 'number' ? product.comparePrice.toFixed(0) : product.comparePrice}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div
            role="button"
            tabIndex={0}
            onClick={handleAdd}
            className="flex items-center justify-center gap-1 py-2 border border-primary text-primary text-xs font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Add
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={handleBuyNow}
            className="flex items-center justify-center py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors"
          >
            Buy Now
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-5 bg-gray-100 rounded w-1/4 mt-2" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="h-8 bg-gray-100 rounded-lg" />
          <div className="h-8 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [sort, setSort] = useState('latest');
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: rawProducts, isLoading } = useQuery({
    queryKey: ['shop-products', page, sort, selectedCat, search],
    queryFn: () => productsApi.getAll({
      limit: PAGE_SIZE,
      page,
      sortBy: sort === 'price_asc' || sort === 'price_desc' ? 'price' : 'createdAt',
      order: sort === 'price_asc' ? 'asc' : sort === 'name' ? 'asc' : 'desc',
      ...(selectedCat ? { categoryId: selectedCat } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }).then((r) => r.data),
    staleTime: 60_000,
    placeholderData: (prev) => prev, // keep previous page visible while loading
  });

  const { data: rawCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data),
  });

  // Fetch site settings for hero banner image (managed in Admin → Settings → Site Management)
  const { data: siteSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 60 * 1000, // 60 seconds
  });

  const products = toArray(rawProducts);
  const categories = toArray(rawCategories);
  const totalPages = rawProducts?.totalPages ?? 1;
  const total = rawProducts?.total ?? 0;

  // Pick hero banner image: prefer heroImages[0], fallback to heroImage, then null (gradient only)
  const heroBannerImages: string[] = siteSettings?.heroImages?.length
    ? siteSettings.heroImages
    : siteSettings?.heroImage
    ? [siteSettings.heroImage]
    : [];

  // Client-side name sort (server sorts by createdAt/price only)
  const sorted = useMemo(() => {
    if (sort !== 'name') return products;
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products, sort]);

  // Reset to page 1 when filters change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleCat = (id: string) => { setSelectedCat(id); setPage(1); };
  const handleSort = (v: string) => { setSort(v); setPage(1); };

  return (
    <>
      <Navbar />

      {/* ─── Shop Hero Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden pt-28 pb-16 px-4 text-white text-center min-h-[280px] flex flex-col justify-center">
        {/* Background: hero image from settings, or gradient fallback */}
        {heroBannerImages.length > 0 ? (
          <Image
            src={heroBannerImages[0]}
            alt="Shop banner"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-emerald-600" />
        )}

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/45" />

        {/* Subtle dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-3 backdrop-blur-sm border border-white/30">
            🛍️ Fresh &amp; Organic
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight drop-shadow-lg">Our Shop</h1>
          <p className="mt-3 text-white/85 text-sm sm:text-base max-w-md mx-auto drop-shadow">
            {siteSettings?.heroSubtitle || 'Browse our fresh & organic product collection'}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-white/60">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white font-medium">Shop</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {search && (
              <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => handleSort(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
              }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-8 p-5 bg-gray-50 border border-gray-200 rounded-2xl">
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Category Filter */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    key="all"
                    onClick={() => handleCat('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${!selectedCat ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                      }`}
                  >
                    All
                  </button>
                  {categories.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => handleCat(c.id === selectedCat ? '' : c.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedCat === c.id ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                        }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                  Max Price: <span className="text-primary">৳{maxPrice}</span>
                </p>
                <input
                  type="range"
                  min={50}
                  max={5000}
                  step={50}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>৳50</span>
                  <span>৳5000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Quick Pills (always visible) */}
        {!showFilters && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-6">
            <button
              key="all-pill"
              onClick={() => handleCat('')}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${!selectedCat ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                }`}
            >
              All
            </button>
            {categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => handleCat(c.id === selectedCat ? '' : c.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedCat === c.id ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                  }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-800">{sorted.length}</span> of{' '}
            <span className="font-semibold text-gray-800">{total}</span> product{total !== 1 ? 's' : ''}
            {search && <span className="text-primary"> for "{search}"</span>}
          </p>
          {(search || selectedCat) && (
            <button
              onClick={() => { handleSearch(''); handleCat(''); }}
              className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-24 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-500 text-lg font-semibold">No products found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
            <button
              onClick={() => { handleSearch(''); handleCat(''); setMaxPrice(5000); }}
              className="mt-5 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sorted.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* ─── Pagination ─────────────────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-12 flex flex-col items-center gap-4">
            {/* Info */}
            <p className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-800">{page}</span> of{' '}
              <span className="font-semibold text-gray-800">{totalPages}</span>
            </p>

            {/* Controls */}
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-3 py-2 text-sm text-gray-400">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => { setPage(item as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold border transition-all ${page === item
                          ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                        }`}
                    >
                      {item}
                    </button>
                  ),
                )}

              {/* Next */}
              <button
                onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
