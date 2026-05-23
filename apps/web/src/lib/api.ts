import axios from 'axios';
import { getSession } from 'next-auth/react';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from NextAuth session automatically
api.interceptors.request.use(async (config) => {
  try {
    const session = await getSession() as any;
    
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
      console.log('[API Interceptor] ✓ Authorization header added', {
        hasToken: !!session.accessToken,
        tokenLength: session.accessToken.length,
      });
    } else {
      console.warn('[API Interceptor] ⚠️ No accessToken found in session:', {
        hasSession: !!session,
        sessionKeys: session ? Object.keys(session) : [],
      });
    }
  } catch (error) {
    console.error('[API Interceptor] ❌ Error getting session:', error);
  }
  
  // Don't set Content-Type for FormData - axios will set it automatically with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    console.log('[API Interceptor] FormData request - letting axios set Content-Type');
  }
  
  return config;
});

// Error response interceptor for debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('[API Error] 401 Unauthorized', {
        url: error.config?.url,
        method: error.config?.method,
        hasAuthHeader: !!error.config?.headers?.Authorization,
        authHeaderPreview: error.config?.headers?.Authorization ? 
          error.config.headers.Authorization.substring(0, 20) + '...' : null,
        responseData: error.response?.data,
      });
    }
    return Promise.reject(error);
  }
);

// Analytics-router Axios client (port 4001) — used ONLY by the admin integration
// management page. No JWT interceptor: admin pages always have a session, and
// attaching a session-less interceptor was causing "No accessToken" warnings for
// every page load. The x-internal-key header is added per-request by the caller.
const analyticsRouter = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ANALYTICS_ROUTER_URL || 'http://localhost:4001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Only attach auth when a session is present — silently skip for guests
analyticsRouter.interceptors.request.use(async (config) => {
  try {
    const session = await getSession() as any;
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    // No warning when session is absent — this client is admin-only so the
    // login redirect will handle unauthenticated access before requests fire
  } catch {
    // Session errors are non-fatal; request proceeds without auth header
  }
  return config;
});

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  getAll: (params?: Record<string, any>) => api.get('/products', { params }),
  getBySlug: (slug: string) => api.get(`/products/${slug}`),
  getFeaturedByCategory: () => api.get('/products/featured-by-category'),
  create: (data: FormData) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  remove: (id: string) => api.delete(`/products/${id}`),
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getBySlug: (slug: string) => api.get(`/categories/${slug}`),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// ─── Brands ───────────────────────────────────────────────────────────────────
export const brandsApi = {
  getAll: () => api.get('/brands'),
  create: (data: any) => api.post('/brands', data),
  update: (id: string, data: any) => api.put(`/brands/${id}`, data),
  delete: (id: string) => api.delete(`/brands/${id}`),
};

