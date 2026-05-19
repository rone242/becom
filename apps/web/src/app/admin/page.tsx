'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import {
  TrendingUp, ShoppingBag, Users, DollarSign,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function StatCard({
  label, value, sub, icon: Icon, growth,
}: { label: string; value: string; sub: string; icon: any; growth?: number }) {
  const up = growth !== undefined && growth >= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {growth !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(growth)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

const CHART_COLORS = ['#1a6b2f', '#4ade80', '#f59e0b', '#60a5fa', '#f87171'];

export default function AdminDashboard() {
  const [revPeriod, setRevPeriod] = useState<'months' | 'weeks'>('months');

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsApi.getSummary().then((r) => r.data),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['analytics', 'revenue', revPeriod],
    queryFn: () => analyticsApi.getRevenue(revPeriod).then((r) => r.data),
  });

  const { data: catSales } = useQuery({
    queryKey: ['analytics', 'sales-by-category'],
    queryFn: () => analyticsApi.getSalesByCategory().then((r) => r.data),
  });

  const { data: recentOrdersData } = useQuery({
    queryKey: ['analytics', 'recent-orders'],
    queryFn: () => analyticsApi.getRecentOrders(8).then((r) => r.data),
  });

  const orders = Array.isArray(recentOrdersData) ? recentOrdersData : [];
  const cats = Array.isArray(catSales) ? catSales : [];
  const revenue = Array.isArray(revenueData) ? revenueData : [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={sumLoading ? '—' : `৳${Number(summary?.totalRevenue ?? 0).toLocaleString()}`}
          sub="All time (excl. cancelled)"
          growth={summary?.revenueGrowth}
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={sumLoading ? '—' : String(summary?.totalOrders ?? 0)}
          sub="vs last 30 days"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={sumLoading ? '—' : String(summary?.totalUsers ?? 0)}
          sub="Registered customers"
        />
        <StatCard
          icon={TrendingUp}
          label="Revenue Growth"
          value={sumLoading ? '—' : `${summary?.revenueGrowth ?? 0}%`}
          sub="vs previous 30 days"
          growth={summary?.revenueGrowth}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900">Revenue Over Time</h2>
              <p className="text-xs text-gray-400 mt-0.5">Revenue across selected period</p>
            </div>
            <div className="flex gap-1">
              {(['months', 'weeks'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setRevPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${revPeriod === p ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`৳${Number(v).toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#1a6b2f" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by category */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">Sales by Category</h2>
          <p className="text-xs text-gray-400 mb-4">Top performing categories</p>
          {cats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {cats.slice(0, 5).map((c: any, i: number) => {
                const total = cats.reduce((s: number, x: any) => s + x.revenue, 0);
                const pct = total > 0 ? Math.round((c.revenue / total) * 100) : 0;
                return (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 uppercase tracking-wide">{c.category}</span>
                      <span className="font-bold text-gray-900">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Recent Orders</h2>
          <a href="/admin/orders" className="text-xs font-semibold text-primary hover:underline">View All</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Order ID</th>
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-5 py-3">Items</th>
                <th className="text-left px-5 py-3">Total</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}…</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{o.customerName || o.userId?.slice(0, 8) || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{o.items?.length ?? 0}</td>
                  <td className="px-5 py-3 font-bold text-gray-900">৳{o.total}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
