'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Activity, BarChart2, Bell, BriefcaseBusiness, ChevronRight, ClipboardList,
  Crown, FileText, Globe2, Layers, LayoutDashboard, LogOut, Menu, Moon,
  Package, PanelTop, PlayCircle, Radio, Search, Settings, ShoppingBag, Sliders,
  Star, Sun, Target, Truck, Users, Wallet, X,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN'] },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag, roles: ['ADMIN'] },
  { label: 'Courier', href: '/admin/courier', icon: Truck, roles: ['ADMIN'] },
  { label: 'Reports', href: '/admin/analytics', icon: BarChart2, roles: ['ADMIN'] },
  { label: 'Tracking', href: '/admin/tracking', icon: Radio, roles: ['ADMIN'] },
  { label: 'Products', href: '/admin/products', icon: Package, roles: ['ADMIN'] },
  { label: 'Requisition', href: '/admin/requisition', icon: ClipboardList, roles: ['ADMIN'] },
  { label: 'Settings', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
  { label: 'Customization', href: '/admin/customization', icon: Sliders, roles: ['ADMIN'] },
  { label: 'Catalog', href: '/admin/categories', icon: Layers, roles: ['ADMIN'] },
  { label: 'Portfolio', href: '/admin/portfolio', icon: BriefcaseBusiness, roles: ['ADMIN'] },
  { label: 'Landing Page', href: '/admin/landing-pages', icon: PanelTop, roles: ['ADMIN'] },
  { label: 'Reviews', href: '/admin/reviews', icon: Star, roles: ['ADMIN'] },
  { label: 'Blogs', href: '/admin/blogs', icon: FileText, roles: ['ADMIN'] },
  { label: 'Income', href: '/admin/income', icon: Wallet, roles: ['ADMIN'] },
  { label: 'Daily Target', href: '/admin/daily-target', icon: Target, roles: ['ADMIN'] },
  { label: 'Activity Log', href: '/admin/activity-log', icon: Activity, roles: ['ADMIN'] },
  { label: 'Customers', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    const user = session?.user as any;
    if (!session || user?.role !== 'ADMIN') {
      router.replace('/auth/login');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session?.user as any;
  if (!session || user?.role !== 'ADMIN') return null;

  const visibleNav = NAV.filter((item) => item.roles.includes(user?.role || ''));
  const activeLabel = visibleNav.find((item) => item.href === pathname)?.label || 'Admin';

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 text-slate-950 flex dark:bg-slate-950 dark:text-slate-100">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed top-0 left-0 h-full z-30 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 dark:bg-slate-900 dark:border-slate-800 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 md:static md:flex`}
        >
          <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100 dark:border-slate-800">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Settings className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display font-bold text-gray-900 text-sm leading-tight dark:text-white">Admin Console</p>
              <p className="text-xs text-gray-400">Business control</p>
            </div>
            <button className="ml-auto md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">Main Menu</p>
            {visibleNav.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-100 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate dark:text-white">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email || user?.phone || 'Admin'}</p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-slate-800 dark:hover:text-white"
                title="Go to site"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-10 bg-white border-b border-gray-100 min-h-16 flex flex-wrap items-center px-4 gap-3 dark:bg-slate-900 dark:border-slate-800">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors dark:hover:bg-slate-800"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
            <h1 className="font-display font-bold text-gray-900 text-base dark:text-white">{activeLabel}</h1>

            <div className="relative order-last w-full sm:order-none sm:ml-3 sm:max-w-xs lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search admin..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-100 lg:inline-flex dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20">
                <Crown className="h-3.5 w-3.5" /> Pro: 17 days left
              </span>
              <Link href="/" className="hidden items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-100 sm:inline-flex dark:bg-green-500/10 dark:text-green-300">
                <Globe2 className="h-4 w-4" /> Website
              </Link>
              <button className="hidden items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 sm:inline-flex dark:bg-blue-500/10 dark:text-blue-300">
                <PlayCircle className="h-4 w-4" /> Tutorial
              </button>
              <button
                onClick={() => setDarkMode((value) => !value)}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button className="relative rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              </button>
              <button className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-emerald-400 text-sm font-bold text-white">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
