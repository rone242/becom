'use client';

// Rich-text content renderer (avoids @tailwindcss/typography dependency)
function RichContent({ html, fallback }: { html?: string; fallback: string }) {
  const content = html || fallback;
  return (
    <div
      className="[&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:text-base [&_h3]:mb-3 [&_p]:text-gray-600 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:space-y-2 [&_li]:text-sm [&_li]:text-gray-600 [&_li]:flex [&_li]:items-start [&_li]:gap-2 [&_li]:before:content-['✓'] [&_li]:before:text-green-500 [&_li]:before:font-bold [&_li]:before:mt-0.5"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, ShoppingCart, Minus, Plus, Phone, MessageCircle,
  Truck, RefreshCw, ShieldCheck, Headphones, ChevronLeft,
  Check,
} from 'lucide-react';
import { productsApi, reviewsApi, settingsApi } from '@/lib/api';
import { useCartStore } from '@/store/cart.store';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useSession } from 'next-auth/react';
import { pushDataLayerEvent, toDataLayerItem } from '@/lib/dataLayer';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toArray(d: any): any[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.items)) return d.items;
  return [];
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= Math.round(rating) ? 'fill-accent text-accent' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </div>
  );
}

// ─── Trust Badges ─────────────────────────────────────────────────────────────
const TRUST_BADGES = [
  { icon: Truck,       label: 'Free Delivery',       sub: 'On orders above $30'    },
  { icon: RefreshCw,   label: 'Easy 7 days return',  sub: 'Hassle-free guarantee'  },
  { icon: ShieldCheck, label: 'International Warranty', sub: 'Quality guaranteed'  },
  { icon: Headphones,  label: '100% Secure checkout', sub: 'SSL encrypted payment' },
];

// ─── Related Product Card ─────────────────────────────────────────────────────
function RelatedCard({ product }: { product: any }) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex-shrink-0 w-36 sm:w-44 border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&h=300&fit=crop'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-2">
        <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">{product.name}</p>
        <StarRow rating={product.rating || 4} />
        <p className="text-sm font-bold text-primary mt-1">৳{product.price}</p>
        <button
          onClick={(e) => {
            e.preventDefault();
            addItem({ productId: product.id, productName: product.name, productImage: product.images?.[0] || '', price: product.price, quantity: 1, weight: product.weight });
          }}
          className="mt-1.5 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-hover transition-colors ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </Link>
  );
}

