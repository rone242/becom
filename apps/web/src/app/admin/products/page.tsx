'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, ExternalLink } from 'lucide-react';
import { productsApi, categoriesApi, brandsApi } from '@/lib/api';
import {
  Modal, ConfirmDialog, Field, inputCls, selectCls, PageHeader,
  DataTable, Th, Td, FormActions, EmptyState,
} from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

const BLANK = {
  name: '', description: '', price: '', comparePrice: '', stock: '',
  weight: '', images: [] as string[], categoryId: '', brandId: '',
  isOrganic: false, isFeatured: false, isNewArrival: false,
  details: '', termsAndConditions: '', whatsappText: '',
};

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: () => productsApi.getAll({ search: search || undefined, limit: 50 }).then((r) => r.data),
  });
  const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.getAll().then((r) => r.data) });
  const { data: brandData } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.getAll().then((r) => r.data) });

  const toArr = (d: any) => Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.products) ? d.products : [];
  const products = toArr(rawData);
  const categories = toArr(catData);
  const brands = toArr(brandData);

  const saveMut = useMutation({
    mutationFn: (data: any) => editing ? productsApi.update(editing.id, data) : productsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); closeForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); setDeleteId(null); },
  });

  const openCreate = () => { setEditing(null); setForm({ ...BLANK }); setShowForm(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '', price: String(p.price),
      comparePrice: p.comparePrice ? String(p.comparePrice) : '',
      stock: p.stock != null ? String(p.stock) : '', weight: p.weight || '',
      images: p.images || [], categoryId: p.categoryId || '', brandId: p.brandId || '',
      isOrganic: p.isOrganic || false, isFeatured: p.isFeatured || false, isNewArrival: p.isNewArrival || false,
      details: p.details || '', termsAndConditions: p.termsAndConditions || '', whatsappText: p.whatsappText || '',
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({
      ...form,
      price: parseFloat(form.price),
      comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : undefined,
      stock: form.stock ? parseInt(form.stock) : undefined,
      brandId: form.brandId || undefined,
    });
  };

  const f = (k: keyof typeof form, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${products.length} product(s)`}
        action={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Table */}
      <DataTable>
        <thead><tr><Th>Image</Th><Th>Name</Th><Th>Category</Th><Th>Price</Th><Th>Stock</Th><Th>Flags</Th><Th>Actions</Th></tr></thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
          {!isLoading && products.length === 0 && <tr><td colSpan={7}><EmptyState message="No products found." /></td></tr>}
          {products.map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
              <Td>
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                  {p.images?.[0] && <Image src={p.images[0]} alt={p.name} fill className="object-cover" />}
                </div>
              </Td>
              <Td><div className="font-medium text-gray-900 max-w-xs truncate">{p.name}</div><div className="text-xs text-gray-400">{p.weight}</div></Td>
              <Td><span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{p.category?.name || '—'}</span></Td>
              <Td><div className="font-bold text-primary">৳{p.price}</div>{p.comparePrice && <div className="text-xs line-through text-gray-400">৳{p.comparePrice}</div>}</Td>
              <Td>{p.stock ?? '∞'}</Td>
              <Td>
                <div className="flex gap-1 flex-wrap">
                  {p.isOrganic && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Organic</span>}
                  {p.isFeatured && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Featured</span>}
                  {p.isNewArrival && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">New</span>}
                </div>
              </Td>
              <Td>
                <div className="flex gap-2 items-center">
                  <Link
                    href={`/lp/${p.slug}`}
                    target="_blank"
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Open Landing Page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {/* Product Form Modal */}
      {showForm && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={closeForm} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name" required>
                <input required value={form.name} onChange={(e) => f('name', e.target.value)} className={inputCls} placeholder="Product name" />
              </Field>
              <Field label="Weight / Unit">
                <input value={form.weight} onChange={(e) => f('weight', e.target.value)} className={inputCls} placeholder="e.g. 500g, 1L" />
              </Field>
            </div>
            <Field label="Description">
              <textarea rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} className={inputCls} placeholder="Short description" />
            </Field>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Price (৳)" required>
                <input required type="number" step="0.01" value={form.price} onChange={(e) => f('price', e.target.value)} className={inputCls} placeholder="0.00" />
              </Field>
              <Field label="Compare Price (৳)">
                <input type="number" step="0.01" value={form.comparePrice} onChange={(e) => f('comparePrice', e.target.value)} className={inputCls} placeholder="0.00" />
              </Field>
              <Field label="Stock">
                <input type="number" value={form.stock} onChange={(e) => f('stock', e.target.value)} className={inputCls} placeholder="Leave blank for unlimited" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Category" required>
                <select required value={form.categoryId} onChange={(e) => f('categoryId', e.target.value)} className={selectCls}>
                  <option value="">Select category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Brand">
                <select value={form.brandId} onChange={(e) => f('brandId', e.target.value)} className={selectCls}>
                  <option value="">No brand</option>
                  {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Images">
              <ImageUploader
                images={form.images}
                onChange={(imgs) => f('images', imgs)}
                folder="products"
                maxImages={8}
              />
            </Field>
            <Field label="Details (HTML or plain text)">
              <textarea rows={3} value={form.details} onChange={(e) => f('details', e.target.value)} className={inputCls} placeholder="Nutritional info, benefits…" />
            </Field>
            <Field label="Terms & Conditions (HTML or plain text)">
              <textarea rows={2} value={form.termsAndConditions} onChange={(e) => f('termsAndConditions', e.target.value)} className={inputCls} placeholder="Return policy, storage…" />
            </Field>
            <Field label="WhatsApp Message">
              <input value={form.whatsappText} onChange={(e) => f('whatsappText', e.target.value)} className={inputCls} placeholder="Pre-filled order message" />
            </Field>
            <div className="flex flex-wrap gap-5 pt-1">
              {[
                { key: 'isOrganic', label: 'Organic' },
                { key: 'isFeatured', label: 'Featured' },
                { key: 'isNewArrival', label: 'New Arrival' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={(form as any)[key]} onChange={(e) => f(key as any, e.target.checked)} className="w-4 h-4 accent-primary" />
                  {label}
                </label>
              ))}
            </div>
            <FormActions onCancel={closeForm} loading={saveMut.isPending} />
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <ConfirmDialog
          message="Delete this product? This action cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  );
}
