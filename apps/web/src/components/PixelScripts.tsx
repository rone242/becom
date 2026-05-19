/**
 * PixelScripts — Server Component
 * Fetches integration settings from the API at request time and injects
 * the appropriate third-party scripts (FB Pixel, TikTok Pixel, GA4/GTM)
 * and a WhatsApp floating button into the page.
 *
 * Using a Server Component avoids exposing the internal API URL to the
 * browser and ensures scripts appear in the initial HTML response.
 */

import Script from 'next/script';
import { WhatsAppButton } from './WhatsAppButton';

async function getSettings() {
  try {
    const apiUrl = process.env.SERVER_API_URL || 'http://localhost:4000/api';
    const [siteRes, intRes] = await Promise.all([
      fetch(`${apiUrl}/settings`, { next: { revalidate: 10 } }), // 10 seconds instead of 60
      fetch(`${apiUrl}/settings/integrations`, { next: { revalidate: 10 } }),
    ]);
    const site = siteRes.ok ? await siteRes.json() : null;
    const integrations = intRes.ok ? await intRes.json() : null;
    return { site, integrations };
  } catch {
    return { site: null, integrations: null };
  }
}

export default async function PixelScripts() {
  const { site, integrations } = await getSettings();

  const fb = integrations?.facebook;
  const tt = integrations?.tiktok;
  const ga = integrations?.google;
  const whatsapp = site?.chatManagement?.whatsapp || site?.whatsappNumber;
  const currency = (site?.currencyCountry as any)?.currency || 'BDT';

  return (
    <>
      {/* ── Facebook Pixel ──────────────────────────────────────────────── */}
      {fb?.isActive && fb.credentials?.pixelId && (
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${fb.credentials.pixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* ── TikTok Pixel ───────────────────────────────────────────────── */}
      {tt?.isActive && tt.credentials?.pixelId && (
        <Script
          id="tiktok-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},
              ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
              ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,
              ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";
              n.async=!0;n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];
              e.parentNode.insertBefore(n,e)};ttq.load('${tt.credentials.pixelId}');ttq.page();}(window,document,'ttq');
            `,
          }}
        />
      )}

      {/* ── Google Analytics 4 ─────────────────────────────────────────── */}
      {ga?.isActive && ga.credentials?.gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga.credentials.gaId}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga.credentials.gaId}', { send_page_view: true });
              `,
            }}
          />
        </>
      )}

      {whatsapp && <WhatsAppButton number={whatsapp} />}
    </>
  );
}
