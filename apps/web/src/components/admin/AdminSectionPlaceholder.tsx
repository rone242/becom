'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, Plus, Search } from 'lucide-react';

type Metric = {
  label: string;
  value: string;
};

type Item = {
  title: string;
  meta: string;
  status: string;
};

export function AdminSectionPlaceholder({
  title,
  subtitle,
  metrics,
  items,
}: {
  title: string;
  subtitle: string;
  metrics: Metric[];
  items: Item[];
}) {
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState(items);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', meta: '', status: 'Draft' });

  const filteredRecords = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter((item) =>
      `${item.title} ${item.meta} ${item.status}`.toLowerCase().includes(term)
    );
  }, [query, records]);

  const addRecord = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setRecords((prev) => [
      { title: form.title.trim(), meta: form.meta.trim() || 'Created from admin panel', status: form.status.trim() || 'Draft' },
      ...prev,
    ]);
    setForm({ title: '', meta: '', status: 'Draft' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400">
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-primary dark:text-emerald-300">{title}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-gray-950 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add New
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <h2 className="text-base font-bold text-gray-950 dark:text-white">Recent {title}</h2>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {filteredRecords.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
              No records found.
            </div>
          )}
          {filteredRecords.map((item) => (
            <div key={item.title} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{item.meta}</p>
              </div>
              <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
          <form onSubmit={addRecord} className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Add {title}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Create a local admin record for this section.</p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Title</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Meta</span>
                <input
                  value={form.meta}
                  onChange={(event) => setForm((prev) => ({ ...prev, meta: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option>Draft</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Published</option>
                  <option>Logged</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-hover">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
