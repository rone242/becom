'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  User, Package, Phone, Mail, Shield, LogOut, ChevronRight,
  ShoppingBag, Clock, CheckCircle2, XCircle, Truck, RefreshCw,
  Star, ArrowLeft, Eye, MapPin, Hash,
} from 'lucide-react';
import { usersApi } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  PENDING:    { label: 'Pending',     icon: Clock,         bg: 'bg-yellow-50',  text: 'text-yellow-700'  },
  CONFIRMED:  { label: 'Confirmed',   icon: CheckCircle2,  bg: 'bg-blue-50',    text: 'text-blue-700'    },
  PROCESSING: { label: 'Processing',  icon: RefreshCw,     bg: 'bg-purple-50',  text: 'text-purple-700'  },
  SHIPPED:    { label: 'Shipped',     icon: Truck,         bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
  DELIVERED:  { label: 'Delivered',   icon: CheckCircle2,  bg: 'bg-green-50',   text: 'text-green-700'   },
  CANCELLED:  { label: 'Cancelled',   icon: XCircle,       bg: 'bg-red-50',     text: 'text-red-700'     },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_META[status] || { label: status, icon: Package, bg: 'bg-gray-100', text: 'text-gray-600' };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${s.bg} ${s.text}`}>
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Order header */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-4 bg-gray-50/70 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="font-mono text-sm font-bold text-gray-700">
            {order.orderNumber || order.id?.slice(-8).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(order.createdAt)}
        </div>
        <StatusBadge status={order.status} />
        <div className="ml-auto font-bold text-primary text-base">
          ৳{order.total?.toLocaleString()}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary transition-colors"
        >
          <Eye className="h-4 w-4" />
          {expanded ? 'Hide' : 'Details'}
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Order products */}
      {expanded && (
        <div className="divide-y divide-gray-50 px-5 py-3">
          {/* Delivery info */}
          {order.address && (
            <div className="flex items-start gap-2 py-3 text-sm text-gray-600">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
              <span>{order.address}</span>
            </div>
          )}

          {/* Items */}
          <div className="py-3 space-y-3">
            {(order.items || []).map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                  {item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <div className="text-sm font-bold text-gray-800">
                  ৳{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="py-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">{order.items?.length || 0} item(s)</span>
            <div className="text-right">
              {order.note && (
                <p className="text-xs text-gray-500 italic mb-1">Note: {order.note}</p>
              )}
              <span className="font-bold text-gray-900">Total: ৳{order.total?.toLocaleString()}</span>
            </div>
          </div>

          {/* Tracking */}
          {order.trackingCode && (
            <div className="py-3 flex items-center gap-2 text-xs">
              <Truck className="h-4 w-4 text-blue-500" />
              <span className="text-gray-500">Tracking:</span>
              <a
                href={`https://steadfast.com.bd/t/${order.trackingCode}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold text-blue-600 hover:underline"
              >
                {order.trackingCode}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');

  const user = session?.user as any;

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => usersApi.myOrders().then((r) => r.data),
    enabled: !!session,
  });

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.replace('/auth/login');
    return null;
  }

  if (status === 'loading') {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-primary animate-spin opacity-40" />
        </div>
        <Footer />
      </>
    );
  }

  const orders: any[] = Array.isArray(ordersData) ? ordersData : [];

  const stats = [
    { label: 'Total Orders',  value: orders.length,                                                        icon: ShoppingBag,  color: 'from-violet-500 to-purple-600' },
    { label: 'Delivered',     value: orders.filter((o) => o.status === 'DELIVERED').length,                icon: CheckCircle2, color: 'from-green-500 to-emerald-600' },
    { label: 'In Progress',   value: orders.filter((o) => ['PENDING','CONFIRMED','PROCESSING','SHIPPED'].includes(o.status)).length, icon: Truck, color: 'from-blue-500 to-blue-600' },
    { label: 'Cancelled',     value: orders.filter((o) => o.status === 'CANCELLED').length,                icon: XCircle,      color: 'from-red-500 to-rose-600'      },
  ];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-50">
        {/* ── Hero banner ── */}
        <div className="bg-gradient-to-br from-primary via-green-600 to-emerald-700 text-white">
          <div className="container-main py-10">
            <Link href="/" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to shop
            </Link>
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl font-black text-white ring-2 ring-white/30 shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black">{user?.name || 'My Account'}</h1>
                <p className="text-white/70 text-sm mt-0.5">{user?.phone || user?.email || 'Customer'}</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
                  {user?.role === 'ADMIN' ? 'Admin' : 'Verified Customer'}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="ml-auto flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          </div>
        </div>

        <div className="container-main py-8 space-y-6">
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                    <p className="mt-1 text-3xl font-black text-gray-900">{value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 border-b border-gray-200">
            {([
              { id: 'orders',  label: 'My Orders',       icon: ShoppingBag },
              { id: 'profile', label: 'Account Details',  icon: User        },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Orders Tab ── */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="h-4 w-32 rounded bg-gray-200" />
                        <div className="h-4 w-20 rounded bg-gray-200" />
                        <div className="h-6 w-24 rounded-full bg-gray-200 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
                  <ShoppingBag className="mx-auto h-12 w-12 text-gray-200" />
                  <p className="mt-4 text-base font-bold text-gray-500">No orders yet</p>
                  <p className="mt-1 text-sm text-gray-400">Start shopping and your orders will appear here.</p>
                  <Link
                    href="/shop"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Browse Products
                  </Link>
                </div>
              ) : (
                orders.map((order) => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          )}

          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Full Name',   value: user?.name,  icon: User,   placeholder: 'Not set' },
                { label: 'Phone',       value: user?.phone, icon: Phone,  placeholder: 'Not set' },
                { label: 'Email',       value: user?.email, icon: Mail,   placeholder: 'Not set' },
                { label: 'Account Role',value: user?.role,  icon: Shield, placeholder: 'CUSTOMER' },
              ].map(({ label, value, icon: Icon, placeholder }) => (
                <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                      <p className="mt-0.5 font-bold text-gray-900 truncate">{value || placeholder}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="sm:col-span-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                <p className="font-semibold">Want to update your details?</p>
                <p className="mt-0.5 text-amber-600 text-xs">
                  Contact our support team or place a new order with updated information. Profile editing coming soon.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
