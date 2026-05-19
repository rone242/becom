'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Check, AlertCircle, Minus, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/store/cart.store';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ordersApi, settingsApi } from '@/lib/api';
import { pushDataLayerEvent, toCartDataLayerItems } from '@/lib/dataLayer';
import { tracker } from '@/lib/tracker';

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const total = useCartStore((s) => s.total());
  const deliveryZone = useCartStore((s) => s.deliveryZone);
  const deliveryCharge = useCartStore((s) => s.deliveryCharge);
  const coupon = useCartStore((s) => s.coupon);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const setDeliveryZone = useCartStore((s) => s.setDeliveryZone);

  const { data: deliverySettings } = useQuery({
    queryKey: ['settings-delivery'],
    queryFn: () => settingsApi.getDelivery().then((r) => r.data),
    staleTime: 60 * 1000, // 60 seconds
  });

  const DELIVERY_ZONES = [
    { value: 'INSIDE_DHAKA', label: 'Inside Dhaka', charge: deliverySettings?.insideCity ?? 60 },
    { value: 'OUTSIDE_DHAKA', label: 'Outside Dhaka', charge: deliverySettings?.outsideCity ?? 100 },
  ] as const;

  useEffect(() => {
    if (deliverySettings) {
      const charge = deliveryZone === 'INSIDE_DHAKA' ? deliverySettings.insideCity : deliverySettings.outsideCity;
      if (charge !== undefined && charge !== deliveryCharge) {
        setDeliveryZone(deliveryZone, charge);
      }
    }
  }, [deliverySettings, deliveryZone, deliveryCharge, setDeliveryZone]);

  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCouponApply = (e: React.FormEvent) => {
    e.preventDefault();
    const formElement = e.currentTarget as HTMLFormElement;
    const code = (formElement.elements.namedItem('coupon') as HTMLInputElement).value;

    if (code.trim()) {
      applyCoupon(code, Math.floor(subtotal * 0.1));
      formElement.reset();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const orderData = {
        customerName: form.name,
        customerPhone: form.phone,
        address: form.address,
        deliveryZone,
        couponCode: coupon?.code,
        note: form.notes,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const { data } = await ordersApi.create(orderData);
      
      const numItems = items.reduce((acc, item) => acc + item.quantity, 0);

      // Track using server-side analytics-router
      tracker.trackPurchase(
        data.orderNumber || data.id,
        total,
        numItems,
        'BDT',
        {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
        } as any
      );

      // Keep GTM layer push
      pushDataLayerEvent({
        event: 'purchase',
        ecommerce: {
          transaction_id: data.orderNumber || data.id,
          currency: 'BDT',
          value: total,
          coupon: coupon?.code,
          items: toCartDataLayerItems(items),
        },
      });

      setOrderId(data.id);
      setOrderPlaced(true);
      clearCart();

      // Redirect to order confirmation after 3 seconds
      setTimeout(() => {
        router.push(`/order/${data.id}`);
      }, 3000);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to place order. Please try again.';
      console.error('Order failed:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !orderPlaced) {
    return (
      <>
        <Navbar />
        <main className="bg-gray-50 min-h-screen">
          <div className="container-main py-8 text-center">
            <p className="text-gray-500 mb-4">Your cart is empty</p>
            <Link href="/" className="inline-block px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover">
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (orderPlaced) {
    return (
      <>
        <Navbar />
        <main className="bg-gray-50 min-h-screen">
          <div className="container-main py-16 text-center">
            <div className="inline-block p-4 rounded-full bg-green-100 mb-4">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
            <p className="text-gray-600 mb-2">Thank you for your purchase.</p>
            <p className="text-gray-500 mb-6">Order ID: <span className="font-mono font-bold">{orderId}</span></p>
            <p className="text-sm text-gray-500 mb-6">Redirecting to order details...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="bg-gray-50 min-h-screen">
        <div className="container-main py-8">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/" className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Cart & Checkout</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Cart Items ({items.length})</h2>
                  <button
                    type="button"
                    onClick={() => clearCart()}
                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                  >
                    Clear Cart
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <div key={item.id} className="py-4 flex gap-4">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={item.productImage || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=100&h=100&fit=crop'}
                          alt={item.productName}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{item.productName}</h3>
                        {item.weight && <p className="text-sm text-gray-500 mb-2">{item.weight}</p>}
                        <p className="font-bold text-primary text-lg">৳{item.price}</p>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Remove ${item.productName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="p-1 text-gray-500 hover:text-primary disabled:opacity-50"
                            aria-label={`Decrease ${item.productName} quantity`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1 text-gray-500 hover:text-primary"
                            aria-label={`Increase ${item.productName} quantity`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Delivery Information</h2>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Error</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                    <input
                      required
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                    <input
                      required
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="+880..."
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="your@email.com"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address *</label>
                  <input
                    required
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Street address"
                  />
                </div>



                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Order Notes</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Special instructions..."
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {loading ? 'Placing Order...' : 'Place Order'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4">Delivery Zone</h3>
                <div className="space-y-2">
                  {DELIVERY_ZONES.map((zone) => (
                    <label
                      key={zone.value}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderColor: deliveryZone === zone.value ? 'var(--color-primary)' : undefined }}
                    >
                      <input
                        type="radio"
                        name="zone"
                        value={zone.value}
                        checked={deliveryZone === zone.value}
                        onChange={() => setDeliveryZone(zone.value, zone.charge)}
                        className="w-4 h-4 accent-primary"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{zone.label}</p>
                        <p className="text-xs text-gray-500">৳{zone.charge}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4">Coupon Code</h3>
                {coupon ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-900 text-sm">{coupon.code}</p>
                      <p className="text-xs text-green-700">-৳{coupon.discount}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCoupon()}
                      className="text-green-600 hover:text-green-700 font-semibold text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCouponApply} className="flex gap-2">
                    <input
                      type="text"
                      name="coupon"
                      placeholder="Enter code"
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 sticky top-4">
                <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-900">৳{item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">৳{subtotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className="font-semibold">৳{deliveryCharge}</span>
                  </div>
                  {coupon && (
                    <div className="flex items-center justify-between text-green-600">
                      <span>Discount ({coupon.code})</span>
                      <span className="font-semibold">-৳{coupon.discount}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-primary text-xl">৳{total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
