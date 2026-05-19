'use client';

import Link from 'next/link';
import { Leaf, Facebook, Instagram, ArrowRight, Phone, Mail, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';

const NAVIGATION_LINKS = [
  { label: 'Sustainability Report', href: '/sustainability' },
  { label: 'Farmer Partnerships',   href: '/farmers'        },
  { label: 'Wholesale',             href: '/wholesale'      },
];

const CUSTOMER_CARE_LINKS = [
  { label: 'Shipping & Returns', href: '/shipping' },
  { label: 'Privacy Policy',     href: '/privacy'  },
  { label: 'Contact Us',         href: '/contact'  },
];

export default function Footer() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 60 * 1000, // 60 seconds - match PixelScripts timing
  });

  const storeName = settings?.storeName || 'Organic Harvest';
  const email = settings?.email;
  const phone = settings?.phone;
  const address = settings?.address;
  const fbUrl = settings?.socialFacebook;
  const igUrl = settings?.socialInstagram;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-main py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5 text-green-400" />
              <span className="font-display text-base font-bold text-white">{storeName}</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Rebuilding the organic supply chain by connecting conscious consumers directly with artisanal producers.
            </p>

            {/* Contact info from settings */}
            <div className="space-y-1.5 mb-5">
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
                  <Mail className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  {email}
                </a>
              )}
              {address && (
                <p className="flex items-start gap-2 text-xs text-gray-400">
                  <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                  {address}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <a
                href={fbUrl || '#'}
                target={fbUrl ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={igUrl || '#'}
                target={igUrl ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-white font-semibold mb-4 uppercase text-xs tracking-wider">Navigation</h3>
            <ul className="space-y-2.5">
              {NAVIGATION_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h3 className="text-white font-semibold mb-4 uppercase text-xs tracking-wider">Customer Care</h3>
            <ul className="space-y-2.5">
              {CUSTOMER_CARE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-semibold mb-4 uppercase text-xs tracking-wider">Newsletter</h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Join our newsletter for weekly updates on seasonal finds.
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="flex-1 min-w-0 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <button
                type="submit"
                className="p-2.5 bg-primary hover:bg-primary-hover rounded-lg transition-colors shrink-0"
                aria-label="Subscribe"
              >
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container-main py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-500">
            © {year} {storeName}. Crafted for a greener planet.
          </p>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>🌿 100% Organic</span>
            <span>🚚 Eco Packaged</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
