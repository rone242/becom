'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackingApi } from '@/lib/api';
import {
  Activity, AlertCircle, CheckCircle2, ChevronRight, Eye, EyeOff,
  RefreshCw, Save, Settings2, TrendingUp, TrendingDown, Wifi, WifiOff,
  Zap, BarChart3, Send, XCircle, Calendar,
} from 'lucide-react';

// ─── Platform Config ──────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'FACEBOOK_CAPI',
    name: 'Facebook & Instagram',
    icon: '🟦',
    gradient: 'from-blue-600 to-indigo-700',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    fields: [
      { key: 'pixelId', label: 'Pixel ID', placeholder: '1234567890123456', secret: false },
      { key: 'accessToken', label: 'CAPI Access Token', placeholder: 'EAABsb...', secret: true },
    ],
  },
  {
    id: 'GOOGLE_ANALYTICS_4',
    name: 'Google Analytics 4',
    icon: '📊',
    gradient: 'from-orange-500 to-red-600',
    lightBg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    fields: [
      { key: 'measurementId', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX', secret: false },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'abc123XYZ...', secret: true },
    ],
  },
  {
    id: 'TIKTOK_CAPI',
    name: 'TikTok',
    icon: '🎵',
    gradient: 'from-pink-600 to-rose-700',
    lightBg: 'bg-pink-50',
    border: 'border-pink-200',
    badge: 'bg-pink-100 text-pink-700',
    fields: [
      { key: 'pixelCode', label: 'Pixel Code', placeholder: 'ABCDEFGHIJKLMN', secret: false },
      { key: 'accessToken', label: 'Access Token', placeholder: 'abc123...', secret: true },
    ],
  },
] as const;

type PlatformId = 'FACEBOOK_CAPI' | 'GOOGLE_ANALYTICS_4' | 'TIKTOK_CAPI';

interface Integration {
  id: string;
  platform: PlatformId;
  isActive: boolean;
  credentials: Record<string, string>;
  eventCount?: number;
  updatedAt: string;
}

interface StatsRow {
  date: string;
  platform: string;
  sent: number;
  failed: number;
}

interface DailyTotal {
  date: string;
  received: number;
  sent: number;
  failed: number;
}

