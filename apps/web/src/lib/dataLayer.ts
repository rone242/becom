'use client';

type DataLayerPayload = Record<string, any>;

declare global {
  interface Window {
    dataLayer?: DataLayerPayload[];
  }
}

import { tracker, EventName } from './tracker';

export function pushDataLayerEvent(payload: DataLayerPayload) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];

  // Cleared { ecommerce: null } as it was causing visual clutter / duplication concerns for the user.
  window.dataLayer.push(payload);

  // ─── Forward to Analytics Router ───────────────────────────────────────────
  try {
    const { event, ecommerce } = payload;
    
    if (event === 'page_view') {
      tracker.trackPageView();
    } 
    else if (event === 'view_item' && ecommerce) {
      const item = ecommerce.items?.[0];
      if (item) {
        tracker.trackEvent(EventName.VIEW_CONTENT, {
          contentId: String(item.item_id),
          contentType: 'product',
          value: Number(ecommerce.value || item.price || 0),
          currency: ecommerce.currency || 'BDT',
          numItems: Number(item.quantity || 1),
        });
      }
    } 
    else if (event === 'add_to_cart' && ecommerce) {
      const item = ecommerce.items?.[0];
      if (item) {
        tracker.trackEvent(EventName.ADD_TO_CART, {
          contentId: String(item.item_id),
          contentType: 'product',
          value: Number(ecommerce.value || item.price || 0),
          currency: ecommerce.currency || 'BDT',
          numItems: Number(item.quantity || 1),
        });
      }
    }
    else if (event === 'begin_checkout' && ecommerce) {
      tracker.trackEvent(EventName.INITIATE_CHECKOUT, {
        value: Number(ecommerce.value || 0),
        currency: ecommerce.currency || 'BDT',
        numItems: ecommerce.items?.length || 1,
      });
    }
    else if (event === 'purchase' && ecommerce) {
      tracker.trackEvent(EventName.PURCHASE, {
        value: Number(ecommerce.value || 0),
        currency: ecommerce.currency || 'BDT',
        orderId: String(ecommerce.transaction_id || ''),
        numItems: ecommerce.items?.reduce((acc: number, item: any) => acc + Number(item.quantity || 1), 0) || 1,
      });
    }
  } catch (err) {
    console.warn('[DataLayer] Failed to forward event to tracker:', err);
  }
}

export function toDataLayerItem(product: any, quantity = 1) {
  return {
    item_id: product?.id || product?.productId,
    item_name: product?.name || product?.productName,
    item_category: product?.category?.name,
    price: Number(product?.price || 0),
    quantity,
  };
}

export function toCartDataLayerItems(items: any[]) {
  return items.map((item) => ({
    item_id: item.productId,
    item_name: item.productName,
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 1),
  }));
}
