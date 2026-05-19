'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, BellRing, Box, CheckCircle2, ChevronRight, CreditCard, DollarSign,
  FileText, Gift, Globe2, LockKeyhole, MapPin, Megaphone, MessageSquare,
  MousePointer2, PackageCheck, Percent, Search, Settings2, ShieldAlert, Store,
  ShoppingCart, Smartphone, Target, Truck, UserRound, WalletCards, X, Database,
} from 'lucide-react';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { settingsApi } from '@/lib/api';

const CATEGORIES = ['All', 'Orders', 'Marketing', 'Integrations', 'Storefront', 'Finance', 'System'] as const;

const SETTINGS = [
  { title: 'Site Management', subtitle: 'Update store identity, homepage hero, announcement, and contact details.', category: 'Storefront', icon: Store, color: 'bg-emerald-50 dark:bg-emerald-500/10', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300' },
  { title: 'Delivery Charge', subtitle: 'Configure shipping zones, fees, and free delivery rules.', category: 'Orders', icon: Truck, color: 'bg-emerald-50 dark:bg-emerald-500/10', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300' },
  { title: 'Advance Payment', subtitle: 'Require partial payment for selected order types.', category: 'Finance', icon: WalletCards, color: 'bg-amber-50 dark:bg-amber-500/10', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300' },
  { title: 'SMS Settings', subtitle: 'Set OTP, order updates, and promotional message templates.', category: 'Integrations', icon: Smartphone, color: 'bg-sky-50 dark:bg-sky-500/10', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300' },
  { title: 'Courier Integration', subtitle: 'Connect couriers and automate parcel booking.', category: 'Integrations', icon: PackageCheck, color: 'bg-violet-50 dark:bg-violet-500/10', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300' },
  { title: 'Fraud Check API', subtitle: 'Screen customers before confirming risky orders.', category: 'Integrations', icon: ShieldAlert, color: 'bg-rose-50 dark:bg-rose-500/10', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300' },
  { title: 'Payment Methods', subtitle: 'Manage cash on delivery, gateways, and bank payments.', category: 'Finance', icon: CreditCard, color: 'bg-cyan-50 dark:bg-cyan-500/10', badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300' },
  { title: 'Social Login', subtitle: 'Allow customers to sign in with social accounts.', category: 'Storefront', icon: UserRound, color: 'bg-indigo-50 dark:bg-indigo-500/10', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300' },
  { title: 'Facebook Pixel', subtitle: 'Track conversion events for Facebook campaigns.', category: 'Marketing', icon: MousePointer2, color: 'bg-blue-50 dark:bg-blue-500/10', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300' },
  { title: 'TikTok Pixel', subtitle: 'Install TikTok events for ads and remarketing.', category: 'Marketing', icon: Target, color: 'bg-pink-50 dark:bg-pink-500/10', badge: 'bg-pink-100 text-pink-700 dark:bg-pink-400/15 dark:text-pink-300' },
  { title: 'Google Analytics & GTM', subtitle: 'Add GA4, Tag Manager, and ecommerce tracking.', category: 'Marketing', icon: BarChart3, color: 'bg-lime-50 dark:bg-lime-500/10', badge: 'bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300' },
  { title: 'Facebook Catalog', subtitle: 'Sync products for Facebook and Instagram shops.', category: 'Marketing', icon: Box, color: 'bg-orange-50 dark:bg-orange-500/10', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300' },
  { title: 'Manage Offers', subtitle: 'Create discounts, bundles, campaigns, and flash deals.', category: 'Marketing', icon: Percent, color: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300' },
  { title: 'Chat Management', subtitle: 'Control live chat, Messenger, WhatsApp, and greetings.', category: 'Storefront', icon: MessageSquare, color: 'bg-teal-50 dark:bg-teal-500/10', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300' },
  { title: 'Currency & Country', subtitle: 'Set currency, country, timezone, and formatting.', category: 'System', icon: Globe2, color: 'bg-stone-50 dark:bg-stone-500/10', badge: 'bg-stone-100 text-stone-700 dark:bg-stone-400/15 dark:text-stone-300' },
  { title: 'Domain Management', subtitle: 'Connect custom domains and SSL settings.', category: 'System', icon: LockKeyhole, color: 'bg-red-50 dark:bg-red-500/10', badge: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300' },
  { title: 'Order Settings', subtitle: 'Tune order status flow, numbering, and checkout rules.', category: 'Orders', icon: ShoppingCart, color: 'bg-green-50 dark:bg-green-500/10', badge: 'bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300' },
  { title: 'Product Settings', subtitle: 'Configure inventory, SKU, variants, and product defaults.', category: 'Storefront', icon: Settings2, color: 'bg-yellow-50 dark:bg-yellow-500/10', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-300' },
  { title: 'Google Search Console', subtitle: 'Verify ownership and monitor search performance.', category: 'Marketing', icon: Search, color: 'bg-purple-50 dark:bg-purple-500/10', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300' },
  { title: 'Blog Settings', subtitle: 'Manage SEO defaults, authors, and article preferences.', category: 'Storefront', icon: FileText, color: 'bg-slate-100 dark:bg-slate-700/50', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200' },
  { title: 'Invoice Settings', subtitle: 'Customize invoice layout, tax text, and print options.', category: 'Finance', icon: DollarSign, color: 'bg-copper-50 bg-orange-50 dark:bg-orange-500/10', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300' },
  { title: 'Reward Points', subtitle: 'Create loyalty points, redemption rules, and expiry.', category: 'Finance', icon: Gift, color: 'bg-lime-50 dark:bg-lime-500/10', badge: 'bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300' },
];

const ACTIVITY = [
  'Delivery charge updated for Outside Dhaka',
  'Facebook Pixel status checked',
  'Payment method Cash on Delivery enabled',
  'Invoice prefix changed to OH-2026',
];

const STORAGE_KEY = 'becom-admin-settings';
const SITE_SETTING_TITLE = 'Site Management';
const DELIVERY_SETTING_TITLE = 'Delivery Charge';

// All settings that save to the database
const DB_SETTINGS = new Set([
  SITE_SETTING_TITLE, DELIVERY_SETTING_TITLE,
  'Advance Payment', 'SMS Settings', 'Courier Integration', 'Fraud Check API',
  'Payment Methods', 'Social Login', 'Facebook Pixel', 'TikTok Pixel',
  'Google Analytics & GTM', 'Facebook Catalog', 'Manage Offers', 'Chat Management',
  'Currency & Country', 'Domain Management', 'Order Settings', 'Product Settings',
  'Google Search Console', 'Blog Settings', 'Invoice Settings', 'Reward Points',
]);

// Maps setting title → API section key
const SECTION_KEY_MAP: Record<string, string> = {
  'Advance Payment':       'advancePayment',
  'SMS Settings':          'smsSettings',
  'Courier Integration':   'courierSettings',
  'Fraud Check API':       'fraudCheckApi',
  'Payment Methods':       'paymentMethods',
  'Social Login':          'socialLogin',
  'Facebook Catalog':      'facebookCatalog',
  'Manage Offers':         'manageOffers',
  'Chat Management':       'chatManagement',
  'Currency & Country':    'currencyCountry',
  'Domain Management':     'domainSettings',
  'Order Settings':        'orderSettings',
  'Product Settings':      'productSettings',
  'Google Search Console': 'googleSearchConsole',
  'Blog Settings':         'blogSettings',
  'Invoice Settings':      'invoiceSettings',
  'Reward Points':         'rewardPoints',
};

// Maps setting title → integration platform key
const INTEGRATION_KEY_MAP: Record<string, 'facebook' | 'tiktok' | 'google'> = {
  'Facebook Pixel':         'facebook',
  'TikTok Pixel':           'tiktok',
  'Google Analytics & GTM': 'google',
};

const SITE_BLANK = {
  storeName: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  address: '',
  socialFacebook: '',
  socialInstagram: '',
  heroTitle: '',
  heroSubtitle: '',
  heroImage: '',
  heroImages: [] as string[],
  announcement: '',
  brandColor: '#1a6b2f',
  faviconUrl: '',
};

const DELIVERY_BLANK = {
  insideCity: '',
  outsideCity: '',
  freeAbove: '',
  zoneBased: false as boolean,
};
type DeliveryForm = typeof DELIVERY_BLANK;

type SiteForm = typeof SITE_BLANK;

const SETTING_FIELDS: Record<string, { label: string; key: string; type?: 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'password'; options?: string[]; placeholder?: string; colSpan?: boolean }[]> = {
  'Delivery Charge': [
    { label: 'Inside city charge', key: 'insideCity', type: 'number', placeholder: '60' },
    { label: 'Outside city charge', key: 'outsideCity', type: 'number', placeholder: '120' },
    { label: 'Free delivery above', key: 'freeAbove', type: 'number', placeholder: '1000' },
    { label: 'Enable zone based delivery', key: 'zoneBased', type: 'checkbox' },
  ],
  'Advance Payment': [
    { label: 'Enable advance payment', key: 'enabled', type: 'checkbox' },
    { label: 'Advance amount (%)', key: 'percent', type: 'number', placeholder: '20' },
    { label: 'Apply when order exceeds', key: 'minOrder', type: 'number', placeholder: '3000' },
  ],
  'SMS Settings': [
    { label: 'Provider', key: 'provider', type: 'select', options: ['Disabled', 'BulkSMSBD', 'Twilio', 'Custom'] },
    { label: 'API key', key: 'apiKey', placeholder: 'sms-api-key' },
    { label: 'Order confirmation template', key: 'template', type: 'textarea' },
  ],
  'Courier Integration': [
    { label: 'Courier Provider', key: 'courier', type: 'select', options: ['Steadfast', 'Pathao', 'RedX', 'Paperfly'], colSpan: true },
    { label: 'Steadfast API Key', key: 'token', type: 'password', placeholder: 'Paste your Api-Key here', colSpan: true },
    { label: 'Steadfast Secret Key', key: 'apiSecret', type: 'password', placeholder: 'Paste your Secret-Key here', colSpan: true },
    { label: 'Auto book parcel on order confirm', key: 'autoBook', type: 'checkbox' },
  ],

  'Fraud Check API': [
    { label: 'Enable fraud check', key: 'enabled', type: 'checkbox' },
    { label: 'API key', key: 'apiKey' },
    { label: 'Block score above', key: 'blockScore', type: 'number', placeholder: '70' },
  ],
  'Payment Methods': [
    { label: 'Cash on delivery', key: 'cod', type: 'checkbox' },
    { label: 'bKash', key: 'bkash', type: 'checkbox' },
    { label: 'SSLCommerz store id', key: 'sslStoreId' },
  ],
  'Social Login': [
    { label: 'Google login', key: 'google', type: 'checkbox' },
    { label: 'Facebook login', key: 'facebook', type: 'checkbox' },
    { label: 'Redirect URL', key: 'redirectUrl' },
  ],
  'Facebook Pixel': [
    { label: 'Pixel ID', key: 'pixelId' },
    { label: 'Conversion API token', key: 'capiToken' },
    { label: 'Track purchase event', key: 'purchase', type: 'checkbox' },
  ],
  'TikTok Pixel': [
    { label: 'Pixel ID', key: 'pixelId' },
    { label: 'Access token', key: 'accessToken' },
    { label: 'Track checkout event', key: 'checkout', type: 'checkbox' },
  ],
  'Google Analytics & GTM': [
    { label: 'GA4 measurement ID', key: 'gaId', placeholder: 'G-XXXXXXXXXX' },
    { label: 'GTM container ID', key: 'gtmId', placeholder: 'GTM-XXXXXXX' },
    { label: 'Enhanced ecommerce', key: 'ecommerce', type: 'checkbox' },
  ],
  'Facebook Catalog': [
    { label: 'Catalog ID', key: 'catalogId' },
    { label: 'Feed URL', key: 'feedUrl' },
    { label: 'Auto sync products', key: 'autoSync', type: 'checkbox' },
  ],
  'Manage Offers': [
    { label: 'Default discount (%)', key: 'discount', type: 'number' },
    { label: 'Offer banner text', key: 'banner' },
    { label: 'Enable flash offers', key: 'flash', type: 'checkbox' },
  ],
  'Chat Management': [
    { label: 'WhatsApp number', key: 'whatsapp' },
    { label: 'Messenger page ID', key: 'messengerPageId' },
    { label: 'Welcome message', key: 'welcome', type: 'textarea' },
  ],
  'Currency & Country': [
    { label: 'Currency', key: 'currency', type: 'select', options: ['BDT', 'USD', 'INR'] },
    { label: 'Country', key: 'country', type: 'select', options: ['Bangladesh', 'United States', 'India'] },
    { label: 'Timezone', key: 'timezone', placeholder: 'Asia/Dhaka' },
  ],
  'Domain Management': [
    { label: 'Primary domain', key: 'domain', placeholder: 'example.com' },
    { label: 'SSL enabled', key: 'ssl', type: 'checkbox' },
    { label: 'Redirect www to root', key: 'redirectWww', type: 'checkbox' },
  ],
  'Order Settings': [
    { label: 'Order prefix', key: 'prefix', placeholder: 'ORD' },
    { label: 'Auto confirm orders', key: 'autoConfirm', type: 'checkbox' },
    { label: 'Low stock warning threshold', key: 'lowStock', type: 'number' },
  ],
  'Product Settings': [
    { label: 'Require SKU', key: 'requireSku', type: 'checkbox' },
    { label: 'Allow out of stock order', key: 'backorder', type: 'checkbox' },
    { label: 'Default product status', key: 'status', type: 'select', options: ['Draft', 'Active', 'Hidden'] },
  ],
  'Google Search Console': [
    { label: 'Verification meta tag', key: 'verification' },
    { label: 'Sitemap URL', key: 'sitemapUrl' },
    { label: 'Submit sitemap automatically', key: 'autoSubmit', type: 'checkbox' },
  ],
  'Blog Settings': [
    { label: 'Default author', key: 'author' },
    { label: 'Comments enabled', key: 'comments', type: 'checkbox' },
    { label: 'Default meta description', key: 'meta', type: 'textarea' },
  ],
  'Invoice Settings': [
    { label: 'Invoice prefix', key: 'prefix', placeholder: 'INV' },
    { label: 'Tax/VAT text', key: 'taxText' },
    { label: 'Footer note', key: 'footer', type: 'textarea' },
  ],
  'Reward Points': [
    { label: 'Enable rewards', key: 'enabled', type: 'checkbox' },
    { label: 'Points per 100 currency', key: 'points', type: 'number' },
    { label: 'Point expiry days', key: 'expiry', type: 'number' },
  ],
};

function PasswordField({
  label, value, placeholder, colSpan, onChange,
}: { label: string; value: string; placeholder?: string; colSpan?: boolean; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <label className={colSpan ? 'sm:col-span-2' : ''}>
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</span>
      <div className="relative mt-1">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
          tabIndex={-1}
          aria-label={show ? 'Hide key' : 'Show key'}
        >
          {show ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>
    </label>
  );
}

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [activeSetting, setActiveSetting] = useState<(typeof SETTINGS)[number] | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, string | boolean>>>({});
  const [siteForm, setSiteForm] = useState<SiteForm>({ ...SITE_BLANK });
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>({ ...DELIVERY_BLANK });
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: siteSettings, isLoading: isSiteLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 60 * 1000, // 60 seconds - shorter to reflect changes faster
  });

  const { data: deliverySettings, isLoading: isDeliveryLoading } = useQuery({
    queryKey: ['settings-delivery'],
    queryFn: () => settingsApi.getDelivery().then((r) => r.data),
    staleTime: 60 * 1000, // 60 seconds
  });

  const { data: allSettings } = useQuery({
    queryKey: ['settings-all'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });

  const { data: integrationSettings } = useQuery({
    queryKey: ['settings-integrations'],
    queryFn: () => settingsApi.getIntegrations().then((r) => r.data),
  });

  // Populate section forms from API data when allSettings loads
  useEffect(() => {
    if (!allSettings?.site) return;
    const site = allSettings.site;
    // Populate each section's local values from the JSON fields
    const sectionFields: Record<string, Record<string, any>> = {
      'Advance Payment':       site.advancePayment       || {},
      'SMS Settings':          site.smsSettings          || {},
      'Courier Integration':   site.courierSettings      || {},
      'Fraud Check API':       site.fraudCheckApi        || {},
      'Payment Methods':       site.paymentMethods       || {},
      'Social Login':          site.socialLogin          || {},
      'Facebook Catalog':      site.facebookCatalog      || {},
      'Manage Offers':         site.manageOffers         || {},
      'Chat Management':       site.chatManagement       || {},
      'Currency & Country':    site.currencyCountry      || {},
      'Domain Management':     site.domainSettings       || {},
      'Order Settings':        site.orderSettings        || {},
      'Product Settings':      site.productSettings      || {},
      'Google Search Console': site.googleSearchConsole  || {},
      'Blog Settings':         site.blogSettings         || {},
      'Invoice Settings':      site.invoiceSettings      || {},
      'Reward Points':         site.rewardPoints         || {},
    };
    setValues((prev) => ({ ...prev, ...sectionFields }));
  }, [allSettings]);

  // Populate integration values from API data
  useEffect(() => {
    if (!integrationSettings) return;
    const intValues: Record<string, Record<string, any>> = {};
    for (const [title, platform] of Object.entries(INTEGRATION_KEY_MAP)) {
      const data = integrationSettings[platform] || {};
      intValues[title] = {
        ...(data.credentials || {}),
        enabled: data.isActive ?? false,
        // map generic 'enabled' field per-platform
        ...(platform === 'facebook' ? { purchase: data.isActive } : {}),
        ...(platform === 'tiktok'   ? { checkout: data.isActive } : {}),
        ...(platform === 'google'   ? { ecommerce: data.isActive } : {}),
      };
    }
    setValues((prev) => ({ ...prev, ...intValues }));
  }, [integrationSettings]);

  const siteSaveMut = useMutation({
    mutationFn: (data: SiteForm) => settingsApi.update({
      ...data,
      socialFacebook: data.socialFacebook || null,
      socialInstagram: data.socialInstagram || null,
      heroImage: data.heroImage || null,
      heroImages: data.heroImages || [],
      announcement: data.announcement || null,
    }),
    onSuccess: () => {
      // Invalidate ALL settings-related queries
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['site-theme'] });
      qc.invalidateQueries({ queryKey: ['settings-all'] });
      setSavedMessage('Site Management saved');
      setErrorMessage('');
      setActiveSetting(null);
      setTimeout(() => setSavedMessage(''), 2500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to save settings. Please try again.';
      setErrorMessage(message);
      console.error('Settings save error:', error);
      setTimeout(() => setErrorMessage(''), 5000);
    },
  });

  const deliverySaveMut = useMutation({
    mutationFn: (data: DeliveryForm) => settingsApi.updateDelivery({
      insideCity: Number(data.insideCity) || 0,
      outsideCity: Number(data.outsideCity) || 0,
      freeAbove: data.freeAbove ? Number(data.freeAbove) : null,
      zoneBased: data.zoneBased,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-delivery'] });
      qc.invalidateQueries({ queryKey: ['settings-all'] });
      setSavedMessage('Delivery Charge saved');
      setErrorMessage('');
      setActiveSetting(null);
      setTimeout(() => setSavedMessage(''), 2500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to save delivery settings.';
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 5000);
    },
  });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setValues(JSON.parse(stored));
    } catch {
      setValues({});
    }
  }, []);

  useEffect(() => {
    if (!siteSettings) return;
    setSiteForm({
      storeName: siteSettings.storeName || '',
      phone: siteSettings.phone || '',
      whatsappNumber: siteSettings.whatsappNumber || '',
      email: siteSettings.email || '',
      address: siteSettings.address || '',
      socialFacebook: siteSettings.socialFacebook || '',
      socialInstagram: siteSettings.socialInstagram || '',
      heroTitle: siteSettings.heroTitle || '',
      heroSubtitle: siteSettings.heroSubtitle || '',
      heroImage: siteSettings.heroImage || '',
      heroImages: siteSettings.heroImages || [],
      announcement: siteSettings.announcement || '',
      brandColor: siteSettings.brandColor || '#1a6b2f',
      faviconUrl: siteSettings.faviconUrl || '',
    });
  }, [siteSettings]);

  useEffect(() => {
    if (!deliverySettings) return;
    setDeliveryForm({
      insideCity: deliverySettings.insideCity != null ? String(deliverySettings.insideCity) : '',
      outsideCity: deliverySettings.outsideCity != null ? String(deliverySettings.outsideCity) : '',
      freeAbove: deliverySettings.freeAbove != null ? String(deliverySettings.freeAbove) : '',
      zoneBased: deliverySettings.zoneBased || false,
    });
  }, [deliverySettings]);

  const updateSettingValue = (setting: string, key: string, value: string | boolean) => {
    setValues((prev) => ({
      ...prev,
      [setting]: {
        ...(prev[setting] || {}),
        [key]: value,
      },
    }));
  };

  const updateSiteValue = (key: keyof SiteForm, value: string | string[]) => {
    setSiteForm((prev) => ({ ...prev, [key]: value }));
  };

  const sectionSaveMut = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Record<string, unknown> }) =>
      settingsApi.updateSection(key, data),
    onSuccess: (_, { key }) => {
      // Invalidate all settings queries to ensure consistency
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['settings-all'] });
      setSavedMessage(`${activeSetting?.title} saved`);
      setErrorMessage('');
      setActiveSetting(null);
      setTimeout(() => setSavedMessage(''), 2500);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || 'Failed to save.';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 5000);
    },
  });

  const integrationSaveMut = useMutation({
    mutationFn: ({ platform, data }: { platform: 'facebook' | 'tiktok' | 'google'; data: any }) =>
      settingsApi.updateIntegration(platform, data),
    onSuccess: () => {
      // Invalidate all integration and settings queries
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['settings-all'] });
      qc.invalidateQueries({ queryKey: ['settings-integrations'] });
      setSavedMessage(`${activeSetting?.title} saved`);
      setErrorMessage('');
      setActiveSetting(null);
      setTimeout(() => setSavedMessage(''), 2500);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || 'Failed to save.';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 5000);
    },
  });

  const saveActiveSetting = () => {
    if (!activeSetting) return;
    const title = activeSetting.title;

    if (title === SITE_SETTING_TITLE) { siteSaveMut.mutate(siteForm); return; }
    if (title === DELIVERY_SETTING_TITLE) { deliverySaveMut.mutate(deliveryForm); return; }

    // Integration platforms (Facebook Pixel, TikTok Pixel, GA4/GTM)
    const integrationPlatform = INTEGRATION_KEY_MAP[title];
    if (integrationPlatform) {
      const sectionVals = values[title] || {};
      const credentialKeys: Record<string, string[]> = {
        facebook: ['pixelId', 'capiToken'],
        tiktok:   ['pixelId', 'accessToken'],
        google:   ['gaId', 'gtmId'],
      };
      const credentials: Record<string, unknown> = {};
      for (const k of credentialKeys[integrationPlatform]) {
        if (sectionVals[k] !== undefined) credentials[k] = sectionVals[k];
      }
      const isActive = Boolean(
        sectionVals.purchase ?? sectionVals.checkout ?? sectionVals.ecommerce ?? sectionVals.enabled
      );
      integrationSaveMut.mutate({ platform: integrationPlatform, data: { isActive, credentials } });
      return;
    }

    // Generic section save
    const sectionKey = SECTION_KEY_MAP[title];
    if (sectionKey) {
      const sectionVals = values[title] || {};
      sectionSaveMut.mutate({ key: sectionKey, data: sectionVals as Record<string, unknown> });
      return;
    }

    // Fallback: localStorage
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    setSavedMessage(`${title} saved (local)`);
    setActiveSetting(null);
    setTimeout(() => setSavedMessage(''), 2500);
  };

  const filteredSettings = useMemo(() => {
    const term = query.trim().toLowerCase();
    return SETTINGS.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesQuery = !term || `${item.title} ${item.subtitle} ${item.category}`.toLowerCase().includes(term);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const categoryCounts = useMemo(() => {
    return CATEGORIES.reduce<Record<string, number>>((acc, item) => {
      acc[item] = item === 'All' ? SETTINGS.length : SETTINGS.filter((setting) => setting.category === item).length;
      return acc;
    }, {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400">
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-primary dark:text-emerald-300">Settings</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-gray-950 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Manage store operations, integrations, tracking, payment, and customer experience.
          </p>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings..."
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Active integrations', value: '12', icon: CheckCircle2, color: 'bg-emerald-500' },
          { label: 'Pending setup', value: '6', icon: BellRing, color: 'bg-amber-500' },
          { label: 'Monthly target', value: '84%', icon: Megaphone, color: 'bg-sky-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">{value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              category === item
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            {item} <span className="ml-1 opacity-70">{categoryCounts[item]}</span>
          </button>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredSettings.map((setting) => {
          const { title, subtitle, icon: Icon, color, badge, category: cardCategory } = setting;
          const configured = title === SITE_SETTING_TITLE ? Boolean(siteSettings?.storeName) : Object.keys(values[title] || {}).length > 0;
          return (
          <article
            key={title}
            className={`group rounded-xl border border-white/70 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover dark:border-slate-800 ${color}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${badge}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1.5">
                {DB_SETTINGS.has(title) && (
                  <span title="Saves to database" className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-200">
                    <Database className="inline w-2.5 h-2.5 mr-0.5" />DB
                  </span>
                )}
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-gray-500 ring-1 ring-black/5 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-white/10">
                  {configured ? 'Configured' : cardCategory}
                </span>
              </div>
            </div>
            <h2 className="mt-5 text-base font-bold text-gray-950 dark:text-white">{title}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600 dark:text-slate-300">{subtitle}</p>
            <button
              onClick={() => setActiveSetting(setting)}
              className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary transition group-hover:gap-2 dark:text-emerald-300"
            >
              Manage <ChevronRight className="h-4 w-4" />
            </button>
          </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-gray-950 dark:text-white">Grouped Settings Overview</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.filter((item) => item !== 'All').map((item) => (
              <div key={item} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{item}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{categoryCounts[item]} modules available</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-gray-950 dark:text-white">Activity Logs Preview</h2>
          <div className="mt-4 space-y-3">
            {ACTIVITY.map((item, index) => (
              <div key={item} className="flex gap-3 text-sm">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-slate-200">{item}</p>
                  <p className="text-xs text-gray-400">{index + 1}h ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {activeSetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setActiveSetting(null)} />
          <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary dark:text-emerald-300">{activeSetting.category}</p>
                <h2 className="mt-1 text-xl font-bold text-gray-950 dark:text-white">{activeSetting.title}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{activeSetting.subtitle}</p>
              </div>
              <button onClick={() => setActiveSetting(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              {activeSetting.title === SITE_SETTING_TITLE ? (
                <div className="space-y-5">
                  {isSiteLoading ? (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-8 text-center text-sm font-medium text-gray-500">Loading...</div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Store name</span>
                          <input
                            value={siteForm.storeName}
                            onChange={(e) => updateSiteValue('storeName', e.target.value)}
                            placeholder="Organic Harvest"
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                        <label>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Email</span>
                          <input
                            type="email"
                            value={siteForm.email}
                            onChange={(e) => updateSiteValue('email', e.target.value)}
                            placeholder="info@example.com"
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                        <label>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Phone</span>
                          <input
                            value={siteForm.phone}
                            onChange={(e) => updateSiteValue('phone', e.target.value)}
                            placeholder="01712345678"
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                        <label>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">WhatsApp number</span>
                          <input
                            value={siteForm.whatsappNumber}
                            onChange={(e) => updateSiteValue('whatsappNumber', e.target.value)}
                            placeholder="8801712345678"
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Address</span>
                          <textarea
                            rows={3}
                            value={siteForm.address}
                            onChange={(e) => updateSiteValue('address', e.target.value)}
                            placeholder="Dhaka, Bangladesh"
                            className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Facebook URL</span>
                          <input
                            type="url"
                            value={siteForm.socialFacebook}
                            onChange={(e) => updateSiteValue('socialFacebook', e.target.value)}
                            placeholder="https://facebook.com/your-page"
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                        <label>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Instagram URL</span>
                          <input
                            type="url"
                            value={siteForm.socialInstagram}
                            onChange={(e) => updateSiteValue('socialInstagram', e.target.value)}
                            placeholder="https://instagram.com/your-page"
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Hero title</span>
                          <input
                            value={siteForm.heroTitle}
                            onChange={(e) => updateSiteValue('heroTitle', e.target.value)}
                            placeholder="Eat Pure, Eat Organic"
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                        <label>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Hero subtitle</span>
                          <input
                            value={siteForm.heroSubtitle}
                            onChange={(e) => updateSiteValue('heroSubtitle', e.target.value)}
                            placeholder="Fresh from the farm to your table"
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Announcement bar</span>
                          <input
                            value={siteForm.announcement}
                            onChange={(e) => updateSiteValue('announcement', e.target.value)}
                            placeholder="Free delivery on orders over 1000"
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                      </div>
                      {/* ── Brand Color ──────────────────────────────────────────── */}
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Brand / Primary Color</span>
                        <p className="mt-0.5 text-xs text-gray-400">Changes buttons, links, and accent colors site-wide.</p>
                        <div className="mt-3 flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl border-4 border-white shadow-md shrink-0 cursor-pointer"
                            style={{ backgroundColor: siteForm.brandColor || '#1a6b2f' }}
                            onClick={() => document.getElementById('brand-color-input')?.click()}
                            title="Click to pick color"
                          />
                          <div className="flex-1 space-y-1.5">
                            <input
                              id="brand-color-input"
                              type="color"
                              value={siteForm.brandColor || '#1a6b2f'}
                              onChange={(e) => {
                                updateSiteValue('brandColor', e.target.value);
                                document.documentElement.style.setProperty('--color-primary', e.target.value);
                              }}
                              className="sr-only"
                            />
                            <input
                              type="text"
                              value={siteForm.brandColor || '#1a6b2f'}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateSiteValue('brandColor', v);
                                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                                  document.documentElement.style.setProperty('--color-primary', v);
                                }
                              }}
                              placeholder="#1a6b2f"
                              maxLength={7}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById('brand-color-input')?.click()}
                              className="w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                              style={{ backgroundColor: siteForm.brandColor || '#1a6b2f' }}
                            >
                              Open Color Picker
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            { label: 'Forest Green', color: '#1a6b2f' },
                            { label: 'Ocean Blue',   color: '#1d4ed8' },
                            { label: 'Royal Purple', color: '#7c3aed' },
                            { label: 'Deep Red',     color: '#b91c1c' },
                            { label: 'Slate',        color: '#334155' },
                            { label: 'Amber',        color: '#d97706' },
                          ].map(({ label, color }) => (
                            <button
                              key={color}
                              type="button"
                              title={label}
                              onClick={() => {
                                updateSiteValue('brandColor', color);
                                document.documentElement.style.setProperty('--color-primary', color);
                              }}
                              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 shadow ${siteForm.brandColor === color ? 'border-gray-800 scale-110 ring-2 ring-offset-1 ring-gray-400' : 'border-white'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* ── Favicon ──────────────────────────────────────────────── */}
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center gap-3 mb-3">
                          {siteForm.faviconUrl ? (
                            <img src={siteForm.faviconUrl} alt="favicon preview" className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">ICO</div>
                          )}
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Favicon</span>
                            <p className="text-xs text-gray-400 mt-0.5">Shown in the browser tab. Recommended: 64×64 PNG.</p>
                          </div>
                        </div>
                        <ImageUploader
                          images={siteForm.faviconUrl ? [siteForm.faviconUrl] : []}
                          onChange={(images) => updateSiteValue('faviconUrl', images[0] || '')}
                          folder="landing-pages"
                          maxImages={1}
                        />
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">🖼️ Hero Banner Image</span>
                          <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 dark:bg-blue-800/50 dark:text-blue-300 px-2 py-0.5 rounded-full">Homepage &amp; Shop Page</span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">This image appears as the background banner on both the <strong>Homepage</strong> and the <strong>Shop page</strong>. Upload a high-quality banner image (recommended: 1920×600px).</p>
                        <ImageUploader
                          images={siteForm.heroImage ? [siteForm.heroImage] : []}
                          onChange={(images) => updateSiteValue('heroImage', images[0] || '')}
                          folder="landing-pages"
                          maxImages={1}
                        />
                      </div>

                      <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 dark:border-violet-900/40 dark:bg-violet-900/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">🎞️ Hero Slider Images</span>
                          <span className="text-[10px] font-semibold bg-violet-100 text-violet-600 dark:bg-violet-800/50 dark:text-violet-300 px-2 py-0.5 rounded-full">Homepage &amp; Shop Page</span>
                        </div>
                        <p className="text-xs text-violet-600 dark:text-violet-400 mb-3">Upload multiple images to create an auto-rotating slider on the <strong>Homepage</strong> and <strong>Shop page</strong>. The first image is also used as the shop banner. Leave empty to use the single banner image above.</p>
                        <ImageUploader
                          images={siteForm.heroImages || []}
                          onChange={(images) => updateSiteValue('heroImages', images)}
                          folder="hero-slider"
                          maxImages={10}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                  {activeSetting.title === DELIVERY_SETTING_TITLE && isDeliveryLoading ? (
                  <div className="col-span-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Loading delivery settings...</div>
                ) : (SETTING_FIELDS[activeSetting.title] || []).map((field) => {
                  const isDelivery = activeSetting.title === DELIVERY_SETTING_TITLE;
                  const value = isDelivery
                    ? (deliveryForm[field.key as keyof DeliveryForm] ?? '')
                    : (values[activeSetting.title]?.[field.key] ?? '');
                  const handleChange = isDelivery
                    ? (val: string | boolean) => setDeliveryForm((prev) => ({ ...prev, [field.key]: val }))
                    : (val: string | boolean) => updateSettingValue(activeSetting.title, field.key, val);

                  if (field.type === 'checkbox') {
                    return (
                      <label key={field.key} className="flex min-h-12 items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => handleChange(e.target.checked)}
                          className="h-4 w-4 accent-primary"
                        />
                        {field.label}
                      </label>
                    );
                  }

                  if (field.type === 'password') {
                    return (
                      <PasswordField
                        key={field.key}
                        label={field.label}
                        value={String(value)}
                        placeholder={field.placeholder}
                        colSpan={field.colSpan}
                        onChange={(v) => handleChange(v)}
                      />
                    );
                  }

                  return (
                    <label key={field.key} className={field.type === 'textarea' || field.colSpan ? 'sm:col-span-2' : ''}>
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">{field.label}</span>
                      {field.type === 'select' ? (
                        <select
                          value={String(value)}
                          onChange={(e) => handleChange(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="">Select</option>
                          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={4}
                          value={String(value)}
                          onChange={(e) => handleChange(e.target.value)}
                          placeholder={field.placeholder}
                          className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      ) : (
                        <input
                          type={field.type || 'text'}
                          value={String(value)}
                          onChange={(e) => handleChange(e.target.value)}
                          placeholder={field.placeholder}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-100 p-5 dark:border-slate-800">
              <div>
                {DB_SETTINGS.has(activeSetting.title) ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <Database className="w-3.5 h-3.5" /> Saves to database
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Saves locally in browser</span>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveSetting(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button
                  onClick={saveActiveSetting}
                  disabled={siteSaveMut.isPending || deliverySaveMut.isPending || sectionSaveMut.isPending || integrationSaveMut.isPending}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {(siteSaveMut.isPending || deliverySaveMut.isPending || sectionSaveMut.isPending || integrationSaveMut.isPending) ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {savedMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg">
          ✓ {savedMessage}
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg">
          ✕ {errorMessage}
        </div>
      )}
    </div>
  );
}
