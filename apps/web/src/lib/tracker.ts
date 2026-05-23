/**
 * tracker.ts — fire-and-forget analytics utility
 *
 * Intentionally uses plain `fetch` (not the global Axios instance) so it
 * NEVER triggers the JWT interceptor in api.ts. Safe for guest / unauthenticated users.
 *
 * Flow:  browser → POST /api/track (Next.js SSR proxy)
 *                 → POST http://becom-analytics-router:5001/api/event
 */

export enum EventName {
  PURCHASE               = 'Purchase',
  VIEW_CONTENT           = 'ViewContent',
  ADD_TO_CART            = 'AddToCart',
  INITIATE_CHECKOUT      = 'InitiateCheckout',
  SEARCH                 = 'Search',
  COMPLETE_REGISTRATION  = 'CompleteRegistration',
  LEAD                   = 'Lead',
  PAGE_VIEW              = 'PageView',
}

export interface UserData {
  email?:       string;
  phone?:       string;
  userId?:      string;
  dateOfBirth?: string;
  country?:     string;
}

export interface CustomData {
  value?:       number;
  currency?:    string;
  contentId?:   string;
  contentType?: string;
  numItems?:    number;
  orderId?:     string;
}

export interface TrackEventPayload {
  eventName:   EventName;
  userData?:   UserData;
  customData?: CustomData;
  eventTime?:  string;
  pageUrl?:    string;
  sessionId?:  string;
}

// ── Stable anonymous session ID ───────────────────────────────────────────────
// Persisted in sessionStorage so it survives page navigations within the tab.
// Required by ValidateEventPipe: either userData.userId OR sessionId must exist.
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  const key = '__becom_sid';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

// ── Core dispatch — plain fetch, zero Axios, zero interceptors ────────────────
async function dispatch(payload: TrackEventPayload): Promise<void> {
  if (typeof window === 'undefined') return; // browser-only

  const enriched: TrackEventPayload = {
    sessionId: getOrCreateSessionId(),    // ensures ValidateEventPipe is satisfied
    ...payload,                            // caller can override sessionId if logged in
    pageUrl:    payload.pageUrl ?? window.location.href,
    eventTime:  payload.eventTime ?? new Date().toISOString(),
  };

  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
      // keepalive: request survives page navigations / unload events
      keepalive: true,
    });
  } catch (err) {
    // Tracking failures must never crash the page
    console.warn('[Tracker] dispatch failed (non-fatal):', err);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
class Tracker {
  trackEvent(eventName: EventName, customData?: CustomData, userData?: UserData) {
    // Fire-and-forget: callers don't need to await
    void dispatch({ eventName, customData, userData });
  }

  trackPageView() {
    void dispatch({ eventName: EventName.PAGE_VIEW });
  }

  trackViewContent(product: { id?: string; productId?: string; price?: number }) {
    void dispatch({
      eventName: EventName.VIEW_CONTENT,
      customData: {
        contentId:   String(product.id ?? product.productId ?? ''),
        contentType: 'product',
        value:       Number(product.price ?? 0),
        currency:    'BDT',
      },
    });
  }

  trackAddToCart(
    product: { id?: string; productId?: string; price?: number },
    quantity = 1,
    currency = 'BDT',
  ) {
    void dispatch({
      eventName: EventName.ADD_TO_CART,
      customData: {
        contentId:   String(product.id ?? product.productId ?? ''),
        contentType: 'product',
        value:       Number(product.price ?? 0) * quantity,
        currency,
        numItems:    quantity,
      },
    });
  }

  trackInitiateCheckout(value: number, numItems: number, currency = 'BDT') {
    void dispatch({
      eventName: EventName.INITIATE_CHECKOUT,
      customData: { value, currency, numItems },
    });
  }

  trackPurchase(
    orderId: string,
    value: number,
    itemsCount: number,
    currency = 'BDT',
    userData?: UserData,
  ) {
    void dispatch({
      eventName:  EventName.PURCHASE,
      userData,
      customData: { value, currency, orderId, numItems: itemsCount },
    });
  }
}

export const tracker = new Tracker();