// Landing Pages
export const landingPagesApi = {
  getAll: () => api.get('/landing-pages'),
  getBySlug: (slug: string) => api.get(`/landing-pages/${slug}`),
  create: (data: any) => api.post('/landing-pages', data),
  update: (id: string, data: any) => api.put(`/landing-pages/${id}`, data),
  delete: (id: string) => api.delete(`/landing-pages/${id}`),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => api.get('/users'),
  myOrders: () => api.get('/users/orders'),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviewsApi = {
  getByProduct: (productId: string) => api.get(`/reviews/product/${productId}`),
  create: (data: { productId: string; rating: number; comment: string }) =>
    api.post('/reviews', data),
};

// ─── Cart ─────────────────────────────────────────────────────────────────────
export const cartApi = {
  get: (sessionId?: string) => api.get('/cart', { params: { sessionId } }),
  addItem: (data: { productId: string; quantity: number }, sessionId?: string) =>
    api.post('/cart/items', data, { params: { sessionId } }),
  updateItem: (itemId: string, quantity: number) =>
    api.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.put(`/cart/items/${itemId}/remove`),
};

// ─── Coupons ──────────────────────────────────────────────────────────────────
export const couponsApi = {
  getPublic: () => api.get('/coupons/public'),
  validate: (code: string, orderTotal: number) =>
    api.post('/coupons/validate', { code, orderTotal }),
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersApi = {
  create: (data: any) => api.post('/orders', data),
  getById: (id: string) => api.get(`/orders/${id}`),
  getMyOrders: () => api.get('/orders'),
  updateStatus: (id: string, status: string) => api.patch(`/orders/${id}/status`, { status }),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (phone: string, password: string) => api.post('/auth/login', { phone, password }),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getSummary: () => api.get('/analytics/summary'),
  getRevenue: (period: 'months' | 'weeks') => api.get('/analytics/revenue', { params: { period } }),
  getSalesByCategory: () => api.get('/analytics/sales-by-category'),
  getRecentOrders: (limit?: number) => api.get('/analytics/recent-orders', { params: { limit } }),
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings'),
  getAll: () => api.get('/settings/all'),
  getDelivery: () => api.get('/settings/delivery'),
  getIntegrations: () => api.get('/settings/integrations'),
  update: (data: any) => api.patch('/settings', data),
  updateDelivery: (data: any) => api.patch('/settings/delivery', data),
  /** Update a specific named section (e.g. 'smsSettings', 'paymentMethods') */
  updateSection: (key: string, data: Record<string, unknown>) =>
    api.patch(`/settings/section/${key}`, data),
  /** Update a tracking integration (platform: 'facebook' | 'tiktok' | 'google') */
  updateIntegration: (
    platform: 'facebook' | 'tiktok' | 'google',
    data: { isActive?: boolean; credentials?: Record<string, unknown> },
  ) => api.patch(`/settings/integrations/${platform}`, data),
};


// ─── Uploads ──────────────────────────────────────────────────────────────────
export const uploadsApi = {
  uploadImage: (file: File, folder: 'products' | 'categories' | 'brands' | 'landing-pages' | 'hero-slider' = 'products') => {
    const form = new FormData();
    form.append('file', file);
    
    // Don't manually set Content-Type or Authorization here
    // Let the interceptor and axios handle it automatically
    // axios will automatically set multipart/form-data with proper boundary
    // and the interceptor will add the Authorization header
    return api.post(`/uploads/image?folder=${folder}`, form);
  },
};

// ─── Tracking Integrations (Analytics Router — port 4001) ────────────────────
export const trackingApi = {
  /** GET /api/admin/integrations — returns all 3 platform records */
  getAll: () => analyticsRouter.get('/admin/integrations'),
  /** GET /api/admin/integrations/:platform */
  getOne: (platform: string) => analyticsRouter.get(`/admin/integrations/${platform}`),
  /** PUT /api/admin/integrations/:platform — upsert credentials + isActive */
  upsert: (platform: string, data: { isActive?: boolean; credentials?: Record<string, unknown> }) =>
    analyticsRouter.put(`/admin/integrations/${platform}`, data),
  /** DELETE /api/admin/integrations/cache/:platform — bust Redis cache */
  bustCache: (platform: string) => analyticsRouter.delete(`/admin/integrations/cache/${platform}`),
  /** DELETE /api/admin/integrations/cache — bust ALL caches */
  bustAllCaches: () => analyticsRouter.delete('/admin/integrations/cache'),
  /**
   * GET /api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Proxied through Next.js /api/admin/stats to attach x-internal-key server-side.
   * Returns: { from, to, total: { sent, failed }, rows: [...] }
   */
  getStats: (from?: string, to?: string): Promise<{
    from: string;
    to: string;
    received: number;
    total: { sent: number; failed: number };
    rows: Array<{ date: string; platform: string; sent: number; failed: number }>;
    dailyTotals: Array<{ date: string; received: number; sent: number; failed: number }>;
  }> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    return fetch(`/api/admin/stats?${params.toString()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`Stats request failed: ${r.status}`);
        return r.json();
      });
  },
};

// ─── Courier (Steadfast) ──────────────────────────────────────────────────────
export const courierApi = {
  getBalance: () => api.get('/courier/balance'),
  getBookedOrders: () => api.get('/courier/booked'),
  bookOrder: (orderId: string) => api.post(`/courier/book/${orderId}`),
  refreshStatus: (orderId: string) => api.get(`/courier/status/${orderId}`),
  checkByTracking: (code: string) => api.get(`/courier/track/${code}`),
  createReturn: (orderId: string, reason?: string) =>
    api.post(`/courier/return/${orderId}`, { reason }),
  getReturns: () => api.get('/courier/returns'),
  getReturnRequests: () => api.get('/courier/returns'),   // alias
  getPayments: () => api.get('/courier/payments'),
  getPoliceStations: () => api.get('/courier/police-stations'),
};

export default api;
