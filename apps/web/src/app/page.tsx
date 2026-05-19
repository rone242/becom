'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Star, ShoppingCart, Truck, RefreshCw, ShieldCheck, Headphones, Megaphone, X } from 'lucide-react';
import { categoriesApi, productsApi, brandsApi, settingsApi } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSlider from '@/components/layout/HeroSlider';
import { useCartStore } from '@/store/cart.store';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Trust Badges ─────────────────────────────────────────────────────────────
const TRUST_BADGES = [
  { icon: Truck,        label: 'Free Delivery',      sub: 'On all orders above $30'   },
  { icon: RefreshCw,    label: 'Easy Returns',        sub: '30 days return guarantee'  },
  { icon: ShieldCheck,  label: 'Secure Payment',      sub: '100% secure delivery'      },
  { icon: Headphones,   label: 'Dedicated Support',   sub: '24/7 online support'       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toArray(d: any): any[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.products)) return d.products;
  return [];
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-accent text-accent' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </div>
  );
}

// ─── Inline Product Card ───────────────────────────────────────────────────────
function HomeProductCard({ product }: { product: any }) {
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

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow duration-200"
    >
      <div className="relative bg-gray-50 aspect-square overflow-hidden">
        <Image
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&h=300&fit=crop'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-400"
        />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">
          {product.name}
          {product.weight && (
            <span className="text-gray-400 font-normal"> {product.weight}</span>
          )}
        </p>
        <StarRow rating={product.rating || 4} />
        <p className="mt-1.5 text-base font-bold text-primary">
          ৳{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div
            role="button"
            tabIndex={0}
            onClick={handleAdd}
            className="flex items-center justify-center gap-1 py-2 border border-primary text-primary text-xs font-semibold rounded hover:bg-primary hover:text-white transition-colors duration-150"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={handleBuyNow}
            className="flex items-center justify-center gap-1 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors duration-150"
          >
            Buy Now
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-8 bg-gray-200 rounded w-full mt-2" />
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 animate-pulse">
      <div className="w-16 h-16 rounded-full bg-gray-200" />
      <div className="h-3 w-16 bg-gray-200 rounded" />
    </div>
  );
}

// ─── Category Product Row ─────────────────────────────────────────────────────
function CategoryProductRow({ categoryName, categorySlug }: { categoryName: string; categorySlug: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'by-category', categorySlug],
    queryFn: () => productsApi.getAll({ category: categorySlug, limit: 3 }).then((r) => r.data),
  });

  const products = toArray(data).slice(0, 3);

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="py-8">
      <div className="container-main">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{categoryName}</h2>
          <Link
            href={`/shop?category=${categorySlug}`}
            className="text-xs font-semibold text-white bg-primary hover:bg-primary-hover px-3 py-1 rounded transition-colors"
          >
            See All
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <ProductSkeleton key={i} />)
            : products.map((p: any) => <HomeProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}

// ─── Announcement Bar ─────────────────────────────────────────────────────────
function AnnouncementBar({ text }: { text: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible || !text) return null;
  return (
    <div className="bg-primary text-white text-xs sm:text-sm font-medium text-center py-2.5 px-4 flex items-center justify-center gap-3 relative">
      <Megaphone className="w-4 h-4 shrink-0" />
      <span>{text}</span>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data),
  });

  const { data: brandData, isLoading: brandLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.getAll().then((r) => r.data),
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });

  const categories = toArray(catData);
  const brands = toArray(brandData);
  const settings = settingsData || {};

  // Show up to 5 category sections for product rows
  const categoryRows = categories.slice(0, 5);

  const heroTitle = settings.heroTitle || 'Eat Pure, Eat Organic';
  const heroSubtitle = settings.heroSubtitle || 'Fresh from the farm to your table';
  const heroImage = settings.heroImage || null;
  const heroImages = settings.heroImages || [];
  const announcement = settings.announcement || null;

  return (
    <>
      <Navbar />
      {/* Announcement Bar */}
      {announcement && <AnnouncementBar text={announcement} />}

      <main className="bg-white">

        {/* ─── Hero Slider ──────────────────────────────────────────────────── */}
        <HeroSlider 
          images={heroImages.length > 0 ? heroImages : (heroImage ? [heroImage] : [])} 
          title={heroTitle} 
          subtitle={heroSubtitle} 
        />

        {/* ─── Popular Categories ─────────────────────────────────────────────── */}
        <section className="container-main py-12">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-gray-900 tracking-widest uppercase">
              Popular Categories
            </h2>
            <div className="mt-2 flex justify-center">
              <div className="w-12 h-0.5 bg-primary" />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            {catLoading
              ? Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)
              : categories.slice(0, 6).map((cat: any) => (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-2 text-center"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-primary transition-colors duration-200 shadow-sm">
                    <Image
                      src={cat.image || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop'}
                      alt={cat.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 group-hover:text-primary transition-colors leading-tight max-w-[80px]">
                    {cat.name}
                  </span>
                </Link>
              ))}
          </div>
        </section>

        <div className="border-t border-gray-100" />

        {/* ─── Product Sections by Category ──────────────────────────────────── */}
        {catLoading ? (
          <section className="py-8">
            <div className="container-main">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-14 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            </div>
          </section>
        ) : (
          categoryRows.map((cat: any) => (
            <CategoryProductRow key={cat.id} categoryName={cat.name} categorySlug={cat.slug} />
          ))
        )}

        <div className="border-t border-gray-100" />

        {/* ─── Top Brands ────────────────────────────────────────────────────── */}
        <section className="container-main py-12">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-gray-900 tracking-widest uppercase">
              Top Brands
            </h2>
            <div className="mt-2 flex justify-center">
              <div className="w-12 h-0.5 bg-primary" />
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
            {brandLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                ))
              : brands.length > 0
                ? brands.slice(0, 6).map((brand: any) => (
                    <div key={brand.id} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors">
                      {brand.logo && (
                        <Image src={brand.logo} alt={brand.name} width={16} height={16} className="object-contain" />
                      )}
                      <span className="text-sm font-semibold">{brand.name}</span>
                    </div>
                  ))
                : ['GreenValley', 'PureRoot', 'SunSoil', 'FreshStream', 'UrbanApiary'].map((name) => (
                    <span key={name} className="text-sm font-semibold text-gray-500">
                      🌿 {name}
                    </span>
                  ))}
          </div>
        </section>

        <div className="border-t border-gray-100" />

        {/* ─── Trust Badges ──────────────────────────────────────────────────── */}
        <section className="bg-gray-50 py-10">
          <div className="container-main">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
