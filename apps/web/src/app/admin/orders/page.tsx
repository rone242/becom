'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Eye, PackageCheck, Truck, XCircle, ExternalLink } from 'lucide-react';
import { ordersApi, courierApi } from '@/lib/api';
import {
  Modal, Field, PageHeader,
  DataTable, Th, Td, StatusBadge, EmptyState,
} from '@/components/admin/ui';

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const STATUS_ACTIONS = [
  { status: 'CONFIRMED', label: 'Confirm', icon: CheckCircle2, className: 'text-blue-700 bg-blue-50 hover:bg-blue-100' },
  { status: 'PROCESSING', label: 'Process', icon: PackageCheck, className: 'text-purple-700 bg-purple-50 hover:bg-purple-100' },
  { status: 'SHIPPED', label: 'Ship', icon: Truck, className: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100' },
  { status: 'DELIVERED', label: 'Done', icon: CheckCircle2, className: 'text-green-700 bg-green-50 hover:bg-green-100' },
  { status: 'CANCELLED', label: 'Cancel', icon: XCircle, className: 'text-red-700 bg-red-50 hover:bg-red-100' },
];

function getFraudCheck(order: any, duplicatePhoneCount = 1) {
  const reasons: string[] = [];
  let score = 8;
  const total = Number(order.total || 0);
  const phone = String(order.customerPhone || '').replace(/\D/g, '');
  const address = String(order.address || '').trim();
  const note = String(order.note || '').toLowerCase();

  if (duplicatePhoneCount > 2) {
    score += 24;
    reasons.push(`${duplicatePhoneCount} orders from this phone`);
  }
  if (phone.length < 10) {
    score += 20;
    reasons.push('Phone looks incomplete');
  }
  if (address.length < 12) {
    score += 18;
    reasons.push('Address is too short');
  }
  if (total >= 5000) {
    score += 18;
    reasons.push('High value order');
  }
  if (order.deliveryZone === 'OUTSIDE_DHAKA') {
    score += 10;
    reasons.push('Outside Dhaka delivery');
  }
  if (/(urgent|fake|test|asap|call later)/i.test(note)) {
    score += 12;
    reasons.push('Risky note keywords');
  }

  const finalScore = Math.min(score, 100);
  return {
    score: finalScore,
    level: finalScore >= 65 ? 'High' : finalScore >= 35 ? 'Medium' : 'Low',
    reasons: reasons.length ? reasons : ['No obvious risk signals'],
  };
}

function FraudMeter({ score, level }: { score: number; level: string }) {
  const color = score >= 65 ? 'bg-red-500' : score >= 35 ? 'bg-amber-500' : 'bg-green-500';
  const text = score >= 65 ? 'text-red-700 bg-red-50' : score >= 35 ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50';

  return (
    <div className="min-w-28">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${text}`}>{level}</span>
        <span className="text-xs font-bold text-gray-700">{score}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => ordersApi.getMyOrders().then((r) => r.data),
  });

  const allOrders = Array.isArray(data) ? data : [];
  const phoneCounts = allOrders.reduce<Record<string, number>>((acc, order: any) => {
    const phone = String(order.customerPhone || '').replace(/\D/g, '');
    if (phone) acc[phone] = (acc[phone] || 0) + 1;
    return acc;
  }, {});
  const orders = allOrders.filter((o: any) =>
    statusFilter ? o.status === statusFilter : true
  );
  const statusCounts = STATUSES.reduce<Record<string, number>>((acc, status) => {
    acc[status] = allOrders.filter((order: any) => order.status === status).length;
    return acc;
  }, {});

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const bookMut = useMutation({
    mutationFn: (orderId: string) => courierApi.bookOrder(orderId),
    onSuccess: (res, orderId) => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['courier-booked'] });
      if (viewing?.id === orderId) {
        setViewing((prev: any) => ({
          ...prev,
          trackingCode: res.data.tracking_code,
          consignmentId: res.data.consignment_id,
          courierStatus: res.data.status,
        }));
      }
    },
  });

  const updateOrderStatus = (order: any, status: string) => {
    updateMut.mutate({ id: order.id, status });
    if (viewing?.id === order.id) setViewing((prev: any) => ({ ...prev, status }));
  };

  const viewingPhoneKey = String(viewing?.customerPhone || '').replace(/\D/g, '');
  const viewingFraud = viewing ? getFraudCheck(viewing, phoneCounts[viewingPhoneKey] || 1) : null;

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${orders.length} order(s)`} />

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('')}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
            statusFilter === '' ? 'bg-primary text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          All <span className="ml-1 opacity-70">{allOrders.length}</span>
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
              statusFilter === status ? 'bg-primary text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {status} <span className="ml-1 opacity-70">{statusCounts[status] || 0}</span>
          </button>
        ))}
      </div>

      <DataTable>
        <thead>
          <tr>
            <Th>Order ID</Th><Th>Customer</Th><Th>Phone</Th>
            <Th>Items</Th><Th>Total</Th><Th>Fraud Check</Th><Th>Status</Th><Th>Courier</Th><Th>Date</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>}
          {!isLoading && orders.length === 0 && <tr><td colSpan={9}><EmptyState message="No orders found." /></td></tr>}
          {orders.map((o: any) => {
            const phoneKey = String(o.customerPhone || '').replace(/\D/g, '');
            const fraud = getFraudCheck(o, phoneCounts[phoneKey] || 1);
            return (
            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
              <Td><code className="text-xs text-gray-500">{o.id.slice(0, 8)}…</code></Td>
              <Td><span className="font-medium text-gray-900">{o.customerName || '—'}</span></Td>
              <Td>{o.customerPhone || '—'}</Td>
              <Td>{o.items?.length ?? 0}</Td>
              <Td><span className="font-bold text-primary">৳{o.total}</span></Td>
              <Td><FraudMeter score={fraud.score} level={fraud.level} /></Td>
              <Td><StatusBadge status={o.status} /></Td>
              <Td>
                {o.trackingCode ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                    {o.trackingCode}
                  </span>
                ) : (
                  <button
                    onClick={() => bookMut.mutate(o.id)}
                    disabled={bookMut.isPending}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50"
                  >
                    <Truck className="h-3 w-3" /> Book
                  </button>
                )}
              </Td>
              <Td className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</Td>
              <Td>
                <div className="flex items-center gap-1.5">
                  {STATUS_ACTIONS.filter((action) => action.status !== o.status).slice(0, 2).map(({ status, label, icon: Icon, className }) => (
                    <button
                      key={status}
                      onClick={() => updateOrderStatus(o, status)}
                      disabled={updateMut.isPending}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition disabled:opacity-50 ${className}`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                  <button onClick={() => setViewing(o)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </Td>
            </tr>
            );
          })}
        </tbody>
      </DataTable>

      {/* Order Detail Modal */}
      {viewing && (
        <Modal title={`Order #${viewing.id.slice(0, 8)}`} onClose={() => setViewing(null)} size="lg">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400 text-xs">Customer</p><p className="font-semibold">{viewing.customerName}</p></div>
              <div><p className="text-gray-400 text-xs">Phone</p><p className="font-semibold">{viewing.customerPhone}</p></div>
              <div><p className="text-gray-400 text-xs">Address</p><p className="font-semibold">{viewing.address}</p></div>
              <div><p className="text-gray-400 text-xs">Status</p><StatusBadge status={viewing.status} /></div>
              <div><p className="text-gray-400 text-xs">Delivery Zone</p><p className="font-semibold">{viewing.deliveryZone?.replace('_', ' ') || '—'}</p></div>
              <div><p className="text-gray-400 text-xs">Note</p><p className="font-semibold">{viewing.note || '—'}</p></div>
            </div>

            {viewingFraud && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h4 className="text-sm font-bold text-gray-900">Fraud Check Meter</h4>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Calculated from phone, address, order value, delivery zone, and notes.</p>
                  </div>
                  <FraudMeter score={viewingFraud.score} level={viewingFraud.level} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {viewingFraud.reasons.map((reason) => (
                    <span key={reason} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">Items</h4>
              <div className="space-y-2">
                {(viewing.items || []).map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{item.productName}</span>
                      {item.weight && <span className="text-gray-400 ml-1">({item.weight})</span>}
                      <span className="text-gray-400 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-bold text-gray-900">৳{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>৳{viewing.subtotal ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>৳{viewing.deliveryCharge ?? '—'}</span></div>
              {viewing.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-৳{viewing.discount}</span></div>}
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2"><span>Total</span><span>৳{viewing.total}</span></div>
            </div>

            {/* Steadfast Courier Section */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-indigo-900">Steadfast Courier</h4>
                </div>
                {viewing.trackingCode ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-indigo-500">Tracking</p>
                      <p className="font-mono font-bold text-indigo-700">{viewing.trackingCode}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                      {(viewing.courierStatus || 'in_review').replace(/_/g, ' ')}
                    </span>
                    <a
                      href={`https://steadfast.com.bd/track/${viewing.trackingCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 text-indigo-500 hover:bg-indigo-100 transition"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={() => bookMut.mutate(viewing.id)}
                    disabled={bookMut.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    <Truck className="h-4 w-4" />
                    {bookMut.isPending ? 'Booking...' : 'Book with Steadfast'}
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Field label="Status Actions">
                <div className="flex flex-wrap gap-2">
                  {STATUS_ACTIONS.map(({ status, label, icon: Icon, className }) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateOrderStatus(viewing, status)}
                      disabled={viewing.status === status || updateMut.isPending}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
