'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { landingPagesApi, productsApi } from '@/lib/api';
import {
  ConfirmDialog, DataTable, EmptyState, Field, FormActions,
  Modal, PageHeader, Td, Th, inputCls, selectCls,
} from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

const BLANK = {
  title: '',
  productId: '',
  subtitle: '',
  badgeText: '',
  ctaText: 'Order Now',
  heroImage: '',
  galleryImages: [] as string[],
  priceOverride: '',
  introTitle: '',
  introText: '',
  benefits: '',
  usageTips: '',
  highlightText: '',
  sortOrder: '0',
  isActive: true,
};

const linesToArray = (value: string) =>
  value.split('\n').map((line) => line.trim()).filter(Boolean);

const arrayToLines = (value?: string[]) => (value || []).join('\n');

export default function AdminLandingPagesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const { data, isLoading } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: () => landingPagesApi.getAll().then((r) => r.data),
  });

  const { data: productData } = useQuery({
    queryKey: ['admin-products-for-landing-pages'],
    queryFn: () => productsApi.getAll({ limit: 200 }).then((r) => r.data),
  });

  const pages = Array.isArray(data) ? data : [];
  const products = Array.isArray(productData?.products) ? productData.products : [];

  const saveMut = useMutation({
    mutationFn: (payload: any) =>
      editing ? landingPagesApi.update(editing.id, payload) : landingPagesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-pages'] });
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => landingPagesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-pages'] });
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...BLANK });
    setShowForm(true);
  };

  const openEdit = (page: any) => {
    setEditing(page);
    setForm({
      title: page.title || '',
      productId: page.productId || '',
      subtitle: page.subtitle || '',
      badgeText: page.badgeText || '',
      ctaText: page.ctaText || 'Order Now',
      heroImage: page.heroImage || '',
      galleryImages: page.galleryImages || [],
      priceOverride: page.priceOverride ? String(page.priceOverride) : '',
      introTitle: page.introTitle || '',
      introText: page.introText || '',
      benefits: arrayToLines(page.benefits),
      usageTips: arrayToLines(page.usageTips),
      highlightText: page.highlightText || '',
      sortOrder: String(page.sortOrder ?? 0),
      isActive: page.isActive ?? true,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({
      ...form,
      heroImage: form.heroImage || undefined,
      priceOverride: form.priceOverride ? parseFloat(form.priceOverride) : undefined,
      sortOrder: parseInt(form.sortOrder) || 0,
      benefits: linesToArray(form.benefits),
      usageTips: linesToArray(form.usageTips),
    });
  };

  const f = (key: keyof typeof form, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <PageHeader
        title="Landing Pages"
        subtitle={`${pages.length} landing page(s)`}
        action={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors">
            <Plus className="w-4 h-4" /> Add Landing Page
          </button>
        }
      />

      <DataTable>
        <thead>
          <tr><Th>Hero</Th><Th>Title</Th><Th>Product</Th><Th>Status</Th><Th>Actions</Th></tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>}
          {!isLoading && pages.length === 0 && <tr><td colSpan={5}><EmptyState message="No landing pages yet." /></td></tr>}
          {pages.map((page: any) => (
            <tr key={page.id} className="hover:bg-gray-50 transition-colors">
              <Td>
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                  {(page.heroImage || page.product?.images?.[0]) && (
                    <Image src={page.heroImage || page.product.images[0]} alt={page.title} fill className="object-cover" />
                  )}
                </div>
              </Td>
              <Td>
                <div className="font-medium text-gray-900 max-w-sm truncate">{page.title}</div>
                <code className="text-xs text-gray-400">/lp/{page.slug}</code>
              </Td>
              <Td>{page.product?.name || '-'}</Td>
              <Td>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${page.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {page.isActive ? 'Active' : 'Hidden'}
                </span>
              </Td>
              <Td>
                <div className="flex gap-2 items-center">
                  <Link href={`/lp/${page.slug}`} target="_blank" className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Open page">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button onClick={() => openEdit(page)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(page.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {showForm && (
        <Modal title={editing ? 'Edit Landing Page' : 'Add Landing Page'} onClose={closeForm} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Title" required>
                <input required value={form.title} onChange={(e) => f('title', e.target.value)} className={inputCls} placeholder="Premium Jola Gur" />
              </Field>
              <Field label="Product" required>
                <select required value={form.productId} onChange={(e) => f('productId', e.target.value)} className={selectCls}>
                  <option value="">Select product</option>
                  {products.map((product: any) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Subtitle">
              <textarea rows={2} value={form.subtitle} onChange={(e) => f('subtitle', e.target.value)} className={inputCls} placeholder="Short persuasive copy under the headline" />
            </Field>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Badge">
                <input value={form.badgeText} onChange={(e) => f('badgeText', e.target.value)} className={inputCls} placeholder="Best seller" />
              </Field>
              <Field label="Button Text">
                <input value={form.ctaText} onChange={(e) => f('ctaText', e.target.value)} className={inputCls} placeholder="Order Now" />
              </Field>
              <Field label="Price Override">
                <input type="number" step="0.01" value={form.priceOverride} onChange={(e) => f('priceOverride', e.target.value)} className={inputCls} placeholder="Use product price" />
              </Field>
            </div>

            <Field label="Hero Image" hint="Leave empty to use the selected product primary image">
              <ImageUploader
                images={form.heroImage ? [form.heroImage] : []}
                onChange={(imgs) => f('heroImage', imgs[0] || '')}
                folder="landing-pages"
                maxImages={1}
              />
            </Field>

            <Field label="Gallery Images">
              <ImageUploader
                images={form.galleryImages}
                onChange={(imgs) => f('galleryImages', imgs)}
                folder="landing-pages"
                maxImages={4}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Intro Title">
                <input value={form.introTitle} onChange={(e) => f('introTitle', e.target.value)} className={inputCls} placeholder="Why choose this product?" />
              </Field>
              <Field label="Highlight Bar">
                <input value={form.highlightText} onChange={(e) => f('highlightText', e.target.value)} className={inputCls} placeholder="Special offer or trust message" />
              </Field>
            </div>

            <Field label="Intro Text">
              <textarea rows={2} value={form.introText} onChange={(e) => f('introText', e.target.value)} className={inputCls} placeholder="A short paragraph for the middle section" />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Benefits" hint="One item per line">
                <textarea rows={5} value={form.benefits} onChange={(e) => f('benefits', e.target.value)} className={inputCls} placeholder={'Pure and natural\nFreshly packed\nCash on delivery'} />
              </Field>
              <Field label="Usage / Recipes" hint="One item per line">
                <textarea rows={5} value={form.usageTips} onChange={(e) => f('usageTips', e.target.value)} className={inputCls} placeholder={'Use in tea\nPerfect for desserts\nGreat with breakfast'} />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Sort Order">
                <input type="number" value={form.sortOrder} onChange={(e) => f('sortOrder', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Visibility">
                <label className="flex items-center gap-2 h-10 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => f('isActive', e.target.checked)} className="w-4 h-4 accent-primary" />
                  Active and public
                </label>
              </Field>
            </div>

            <FormActions onCancel={closeForm} loading={saveMut.isPending} />
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Hide this landing page? It can be restored by editing the record later."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  );
}