// ─── Review Form ──────────────────────────────────────────────────────────────
function ReviewForm({ productId }: { productId: string }) {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => reviewsApi.create({ productId, rating, comment }),
    onSuccess: () => {
      setSubmitted(true);
      setComment('');
      qc.invalidateQueries({ queryKey: ['product'] });
    },
  });

  if (!session) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-gray-500">
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">Sign in</Link> to leave a review.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
        <Check className="w-4 h-4" /> Your review has been submitted!
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h4 className="font-semibold text-gray-800 mb-3">Write a Review</h4>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map((i) => (
          <button key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => setRating(i)}>
            <Star className={`w-6 h-6 ${i <= (hover || rating) ? 'fill-accent text-accent' : 'fill-gray-200 text-gray-200'} transition-colors`} />
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience..."
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
      />
      <button
        onClick={() => mutate()}
        disabled={isPending || !comment.trim()}
        className="mt-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'details' | 'tnc' | 'reviews'>('details');
  const [added, setAdded] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug).then((r) => r.data),
    enabled: !!slug,
  });

  const { data: siteSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 60 * 1000, // 60 seconds
  });

  const product = data;
  const related: any[] = toArray(product?.related);
  const reviews: any[] = toArray(product?.reviews);
  const images: string[] = product?.images?.length ? product.images : [
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop',
  ];

  useEffect(() => {
    if (!product?.id) return;
    pushDataLayerEvent({
      event: 'view_item',
      ecommerce: {
        currency: 'BDT',
        value: Number(product.price || 0),
        items: [toDataLayerItem(product)],
      },
    });
  }, [product]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: images[0],
      price: product.price,
      quantity: qty,
      weight: product.weight,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleOrderNow = () => {
    handleAddToCart();
    if (product) {
      pushDataLayerEvent({
        event: 'begin_checkout',
        ecommerce: {
          currency: 'BDT',
          value: Number(product.price || 0) * qty,
          items: [toDataLayerItem(product, qty)],
        },
      });
    }
    router.push('/checkout');
  };

  const whatsappMsg = product?.whatsappText
    ? encodeURIComponent(product.whatsappText)
    : encodeURIComponent(`Hi, I'd like to order: ${product?.name}`);

  // Dynamic contact from admin settings
  const sitePhone = siteSettings?.phone || '01712345678';
  const siteWhatsapp = siteSettings?.whatsappNumber || '8801712345678';

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="container-main py-10">
          <div className="animate-pulse grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-xl" />
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-10 bg-gray-200 rounded w-1/3" />
              <div className="h-12 bg-gray-200 rounded w-full" />
              <div className="h-12 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (isError || !product) {
    return (
      <>
        <Navbar />
        <div className="container-main py-20 text-center">
          <p className="text-gray-500 text-lg mb-4">Product not found.</p>
          <Link href="/shop" className="btn-primary">Back to Shop</Link>
        </div>
        <Footer />
      </>
    );
  }

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen">

        {/* ─── Breadcrumb ──────────────────────────────────────────────────── */}
        <div className="container-main pt-4 pb-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* ─── Product Hero ────────────────────────────────────────────────── */}
        <section className="container-main pb-10">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-10 items-start">

            {/* Left — Image Gallery */}
            <div className="flex flex-col gap-3">
              {/* Main Image */}
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                {product.isOrganic && (
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-accent text-white text-xs font-bold rounded-full uppercase tracking-wide">
                    Pure Organic
                  </span>
                )}
                {discount && (
                  <span className="absolute top-3 right-3 z-10 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    -{discount}%
                  </span>
                )}
                <Image
                  src={images[activeImage]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {images.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        activeImage === i ? 'border-primary' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Image src={img} alt={`Thumbnail ${i + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right — Product Info */}
            <div className="flex flex-col gap-4">
              {/* Category & Brand */}
              <div className="flex items-center gap-2 flex-wrap">
                {product.category && (
                  <Link
                    href={`/shop?category=${product.category.slug}`}
                    className="text-xs text-primary font-semibold uppercase tracking-wide hover:underline"
                  >
                    {product.category.name}
                  </Link>
                )}
                {product.brand && (
                  <span className="text-xs text-gray-400">· {product.brand.name}</span>
                )}
              </div>

              {/* Name */}
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary leading-snug">
                {product.name}
                {product.weight && (
                  <span className="text-gray-400 font-normal text-xl"> {product.weight}</span>
                )}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <StarRow rating={product.rating || 0} size="md" />
                <span className="text-sm text-gray-500">
                  ({product.reviewCount || 0} Customer Reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  ৳{product.price}
                </span>
                {product.comparePrice && (
                  <span className="text-lg text-gray-400 line-through">৳{product.comparePrice}</span>
                )}
              </div>

              {/* Quantity */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Quantity</p>
                <div className="flex items-center gap-0">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 border border-gray-300 rounded-l-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="w-12 h-9 border-t border-b border-gray-300 flex items-center justify-center text-sm font-bold text-gray-800">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="w-9 h-9 border border-gray-300 rounded-r-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Stock */}
              {product.stock !== undefined && product.stock !== null && (
                <p className={`text-xs font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {product.stock > 0 ? `✓ In Stock (${product.stock} left)` : '✗ Out of Stock'}
                </p>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-bold text-sm transition-all duration-200 active:scale-95 ${
                    added
                      ? 'bg-green-600 text-white'
                      : 'bg-primary text-white hover:bg-primary-hover'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {added ? 'Added to Cart ✓' : 'Add to Cart'}
                </button>

                <button
                  onClick={handleOrderNow}
                  disabled={product.stock === 0}
                  className="w-full py-3.5 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50"
                >
                  Order Now
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${sitePhone}`}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
                  >
                    <Phone className="w-4 h-4" /> Call Us
                  </a>
                  <a
                    href={`https://wa.me/${siteWhatsapp}?text=${whatsappMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </div>
              </div>

              {/* Mini trust badges */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  100% Organic &amp; Sustainably Sourced
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Same-day delivery available in Dhaka
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tabs ────────────────────────────────────────────────────────── */}
        <section className="border-t border-gray-100">
          <div className="container-main">
            {/* Tab Bar */}
            <div className="flex gap-0 border-b border-gray-200 overflow-x-auto no-scrollbar">
              {([
                { key: 'details',  label: 'Details'  },
                { key: 'tnc',      label: 'T & C'    },
                { key: 'reviews',  label: 'Reviews'  },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    tab === key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="py-8">
              {tab === 'details' && (
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <RichContent
                    html={product.details}
                    fallback={`<h3>About this product</h3><p>${product.description || 'Premium quality organic product, sourced directly from trusted farmers.'}</p><ul><li>100% natural and organic certified</li><li>No artificial preservatives or additives</li><li>Directly sourced from organic farms</li><li>Fresh and hygienically packed</li></ul>`}
                  />
                  {images[1] && (
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
                      <Image src={images[1]} alt="Product detail" fill className="object-cover" />
                    </div>
                  )}
                </div>
              )}

              {tab === 'tnc' && (
                <div className="max-w-2xl">
                  <RichContent
                    html={product.termsAndConditions}
                    fallback="<h3>Terms &amp; Conditions</h3><ul><li>Products are non-refundable once delivered unless damaged or incorrect.</li><li>Delivery within 1–2 business days inside Dhaka.</li><li>Images are for illustration; actual product may vary slightly.</li><li>Store in a cool, dry place away from direct sunlight.</li><li>Check expiry date before use.</li></ul>"
                  />
                </div>
              )}

              {tab === 'reviews' && (
                <div className="max-w-2xl">
                  {/* Summary */}
                  <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-gray-900">{(product.rating || 0).toFixed(1)}</p>
                      <StarRow rating={product.rating || 0} size="md" />
                      <p className="text-xs text-gray-500 mt-1">{product.reviewCount || 0} reviews</p>
                    </div>
                  </div>

                  {/* Review list */}
                  {reviews.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No reviews yet. Be the first!</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((r: any) => (
                        <div key={r.id} className="border-b border-gray-100 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {r.user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-semibold text-gray-800">{r.user?.name || 'Anonymous'}</span>
                            <StarRow rating={r.rating} />
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed pl-9">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <ReviewForm productId={product.id} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Related Products ────────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="border-t border-gray-100 py-10">
            <div className="container-main">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Related Products</h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {related.map((p: any) => (
                  <RelatedCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Trust Badges ────────────────────────────────────────────────── */}
        <section className="border-t border-gray-100 bg-gray-50 py-10">
          <div className="container-main">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
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
