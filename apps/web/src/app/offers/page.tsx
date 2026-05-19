'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Tag, Copy, Check, Clock, ShoppingCart, Zap, Percent,
  BadgePercent, Gift, Star, ChevronRight, Sparkles, Leaf, ArrowRight,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { couponsApi, productsApi } from '@/lib/api';
import { useCartStore } from '@/store/cart.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toArray(d: any): any[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.products)) return d.products;
  return [];
}

// ─── Copy-to-clipboard button ─────────────────────────────────────────────────
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        copied
          ? 'bg-green-500 text-white'
          : 'bg-white/20 hover:bg-white/30 text-white'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Coupon Card ──────────────────────────────────────────────────────────────
function CouponCard({ coupon }: { coupon: any }) {
  const isPercentage = coupon.type === 'PERCENTAGE';
  const usedPct = coupon.maxUses ? Math.min(100, Math.round((coupon.usedCount / coupon.maxUses) * 100)) : 0;
  const remaining = coupon.maxUses ? coupon.maxUses - coupon.usedCount : null;
  const isExpiringSoon = coupon.expiresAt
    ? (new Date(coupon.expiresAt).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000
    : false;

  const gradients = [
    'from-primary to-emerald-700',
    'from-violet-600 to-indigo-700',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-700',
    'from-sky-500 to-blue-700',
  ];
  const grad = gradients[coupon.code.charCodeAt(0) % gradients.length];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} text-white shadow-lg`}>
      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -right-4 top-8 w-16 h-16 rounded-full bg-white/10" />

      {/* Expiring soon badge */}
      {isExpiringSoon && coupon.expiresAt && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Clock className="w-2.5 h-2.5" /> Expiring Soon
        </div>
      )}

      <div className="p-5 relative z-10">
        {/* Discount badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {isPercentage
                ? <Percent className="w-5 h-5 text-white/80" />
                : <Gift className="w-5 h-5 text-white/80" />
              }
              <span className="text-3xl font-black">
                {isPercentage ? `${coupon.discount}%` : `৳${coupon.discount}`}
              </span>
              <span className="text-white/70 text-sm font-semibold mt-1">OFF</span>
            </div>
            <p className="mt-1 text-sm text-white/90 leading-snug">{coupon.description}</p>
          </div>
        </div>

        {/* Code strip */}
        <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 border border-dashed border-white/30">
          <Tag className="w-4 h-4 text-white/70 shrink-0" />
          <span className="flex-1 font-mono text-lg font-black tracking-widest">{coupon.code}</span>
          <CopyButton code={coupon.code} />
        </div>

        {/* Meta */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
          {coupon.minOrder && (
            <span>Min. order ৳{coupon.minOrder}</span>
          )}
          {coupon.expiresAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Expires {new Date(coupon.expiresAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {remaining !== null && (
            <span>{remaining} uses left</span>
          )}
        </div>

        {/* Usage progress bar */}
        {coupon.maxUses && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-white/60 mb-1">
              <span>{coupon.usedCount} used</span>
              <span>{coupon.maxUses} total</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20">
              <div
                className="h-1.5 rounded-full bg-white/80 transition-all"
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <Link
          href="/shop"
          className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl transition-all"
        >
          Shop Now <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ─── Sale Product Card ────────────────────────────────────────────────────────
function SaleCard({ product }: { product: any }) {
  const addItem = useCartStore((s) => s.addItem);
  const router  = useRouter();

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({ productId: product.id, productName: product.name, productImage: product.images?.[0] || '', price: product.price, quantity: 1, weight: product.weight });
  };
  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    handleAdd(e);
    router.push('/checkout');
  };

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative bg-gray-50 aspect-square overflow-hidden">
        <Image
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {discount && (
          <div className="absolute top-2 left-2 px-2.5 py-1 bg-red-500 text-white text-xs font-black rounded-full shadow">
            -{discount}%
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs text-gray-400 font-medium truncate">{product.category?.name || ''}</p>
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mt-0.5 flex-1">{product.name}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-base font-bold text-primary">৳{typeof product.price === 'number' ? product.price.toFixed(0) : product.price}</span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-xs text-gray-400 line-through">৳{typeof product.comparePrice === 'number' ? product.comparePrice.toFixed(0) : product.comparePrice}</span>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div role="button" tabIndex={0} onClick={handleAdd}
            className="flex items-center justify-center gap-1 py-1.5 border border-primary text-primary text-xs font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors">
            <ShoppingCart className="w-3.5 h-3.5" /> Add
          </div>
          <div role="button" tabIndex={0} onClick={handleBuyNow}
            className="flex items-center justify-center py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors">
            Buy Now
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CouponSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-100 h-56 animate-pulse" />
  );
}
function ProductSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-5 bg-gray-100 rounded w-1/4 mt-2" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OffersPage() {
  const { data: coupons, isLoading: couponsLoading } = useQuery({
    queryKey: ['coupons-public'],
    queryFn: () => couponsApi.getPublic().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  // Discounted products: products that have a comparePrice > price
  const { data: rawProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['sale-products'],
    queryFn: () => productsApi.getAll({ limit: 20 }).then((r) => r.data),
    staleTime: 60_000,
  });

  const allProducts = toArray(rawProducts);
  const saleProducts = allProducts.filter(
    (p: any) => p.comparePrice && p.comparePrice > p.price
  );

  const couponList: any[] = Array.isArray(coupons) ? coupons : [];

  return (
    <>
      <Navbar />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-primary via-emerald-700 to-primary pt-28 pb-16 px-4 text-white text-center overflow-hidden">
        {/* animated bg blobs */}
        <div className="absolute top-10 left-1/4 w-48 h-48 rounded-full bg-white/5 blur-2xl animate-pulse" />
        <div className="absolute bottom-4 right-1/4 w-64 h-32 rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Zap className="w-4 h-4 text-amber-300" /> Limited Time Deals
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight">
            Offers &amp; <span className="text-amber-300">Coupons</span>
          </h1>
          <p className="mt-3 text-white/80 text-sm max-w-md mx-auto">
            Save more on every order — copy a coupon code or shop our best discounted products below.
          </p>
          <div className="flex items-center justify-center gap-1 mt-3 text-xs text-white/50">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Offers</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* ── Coupon Codes Section ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold text-gray-900">Active Coupon Codes</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">Apply these at checkout to save instantly</p>
            </div>
            <Link href="/shop" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Shop Now <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {couponsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => <CouponSkeleton key={i} />)}
            </div>
          ) : couponList.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No active coupons right now</p>
              <p className="text-gray-400 text-sm mt-1">Check back soon for new deals!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {couponList.map((c: any) => <CouponCard key={c.code} coupon={c} />)}
            </div>
          )}
        </section>

        {/* ── How to Use ──────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-gray-50 to-emerald-50 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">How to Use a Coupon</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', icon: ShoppingCart, title: 'Add to Cart', desc: 'Browse our shop and add your favourite items to the cart.' },
              { step: '2', icon: Copy, title: 'Copy Coupon Code', desc: 'Click the Copy button on any coupon above to copy the code.' },
              { step: '3', icon: Tag, title: 'Apply at Checkout', desc: 'Paste the code in the coupon field at checkout and save!' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 relative">
                  <Icon className="w-7 h-7 text-primary" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <p className="font-bold text-gray-900">{title}</p>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Sale Products Section ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-2xl font-bold text-gray-900">On Sale Now</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">Products with special discounted prices</p>
            </div>
            <Link href="/shop" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : saleProducts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No sale products right now</p>
              <p className="text-gray-400 text-sm mt-1">All products are available in the shop at regular price.</p>
              <Link href="/shop" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-colors">
                Browse Shop <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {saleProducts.map((p: any) => <SaleCard key={p.id} product={p} />)}
            </div>
          )}
        </section>

        {/* ── Newsletter CTA ───────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-gradient-to-br from-primary to-emerald-700 p-8 sm:p-12 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="relative z-10">
            <Leaf className="w-10 h-10 text-white/60 mx-auto mb-4" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Never Miss a Deal</h2>
            <p className="mt-2 text-white/80 text-sm max-w-sm mx-auto">
              Get exclusive coupon codes and flash sale alerts delivered to your WhatsApp.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Start Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
