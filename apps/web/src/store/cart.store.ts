import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pushDataLayerEvent, toCartDataLayerItems } from '@/lib/dataLayer';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  weight?: string;
}

interface CartStore {
  items: CartItem[];
  coupon: { code: string; discount: number } | null;
  deliveryZone: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';
  deliveryCharge: number;

  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  setDeliveryZone: (zone: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA', charge: number) => void;

  // Computed
  subtotal: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      deliveryZone: 'INSIDE_DHAKA',
      deliveryCharge: 60,

      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === newItem.productId);
          pushDataLayerEvent({
            event: 'add_to_cart',
            ecommerce: {
              currency: 'BDT',
              value: Number(newItem.price || 0) * Number(newItem.quantity || 1),
              items: toCartDataLayerItems([newItem]),
            },
          });

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === newItem.productId
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...newItem, id: `${newItem.productId}-${Date.now()}` }],
          };
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          const item = state.items.find((i) => i.productId === productId);
          if (item && quantity <= 0) {
            pushDataLayerEvent({
              event: 'remove_from_cart',
              ecommerce: {
                currency: 'BDT',
                value: Number(item.price || 0) * Number(item.quantity || 1),
                items: toCartDataLayerItems([item]),
              },
            });
          }

          return {
            items: quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) => i.productId === productId ? { ...i, quantity } : i),
          };
        }),

      removeItem: (productId) =>
        set((state) => {
          const item = state.items.find((i) => i.productId === productId);
          if (item) {
            pushDataLayerEvent({
              event: 'remove_from_cart',
              ecommerce: {
                currency: 'BDT',
                value: Number(item.price || 0) * Number(item.quantity || 1),
                items: toCartDataLayerItems([item]),
              },
            });
          }

          return { items: state.items.filter((i) => i.productId !== productId) };
        }),

      clearCart: () => set({ items: [], coupon: null }),

      applyCoupon: (code, discount) => set({ coupon: { code, discount } }),
      removeCoupon: () => set({ coupon: null }),

      setDeliveryZone: (zone, charge) => set({ deliveryZone: zone, deliveryCharge: charge }),

      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      total: () => {
        const { deliveryCharge, coupon } = get();
        const subtotal = get().subtotal();
        return subtotal - (coupon?.discount ?? 0) + deliveryCharge;
      },
      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: 'organic-harvest-cart' },
  ),
);
