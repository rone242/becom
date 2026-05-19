'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackingApi } from '@/lib/api';
import {
  Activity, AlertCircle, CheckCircle2, ChevronRight, Eye, EyeOff,
  RefreshCw, Save, Settings2, Trash2, Wifi, WifiOff, Zap, BarChart3,
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

// ─── Field Input ──────────────────────────────────────────────────────────────
function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  secret,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  secret: boolean;
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
  platform,
  integration,
}: {
  platform: (typeof PLATFORMS)[number];
  integration?: Integration;
}) {
  const qc = useQueryClient();
  const isActive = integration?.isActive ?? false;
  const isConfigured = Object.keys(integration?.credentials ?? {}).length > 0;

  // Local form state
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
      {/* Compact Header */}
      <div className="flex items-center gap-3 p-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-2xl shrink-0`}>
          {platform.icon}
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{platform.name}</h3>
          <div className="flex gap-2 mt-1">
            {isConfigured && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${platform.badge} flex items-center gap-1`}>
                {isActive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isActive ? 'Active' : 'Paused'}
              </span>
            )}
            {!isConfigured && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Not configured
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
            expanded
              ? 'bg-gray-100 text-gray-700'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          {expanded ? 'Hide' : 'Setup'}
        </button>
      </div>

      {/* Expanded Form */}
      {expanded && (
        <div className={`border-t-2 ${platform.border} ${platform.lightBg} p-4 rounded-b-lg`}>
          {/* Status Toggle */}
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

          {/* Credentials */}
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

          {/* Save */}
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
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

  const activeCount = Object.values(integrationMap).filter((i) => i.isActive).length;
  const configuredCount = Object.values(integrationMap).filter(
    (i) => Object.keys(i.credentials ?? {}).length > 0
  ).length;

  const totalEventCount = Object.values(integrationMap).reduce(
    (sum, i) => sum + (i.eventCount ?? 0), 0
  );

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
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: isLoading ? '—' : totalEventCount, icon: BarChart3, color: 'bg-purple-500' },
          { label: 'Platforms', value: PLATFORMS.length, icon: Activity, color: 'bg-violet-500' },
          { label: 'Configured', value: isLoading ? '—' : configuredCount, icon: Settings2, color: 'bg-blue-500' },
          { label: 'Active', value: isLoading ? '—' : activeCount, icon: Zap, color: 'bg-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Unable to connect</p>
            <p className="text-sm text-amber-800 mt-1">Make sure analytics-router is running: <code className="bg-amber-100 px-1 rounded font-mono text-xs">docker compose up -d</code></p>
          </div>
        </div>
      )}

      {/* Platform List */}
      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg border border-gray-100 bg-gray-50 animate-pulse" />
          ))
        ) : (
          PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              integration={integrationMap[platform.id]}
            />
          ))
        )}
      </div>

      {/* Footer Note */}
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-900">
          ✓ Credentials are encrypted and cached in Redis (1h TTL)
        </p>
      </div>
    </div>
  );
}
