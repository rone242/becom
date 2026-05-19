import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import PixelScripts from '@/components/PixelScripts';


export const metadata: Metadata = {
  title: { default: 'Organic Harvest — Eat Pure, Eat Organic', template: '%s | Organic Harvest' },
  description: 'Fresh organic vegetables, honey, super foods and more — delivered to your door in Dhaka.',
  keywords: ['organic food', 'fresh vegetables', 'organic honey', 'Dhaka delivery', 'super foods'],
  openGraph: {
    type: 'website',
    siteName: 'Organic Harvest',
    title: 'Organic Harvest — Eat Pure, Eat Organic',
    description: 'Fresh organic food delivered to your door in Dhaka.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en">
      <body>
        <Script
          id="data-layer-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'data_layer_initialized',
                site_name: 'Organic Harvest'
              });
            `,
          }}
        />
        {gtmId && (
          <>
            <Script
              id="google-tag-manager"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','${gtmId}');
                `,
              }}
            />
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
              />
            </noscript>
          </>
        )}
        <Providers>{children}</Providers>
        <PixelScripts />
      </body>
    </html>
  );
}
