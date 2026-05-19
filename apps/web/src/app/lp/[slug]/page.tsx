'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Check, ChevronDown, Minus, Moon, Phone, Plus, ShieldCheck, ShoppingBag, Sparkles, Utensils,
} from 'lucide-react';
import { landingPagesApi, ordersApi, productsApi, settingsApi } from '@/lib/api';
import { pushDataLayerEvent, toDataLayerItem } from '@/lib/dataLayer';

function asMoney(value: number) {
  return `Tk ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CheckoutForm({ product, delivery, ctaText }: { product: any; delivery: any; ctaText: string }) {
  const [qty, setQty] = useState(1);
  const [zone, setZone] = useState<'INSIDE_DHAKA' | 'OUTSIDE_DHAKA'>('INSIDE_DHAKA');
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [done, setDone] = useState(false);

  const insideFee = delivery?.insideDhaka ?? 60;
  const outsideFee = delivery?.outsideDhaka ?? 100;
  const deliveryCharge = zone === 'INSIDE_DHAKA' ? insideFee : outsideFee;
  const subtotal = product.price * qty;
  const total = subtotal + deliveryCharge;

  const order = useMutation({
    mutationFn: () =>
      ordersApi.create({
        customerName: form.name,
        customerPhone: form.phone,
        address: form.address,
        deliveryZone: zone,
        items: [{ productId: product.id, quantity: qty }],
      }),
    onSuccess: (response) => {
      pushDataLayerEvent({
        event: 'purchase',
        ecommerce: {
          transaction_id: response.data?.orderNumber || response.data?.id,
          currency: 'BDT',
          value: total,
          items: [toDataLayerItem(product, qty)],
        },
      });
      setDone(true);
    },
  });

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-600">
          <Check className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-green-900">Order confirmed</h3>
        <p className="mt-1 text-sm text-green-700">We will contact you soon.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        order.mutate();
      }}
      className="space-y-4 rounded-lg border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-base font-bold text-gray-900">Billing</h3>
        <div className="mt-4 space-y-3">
          <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100" placeholder="Your name" />
          <input required value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100" placeholder="Mobile number" />
          <textarea required rows={3} value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="w-full resize-none rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100" placeholder="Delivery address" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          ['INSIDE_DHAKA', `Inside Dhaka (${asMoney(insideFee)})`],
          ['OUTSIDE_DHAKA', `Outside Dhaka (${asMoney(outsideFee)})`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setZone(key as any)}
            className={`rounded-md border px-3 py-2 text-left text-xs font-semibold ${zone === key ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-md bg-gray-50 p-3 text-sm">
        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{asMoney(subtotal)}</span></div>
        <div className="mt-1 flex justify-between text-gray-600"><span>Shipping</span><span>{asMoney(deliveryCharge)}</span></div>
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900"><span>Total</span><span className="text-green-700">{asMoney(total)}</span></div>
      </div>

      <button disabled={order.isPending} className="flex w-full items-center justify-center gap-2 rounded-md bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60">
        <ShoppingBag className="h-4 w-4" />
        {order.isPending ? 'Processing...' : `${ctaText} (${asMoney(total)})`}
      </button>
    </form>
  );
}

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [openFaq, setOpenFaq] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['landing-page-or-product', slug],
    enabled: !!slug,
    queryFn: async () => {
      try {
        const page = await landingPagesApi.getBySlug(slug).then((r) => r.data);
        return { page, product: page.product };
      } catch {
        const product = await productsApi.getBySlug(slug).then((r) => r.data);
        return { page: null, product };
      }
    },
  });

  const { data: delivery } = useQuery({
    queryKey: ['settings', 'delivery'],
    queryFn: () => settingsApi.getDelivery().then((r) => r.data),
    staleTime: 60 * 1000, // 60 seconds
  });

  const { data: siteSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 60 * 1000, // 60 seconds
  });

  const trackedProduct = data?.product;

  useEffect(() => {
    if (!trackedProduct?.id) return;
    pushDataLayerEvent({
      event: 'view_item',
      ecommerce: {
        currency: 'BDT',
        value: Number(trackedProduct.price || 0),
        items: [toDataLayerItem(trackedProduct)],
      },
    });
  }, [trackedProduct]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      </div>
    );
  }

  if (!data?.product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-gray-500">
        <p>Landing page not found.</p>
        <Link href="/" className="font-semibold text-green-700 hover:underline">Back to home</Link>
      </div>
    );
  }

  const page = data.page;
  const product = data.product;
  const title = page?.title || product.name;
  const subtitle = page?.subtitle || product.description;
  const ctaText = page?.ctaText || 'Order Now';
  const heroImage = page?.heroImage || product.images?.[0] || '';
  const gallery = page?.galleryImages?.length ? page.galleryImages : product.images || [];
  const benefits = page?.benefits?.length
    ? page.benefits
    : ['Pure and natural ingredients', 'Freshly packed for every order', 'Cash on delivery available', 'Trusted quality from our store'];
  const usageTips = page?.usageTips?.length
    ? page.usageTips
    : ['Use with tea, milk, or desserts', 'Perfect for daily family meals', 'Store in a cool and dry place'];

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-bold italic text-green-800">{siteSettings?.storeName || 'Site logo'}</Link>
          <nav className="hidden items-center gap-6 text-xs text-gray-600 sm:flex">
            <Link href="/">Home</Link>
            <Link href="/products">Products</Link>
            <Link href="/cart">Cart</Link>
          </nav>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            {siteSettings?.phone && <a href={`tel:${siteSettings.phone}`}><Phone className="h-4 w-4" /></a>}
            <Link href="/auth/login">Login</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <section className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-200/70">
          <div className="px-5 py-10 text-center sm:px-10">
            {page?.badgeText && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-4 py-1.5 text-xs font-bold text-green-800">
                <Sparkles className="h-3.5 w-3.5" /> {page.badgeText}
              </span>
            )}
            <h1 className="mx-auto mt-4 max-w-3xl rounded-full bg-green-100 px-5 py-3 text-2xl font-extrabold text-green-900 sm:text-4xl">
              {title}
            </h1>
            {subtitle && <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-600">{subtitle}</p>}
            <a href="#order-now" className="mt-6 inline-flex rounded-full bg-green-700 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-green-700/20 hover:bg-green-800">
              {ctaText}
            </a>

            <div className="relative mx-auto mt-12 max-w-lg">
              <div className="relative aspect-square rounded-lg bg-white shadow-xl shadow-slate-200">
                {heroImage && <Image src={heroImage} alt={title} fill priority className="object-contain p-8" />}
              </div>
              <div className="absolute bottom-6 right-0 rounded-md bg-white px-5 py-3 text-left shadow-lg ring-1 ring-gray-100">
                <p className="text-lg font-bold text-green-800">{asMoney(product.price)}</p>
                {product.weight && <p className="text-xs text-gray-400">{product.weight}</p>}
              </div>
            </div>

            <div className="mx-auto mt-8 max-w-2xl">
              <h2 className="text-lg font-bold text-gray-900">{page?.introTitle || `Why choose ${title}?`}</h2>
              {(page?.introText || product.description) && (
                <p className="mt-3 text-sm leading-7 text-gray-500">{page?.introText || product.description}</p>
              )}
            </div>
          </div>

          <div className="grid border-t border-gray-100 md:grid-cols-2">
            <div className="p-6 sm:p-8">
              <h3 className="mb-5 inline-flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-base font-bold text-green-800">
                <ShieldCheck className="h-4 w-4" /> Benefits
              </h3>
              <div className="space-y-4">
                {benefits.map((item: string) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-gray-700">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-green-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 p-6 sm:p-8 md:border-l md:border-t-0">
              <h3 className="mb-5 inline-flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-base font-bold text-green-800">
                <Utensils className="h-4 w-4" /> Usage and Recipes
              </h3>
              <div className="space-y-4">
                {usageTips.map((item: string) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-gray-700">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-orange-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(page?.highlightText || title) && (
            <div className="bg-green-700 px-5 py-5 text-center text-lg font-bold text-white">
              {page?.highlightText || title}
            </div>
          )}

          {gallery.length > 0 && (
            <div className="px-5 py-10 text-center sm:px-10">
              <h2 className="mb-8 text-lg font-bold text-gray-900">See the product</h2>
              <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
                {gallery.slice(0, 4).map((img: string, index: number) => (
                  <div key={`${img}-${index}`} className="relative aspect-square rounded-lg bg-white shadow-md ring-1 ring-gray-100">
                    <Image src={img} alt={`${title} ${index + 1}`} fill className="object-contain p-6" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <section id="order-now" className="bg-yellow-50 px-5 py-10 sm:px-10">
            <h2 className="mb-6 text-center text-xl font-extrabold text-orange-600">Complete the form to order "{title}"</h2>
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_0.9fr]">
              <CheckoutForm product={product} delivery={delivery} ctaText={ctaText} />
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900">Order Summary</h3>
                  <div className="mt-4 flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 rounded-md bg-gray-50">
                      {heroImage && <Image src={heroImage} alt={title} fill className="object-contain p-2" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                      <p className="mt-1 text-sm font-bold text-green-800">{asMoney(product.price)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-green-100 bg-green-50 p-5 text-sm leading-6 text-green-800">
                  <ShieldCheck className="mb-2 h-5 w-5" />
                  Secure cash on delivery. Your order goes directly to the admin order list.
                </div>
              </div>
            </div>
          </section>
        </section>

        <button
          onClick={() => setOpenFaq((value) => !value)}
          className="mx-auto mt-8 flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white"
        >
          Have questions? <ChevronDown className={`h-4 w-4 transition-transform ${openFaq ? 'rotate-180' : ''}`} />
        </button>
        {openFaq && (
          <div className="mx-auto mt-3 max-w-xl rounded-lg bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
            Orders are confirmed by phone. Delivery charge is calculated from your selected delivery area.
          </div>
        )}
      </main>

      <button className="fixed bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg ring-1 ring-gray-100">
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}
