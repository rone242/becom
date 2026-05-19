'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { PageHeader } from '@/components/admin/ui';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#1a6b2f', '#4ade80', '#f59e0b', '#60a5fa', '#f87171', '#c084fc'];

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<'months' | 'weeks'>('months');

  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsApi.getSummary().then((r) => r.data),
  });

  const { data: revenueRaw } = useQuery({
    queryKey: ['analytics', 'revenue', period],
    queryFn: () => analyticsApi.getRevenue(period).then((r) => r.data),
  });

  const { data: catSalesRaw } = useQuery({
    queryKey: ['analytics', 'sales-by-category'],
    queryFn: () => analyticsApi.getSalesByCategory().then((r) => r.data),
  });

  const revenue = Array.isArray(revenueRaw) ? revenueRaw : [];
  const catSales = Array.isArray(catSalesRaw) ? catSalesRaw : [];

  const statuses: any[] = Array.isArray(summary?.orderStatuses) ? summary.orderStatuses : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Business performance overview" />

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Revenue Over Time</h2>
          <div className="flex gap-1">
            {(['months', 'weeks'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${period === p ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        {revenue.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">No revenue data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`৳${Number(v).toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#1a6b2f" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Sales by Category Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Sales by Category</h2>
          {catSales.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catSales} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: any) => [`৳${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {catSales.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order status pie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Order Status Breakdown</h2>
          {statuses.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">No orders yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statuses} dataKey="_count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}>
                  {statuses.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary stats table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4">Summary</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: `৳${Number(summary?.totalRevenue ?? 0).toLocaleString()}` },
            { label: 'Total Orders', value: String(summary?.totalOrders ?? 0) },
            { label: 'Total Customers', value: String(summary?.totalUsers ?? 0) },
            { label: 'Revenue Growth (30d)', value: `${summary?.revenueGrowth ?? 0}%` },
            { label: 'Current Period Revenue', value: `৳${Number(summary?.currentPeriodRevenue ?? 0).toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