interface StatsData {
  from: string;
  to: string;
  received: number;
  total: { sent: number; failed: number };
  rows: StatsRow[];
  dailyTotals: DailyTotal[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoDate(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function platformLabel(id: string) {
  return PLATFORMS.find((p) => p.id === id)?.name ?? id;
}

// ─── Daily Bar Chart ──────────────────────────────────────────────────────────
function DailyChart({ data }: { data: DailyTotal[] }) {
  if (!data.length) return null;
  const peak = Math.max(...data.map((d) => d.received || d.sent + d.failed), 1);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5" /> Daily Event Totals
      </p>
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => {
          const receivedH = Math.round(((d.received || d.sent + d.failed) / peak) * 100);
          const sentH     = Math.round(((d.sent)   / peak) * 100);
          const failedH   = Math.round(((d.failed) / peak) * 100);
          const label     = d.date.slice(5); // MM-DD
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}\nReceived: ${d.received}\nSent: ${d.sent}  Failed: ${d.failed}`}>
              <div className="w-full flex flex-col justify-end gap-px" style={{ height: '88px' }}>
                {/* received bar (background) */}
                {d.received > 0 && (
                  <div className="w-full rounded-t bg-violet-200" style={{ height: `${receivedH}%` }} />
                )}
                {/* sent overlay */}
                {d.sent > 0 && (
                  <div className="w-full rounded-t bg-emerald-400" style={{ height: `${sentH}%`, marginTop: d.received > 0 ? '-100%' : 0 }} />
                )}
                {/* failed overlay */}
                {d.failed > 0 && (
                  <div className="w-full rounded-t bg-red-400" style={{ height: `${failedH}%` }} />
                )}
                {/* empty */}
                {d.received === 0 && d.sent === 0 && d.failed === 0 && (
                  <div className="w-full rounded-t bg-gray-100" style={{ height: '4px' }} />
                )}
              </div>
              <span className="text-[9px] text-gray-400 font-medium">{label}</span>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-2">
        {[['bg-violet-200', 'Received'], ['bg-emerald-400', 'Sent'], ['bg-red-400', 'Failed']].map(([cls, lbl]) => (
          <div key={lbl} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
            <span className="text-[10px] text-gray-500 font-medium">{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field Input ──────────────────────────────────────────────────────────────
function FieldInput({
  label, value, onChange, placeholder, secret,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; secret: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────
function PlatformCard({
  platform, integration,
}: {
  platform: (typeof PLATFORMS)[number];
  integration?: Integration;
}) {
  const qc = useQueryClient();
  const isActive = integration?.isActive ?? false;
  const isConfigured = Object.keys(integration?.credentials ?? {}).length > 0;

  const [creds, setCreds] = useState<Record<string, string>>(
    (integration?.credentials as Record<string, string>) ?? {}
  );
  const [active, setActive] = useState(isActive);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const upsertMut = useMutation({
    mutationFn: () =>
      trackingApi.upsert(platform.id, {
        isActive: active,
        credentials: creds as Record<string, unknown>,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className={`rounded-xl border-2 bg-white shadow-sm transition-all ${
      expanded ? `${platform.border} shadow-md` : 'border-gray-100'
    }`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-2xl shrink-0`}>
          {platform.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{platform.name}</h3>
          <div className="flex gap-2 mt-1">
            {isConfigured ? (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${platform.badge} flex items-center gap-1`}>
                {isActive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isActive ? 'Active' : 'Paused'}
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Not configured
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
            expanded ? 'bg-gray-100 text-gray-700' : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          {expanded ? 'Hide' : 'Setup'}
        </button>
      </div>

      {expanded && (
        <div className={`border-t-2 ${platform.border} ${platform.lightBg} p-4 rounded-b-lg`}>
          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-bold text-gray-800">Status</p>
              <p className="text-xs text-gray-500 mt-1">
                {active ? 'Events dispatching →' : 'Paused →'}
              </p>
            </div>
            <button
              onClick={() => setActive((a) => !a)}
              className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {platform.fields.map((field) => (
              <FieldInput
                key={field.key}
                label={field.label}
                value={creds[field.key] ?? ''}
                onChange={(val) => setCreds((prev) => ({ ...prev, [field.key]: val }))}
                placeholder={field.placeholder}
                secret={field.secret}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
            {saved && (
              <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
            {upsertMut.isError && (
              <span className="text-sm font-semibold text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Error
              </span>
            )}
            {!saved && !upsertMut.isError && <div />}
            <button
              onClick={() => upsertMut.mutate()}
              disabled={upsertMut.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {upsertMut.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Event Stats Panel ────────────────────────────────────────────────────────
function EventStatsPanel() {
  const [days, setDays] = useState(7);

  const from = isoDate(-days + 1);
  const to   = isoDate(0);

  const { data: stats, isLoading, isError, refetch, isFetching } = useQuery<StatsData>({
    queryKey: ['tracking-stats', days],
    queryFn:  () => trackingApi.getStats(from, to),
    retry: 1,
    staleTime: 60_000,
  });

  const total      = stats?.total ?? { sent: 0, failed: 0 };
  const totalEvents = total.sent + total.failed;
  const successRate = totalEvents > 0
    ? Math.round((total.sent / totalEvents) * 100)
    : 0;

  // Per-platform totals
  const byPlatform: Record<string, { sent: number; failed: number }> = {};
  stats?.rows.forEach((r) => {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = { sent: 0, failed: 0 };
    byPlatform[r.platform].sent   += r.sent;
    byPlatform[r.platform].failed += r.failed;
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-gray-900">Event Delivery Stats</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range selector */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 transition-colors ${
                  days === d
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            title="Refresh stats"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {isError && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Stats unavailable — check analytics-router connection.
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Received',
              value: isLoading ? '—' : (stats?.received ?? 0).toLocaleString(),
              icon: Activity,
              color: 'bg-violet-500',
              sub: `Last ${days} days`,
            },
            {
              label: 'Sent OK',
              value: isLoading ? '—' : total.sent.toLocaleString(),
              icon: Send,
              color: 'bg-emerald-500',
              sub: <span className="text-emerald-600 font-bold">{isLoading ? '' : `${successRate}% success`}</span>,
            },
            {
              label: 'Failed',
              value: isLoading ? '—' : total.failed.toLocaleString(),
              icon: XCircle,
              color: total.failed > 0 ? 'bg-red-500' : 'bg-gray-400',
              sub: total.failed > 0
                ? <span className="text-red-500 font-bold">Needs attention</span>
                : <span className="text-gray-400">All clear</span>,
            },
            {
              label: 'Success Rate',
              value: isLoading ? '—' : `${successRate}%`,
              icon: successRate >= 90 ? TrendingUp : TrendingDown,
              color: successRate >= 90 ? 'bg-emerald-500' : successRate >= 70 ? 'bg-amber-500' : 'bg-red-500',
              sub: `${from} → ${to}`,
            },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
              <div className="flex items-end justify-between mt-2 gap-2">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Per-platform breakdown */}
        {!isLoading && Object.keys(byPlatform).length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Per-Platform Breakdown
            </p>
            <div className="space-y-2">
              {Object.entries(byPlatform).map(([pid, counts]) => {
                const total   = counts.sent + counts.failed;
                const pct     = total > 0 ? Math.round((counts.sent / total) * 100) : 0;
                const color   = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-500';
                return (
                  <div key={pid} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <span className="text-xl">
                      {PLATFORMS.find((p) => p.id === pid)?.icon ?? '📡'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {platformLabel(pid)}
                        </p>
                        <p className="text-xs font-bold text-gray-500 shrink-0 ml-2">
                          {counts.sent} sent · {counts.failed} failed
                        </p>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-bold w-10 text-right ${
                      pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && Object.keys(byPlatform).length === 0 && !(stats?.received) && (
          <div className="text-center py-8 text-gray-400">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">No events recorded yet</p>
            <p className="text-xs mt-1">Events will appear here once tracking is active</p>
          </div>
        )}

        {/* Daily bar chart — shows as soon as any events arrive */}
        {!isLoading && stats?.dailyTotals && stats.dailyTotals.length > 0 && (
          <DailyChart data={stats.dailyTotals} />
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-gray-100" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminTrackingPage() {
  const qc = useQueryClient();

  const { data: rawList, isLoading, isError, refetch } = useQuery({
    queryKey: ['tracking'],
    queryFn: () => trackingApi.getAll().then((r) => r.data as Integration[]),
    retry: 1,
  });

  const integrationMap: Record<string, Integration> = {};
  if (Array.isArray(rawList)) {
    rawList.forEach((item) => { integrationMap[item.platform] = item; });
  }

  const activeCount     = Object.values(integrationMap).filter((i) => i.isActive).length;
  const configuredCount = Object.values(integrationMap).filter(
    (i) => Object.keys(i.credentials ?? {}).length > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <span>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-primary">Tracking & Analytics</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-950">Tracking Integrations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage Facebook CAPI, Google Analytics 4, and TikTok tracking platforms.
          </p>
        </div>
        <button
          onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['tracking-stats'] }); }}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Quick summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Platforms', value: PLATFORMS.length, icon: Activity, color: 'bg-violet-500' },
          { label: 'Configured', value: isLoading ? '—' : configuredCount, icon: Settings2, color: 'bg-blue-500' },
          { label: 'Active', value: isLoading ? '—' : activeCount, icon: Zap, color: 'bg-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Event Stats Panel ── */}
      <EventStatsPanel />

      {/* Error banner */}
      {isError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Unable to connect to analytics-router</p>
            <p className="text-sm text-amber-800 mt-1">
              Run: <code className="bg-amber-100 px-1 rounded font-mono text-xs">docker compose up -d</code>
            </p>
          </div>
        </div>
      )}

      {/* Platform Cards */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
          Platform Integrations
        </p>
        <div className="space-y-3">
          {isLoading
            ? [1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg border border-gray-100 bg-gray-50 animate-pulse" />
              ))
            : PLATFORMS.map((platform) => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  integration={integrationMap[platform.id]}
                />
              ))}
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-900">
          ✓ Credentials are encrypted and cached in Redis (1h TTL)
        </p>
      </div>
    </div>
  );
}
