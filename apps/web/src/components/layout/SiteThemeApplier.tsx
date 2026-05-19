'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';

/**
 * Reads brandColor and faviconUrl from the site settings API
 * and applies them to the document at runtime without a page reload.
 *
 * - brandColor → sets CSS var --brand-primary + derived shades
 * - faviconUrl  → replaces the <link rel="icon"> in <head>
 */
export default function SiteThemeApplier() {
  const { data: settings } = useQuery({
    queryKey: ['site-theme'],
    queryFn: () => settingsApi.get().then((r) => r.data).catch(() => null),
    staleTime: 60 * 1000, // 60 seconds - faster updates for brand color/favicon changes
    retry: false,
  });

  useEffect(() => {
    if (!settings) return;

    // ── Brand Color ──────────────────────────────────────────────────────────
    if (settings.brandColor) {
      const hex = settings.brandColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      // Compute a slightly darker shade for hover
      const darken = (v: number, amt: number) => Math.max(0, Math.min(255, v - amt));
      const toHex  = (v: number) => v.toString(16).padStart(2, '0');

      const hoverColor = `#${toHex(darken(r, 20))}${toHex(darken(g, 20))}${toHex(darken(b, 20))}`;
      const lightBg    = `rgba(${r},${g},${b},0.08)`;

      const root = document.documentElement;
      root.style.setProperty('--color-primary',       settings.brandColor);
      root.style.setProperty('--color-primary-hover',  hoverColor);
      root.style.setProperty('--color-primary-light',  lightBg);
    }

    // ── Favicon ──────────────────────────────────────────────────────────────
    if (settings.faviconUrl) {
      // Remove existing favicons
      document.querySelectorAll("link[rel*='icon']").forEach((el) => el.remove());

      const link = document.createElement('link');
      link.rel   = 'icon';
      link.href  = settings.faviconUrl;
      link.type  = 'image/png';
      document.head.appendChild(link);
    }
  }, [settings]);

  return null; // renders nothing, side-effects only
}
