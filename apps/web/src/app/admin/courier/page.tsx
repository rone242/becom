'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '@/lib/api';
import {
  Package, Truck, RefreshCw, RotateCcw, Wallet, AlertCircle,
  CheckCircle2, Clock, ExternalLink, CreditCard, MapPin, Search,
  ChevronRight, ArrowUpRight, BarChart3,
} from 'lucide-react';

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  in_review:                          { label: 'In Review',          bg: 'bg-yellow-50',  text: 'text-yellow-700',  dot: 'bg-yellow-400' },
  pending:                            { label: 'Pending',            bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400' },
  delivered:                          { label: 'Delivered',          bg: 'bg-green-50',   text: 'text-green-700',   dot: 'bg-green-500' },
  delivered_approval_pending:         { label: 'Delivered (Pending)',bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-400' },
  partial_delivered:                  { label: 'Partial Delivered',  bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  partial_delivered_approval_pending: { label: 'Partial (Pending)',  bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-300' },
  cancelled:                          { label: 'Cancelled',          bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
  cancelled_approval_pending:         { label: 'Cancelled (Pending)',bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400' },
  hold:                               { label: 'On Hold',            bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  unknown:                            { label: 'Unknown',            bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-300' },
};

function StatusBadge({ status }: { status?: string }) {
  const s = STATUS_META[status || ''] || STATUS_META.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CourierPage() {
  const qc = useQueryClient();
  const { toast, show } = useToast();
  const [tab, setTab] = useState<'parcels' | 'returns' | 'payments'>('parcels');
  const [search, setSearch] = useState('');
  const [returnModal, setReturnModal] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [returnReason, setReturnReason] = useState('');

  // ── Queries ──
  const { data: balance, isError: balanceError } = useQuery({
    queryKey: ['courier-balance'],
    queryFn: () => courierApi.getBalance().then((r) => r.data),
    retry: false,
  });

  const { data: bookedOrders = [], isLoading: loadingParcels } = useQuery({
    queryKey: ['courier-booked'],
    queryFn: () => courierApi.getBookedOrders().then((r) => r.data),
  });

  const { data: returns, isLoading: loadingReturns } = useQuery({
    queryKey: ['courier-returns'],
    queryFn: () => courierApi.getReturnRequests().then((r) => r.data),
    enabled: tab === 'returns',
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['courier-payments'],
    queryFn: () => courierApi.getPayments().then((r) => r.data),
    enabled: tab === 'payments',
  });

  // ── Mutations ──
  const refreshMut = useMutation({
    mutationFn: (orderId: string) => courierApi.refreshStatus(orderId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['courier-booked'] });
      show(`Status: ${res.data.delivery_status?.replace(/_/g, ' ')}`, 'success');
    },
    onError: (e: any) => show(e?.response?.data?.message || 'Refresh failed', 'error'),
  });

  const returnMut = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      courierApi.createReturn(orderId, reason),
    onSuccess: () => {
      setReturnModal(null);
      setReturnReason('');
      qc.invalidateQueries({ queryKey: ['courier-returns'] });
      show('Return request submitted to Steadfast', 'success');
    },
    onError: (e: any) => show(e?.response?.data?.message || 'Return failed', 'error'),
  });

  // ── Computed stats ──
  const orders = Array.isArray(bookedOrders) ? bookedOrders : [];
  const filtered = orders.filter((o: any) =>
    !search ||
    o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    o.trackingCode?.toLowerCase().includes(search.toLowerCase()) ||
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = [
    { label: 'Total Booked', value: orders.length, icon: Package, color: 'from-blue-500 to-blue-600', light: 'bg-blue-50 text-blue-700' },
    { label: 'Delivered', value: orders.filter((o: any) => o.courierStatus === 'delivered').length, icon: CheckCircle2, color: 'from-green-500 to-emerald-600', light: 'bg-green-50 text-green-700' },
    { label: 'In Transit', value: orders.filter((o: any) => ['in_review', 'pending'].includes(o.courierStatus)).length, icon: Truck, color: 'from-yellow-500 to-orange-500', light: 'bg-yellow-50 text-yellow-700' },
    { label: 'Cancelled', value: orders.filter((o: any) => o.courierStatus?.includes('cancel')).length, icon: AlertCircle, color: 'from-red-500 to-red-600', light: 'bg-red-50 text-red-700' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courier — Steadfast</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 ml-11">
            Manage parcel bookings, track delivery status, and handle returns
          </p>
        </div>

        {/* Balance card */}
        {balance && !balanceError ? (
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-white shadow-lg shadow-emerald-500/25">
            <Wallet className="h-5 w-5 opacity-90" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest opacity-75">Steadfast Balance</p>
              <p className="text-xl font-bold">৳{balance.current_balance?.toLocaleString() ?? '—'}</p>
            </div>
          </div>
        ) : balanceError ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
            <AlertCircle className="h-4 w-4" /> API credentials not set
          </div>
        ) : null}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, light }) => (
          <div key={label} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">{label}</p>
                <p className="mt-1.5 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            {orders.length > 0 && (
              <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${light}`}>
                <ArrowUpRight className="h-3 w-3" />
                {value > 0 ? Math.round((value / orders.length) * 100) : 0}% of total
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Tab header */}
        <div className="flex items-center gap-1 border-b border-gray-100 px-5 pt-4 dark:border-slate-800">
          {([
            { id: 'parcels', label: 'Booked Parcels', icon: Package, count: orders.length },
            { id: 'returns', label: 'Returns', icon: RotateCcw, count: undefined },
            { id: 'payments', label: 'Payments', icon: CreditCard, count: undefined },
          ] as const).map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count !== undefined && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === id ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}

          {/* Search (parcels tab) */}
          {tab === 'parcels' && (
            <div className="relative ml-auto mb-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, name, tracking..."
                className="w-64 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* ── Parcels Tab ── */}
        {tab === 'parcels' && (
          <>
            {loadingParcels ? (
              <div className="py-16 text-center text-sm text-gray-400">
                <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin opacity-30" />
                Loading parcels...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="mx-auto mb-3 h-10 w-10 text-gray-200 dark:text-slate-700" />
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
                  {search ? 'No parcels match your search' : 'No parcels booked yet'}
                </p>
                <p className="mt-1 text-xs text-gray-400">Go to Orders → click "Book with Steadfast"</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/60">
                    <tr>
                      {['Order #', 'Customer', 'Amount (COD)', 'Tracking Code', 'Consignment', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {filtered.map((order: any) => (
                      <tr key={order.id} className="group hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-bold text-gray-700 dark:text-slate-300">
                            #{order.orderNumber?.slice(-8)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900 dark:text-white">{order.customerName}</p>
                          <p className="text-xs text-gray-500">{order.customerPhone}</p>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-primary">৳{order.total?.toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          {order.trackingCode ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{order.trackingCode}</span>
                              <a
                                href={`https://steadfast.com.bd/t/${order.trackingCode}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-300 hover:text-blue-500 transition-colors"
                                title="Track on Steadfast"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-500 dark:text-slate-500">
                          {order.consignmentId || '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={order.courierStatus} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => refreshMut.mutate(order.id)}
                              disabled={refreshMut.isPending}
                              title="Refresh status from Steadfast"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-40 dark:hover:bg-blue-900/20"
                            >
                              <RefreshCw className={`h-4 w-4 ${refreshMut.isPending ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => setReturnModal({ orderId: order.id, orderNumber: order.orderNumber })}
                              title="Create return request"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-900/20"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Returns Tab ── */}
        {tab === 'returns' && (
          <>
            {loadingReturns ? (
              <div className="py-16 text-center text-sm text-gray-400">
                <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin opacity-30" />
                Loading returns...
              </div>
            ) : !returns?.data?.length ? (
              <div className="py-16 text-center">
                <RotateCcw className="mx-auto mb-3 h-10 w-10 text-gray-200 dark:text-slate-700" />
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">No return requests yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/60">
                    <tr>
                      {['Consignment ID', 'Tracking Code', 'Invoice', 'Recipient', 'Amount', 'Status'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {returns.data.map((r: any) => (
                      <tr key={r.consignment_id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-600 dark:text-slate-400">{r.consignment_id}</td>
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{r.tracking_code}</td>
                        <td className="px-5 py-3.5 text-gray-700 dark:text-slate-300">{r.invoice}</td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900 dark:text-white">{r.recipient_name}</p>
                          <p className="text-xs text-gray-500">{r.recipient_phone}</p>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-primary">৳{r.cod_amount}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={r.delivery_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Payments Tab ── */}
        {tab === 'payments' && (
          <>
            {loadingPayments ? (
              <div className="py-16 text-center text-sm text-gray-400">
                <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin opacity-30" />
                Loading payments...
              </div>
            ) : !payments?.data?.length ? (
              <div className="py-16 text-center">
                <CreditCard className="mx-auto mb-3 h-10 w-10 text-gray-200 dark:text-slate-700" />
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">No payments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/60">
                    <tr>
                      {['Date', 'Amount', 'Delivered', 'Returned', 'Charge', 'Net Payable'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {payments.data.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 text-gray-600 dark:text-slate-400">{p.date || '—'}</td>
                        <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">৳{p.amount?.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-green-600 font-semibold">{p.delivered_count ?? '—'}</td>
                        <td className="px-5 py-3.5 text-red-600 font-semibold">{p.returned_count ?? '—'}</td>
                        <td className="px-5 py-3.5 text-gray-500">৳{p.charge?.toLocaleString() ?? '—'}</td>
                        <td className="px-5 py-3.5 font-bold text-primary">৳{p.net_payable?.toLocaleString() ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Return Modal ── */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReturnModal(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                <RotateCcw className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Create Return Request</h3>
                <p className="text-xs text-gray-500">Order #{returnModal.orderNumber.slice(-8)}</p>
              </div>
            </div>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={3}
              placeholder="Reason for return (optional)"
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setReturnModal(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={() => returnMut.mutate({ orderId: returnModal.orderId, reason: returnReason })}
                disabled={returnMut.isPending}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {returnMut.isPending ? 'Submitting...' : 'Submit Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-xl transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
