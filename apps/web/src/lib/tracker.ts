export enum EventName {
  PURCHASE = 'Purchase',
  VIEW_CONTENT = 'ViewContent',
  ADD_TO_CART = 'AddToCart',
  INITIATE_CHECKOUT = 'InitiateCheckout',
  SEARCH = 'Search',
  COMPLETE_REGISTRATION = 'CompleteRegistration',
  LEAD = 'Lead',
  PAGE_VIEW = 'PageView',
}

export interface UserData {
  email?: string;
  phone?: string;
  userId?: string;
  dateOfBirth?: string;
  country?: string;
}

export interface CustomData {
  value?: number;
  currency?: string;
  contentId?: string;
  contentType?: string;
  numItems?: number;
  orderId?: string;
}

export interface TrackEventPayload {
  eventName: EventName;
  userData?: UserData;
  customData?: CustomData;
  eventTime?: string;
  pageUrl?: string;
  sessionId?: string;
}

class Tracker {
  private async dispatch(payload: TrackEventPayload) {
    if (typeof window === 'undefined') return; // Only run in browser

    try {
      // Automatically attach the current page URL
      if (!payload.pageUrl) {
        payload.pageUrl = window.location.href;
      }

      await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // We use keepalive so the request isn't cancelled if the user navigates away
        keepalive: true,
      });
    } catch (error) {
      console.warn('[Tracker] Failed to dispatch event:', error);
    }
  }

  public async trackEvent(eventName: EventName, customData?: CustomData, userData?: UserData) {
    await this.dispatch({
      eventName,
      customData,
      userData,
    });
  }

  public async trackAddToCart(product: any, quantity: number = 1, currency: string = 'BDT') {
    await this.trackEvent(EventName.ADD_TO_CART, {
      value: product.price * quantity,
      currency,
      contentId: product.id || product.productId,
      contentType: 'product',
      numItems: quantity,
    });
  }

  public async trackPurchase(orderId: string, value: number, itemsCount: number, currency: string = 'BDT', userData?: UserData) {
    await this.trackEvent(EventName.PURCHASE, {
      value,
      currency,
      orderId,
      numItems: itemsCount,
    }, userData);
  }

  public async trackPageView() {
    await this.trackEvent(EventName.PAGE_VIEW);
  }
}

export const tracker = new Tracker();
