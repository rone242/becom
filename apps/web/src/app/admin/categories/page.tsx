'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { categoriesApi } from '@/lib/api';
import {
  Modal, ConfirmDialog, Field, inputCls, PageHeader,
  DataTable, Th, Td, FormActions, EmptyState,
} from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

const BLANK = { name: '', description: '', image: '', sortOrder: '0' };

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data),
  });
  const categories = Array.isArray(data) ? data : [];

  const saveMut = useMutation({
    mutationFn: (d: any) =>
      editing
        ? categoriesApi.update(editing.id, d)
        : categoriesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); close_(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setDeleteId(null); },
  });

  const open_ = (cat?: any) => {
    setEditing(cat || null);
    setForm(cat ? { name: cat.name, description: cat.description || '', image: cat.image || '', sortOrder: String(cat.sortOrder ?? 0) } : { ...BLANK });
    setShowForm(true);
  };
  const close_ = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate({ ...form, sortOrder: parseInt(form.sortOrder) || 0 });
  };

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${categories.length} category(ies)`}
        action={
          <button onClick={() => open_()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        }
      />

      <DataTable>
        <thead><tr><Th>Name</Th><Th>Slug</Th><Th>Description</Th><Th>Sort</Th><Th>Actions</Th></tr></thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
          {!isLoading && categories.length === 0 && <tr><td colSpan={5}><EmptyState message="No categories yet." /></td></tr>}
          {categories.map((c: any) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <Td><span className="font-medium text-gray-900">{c.name}</span></Td>
              <Td><code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{c.slug}</code></Td>
              <Td className="max-w-xs truncate">{c.description || '—'}</Td>
              <Td>{c.sortOrder ?? 0}</Td>
              <Td>
                <div className="flex gap-2">
                  <button onClick={() => open_(c)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {showForm && (
        <Modal title={editing ? 'Edit Category' : 'Add Category'} onClose={close_}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Name" required>
              <input required value={form.name} onChange={(e) => f('name', e.target.value)} className={inputCls} placeholder="Category name" />
            </Field>
            <Field label="Description">
              <textarea rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} className={inputCls} placeholder="Short description" />
            </Field>
            <Field label="Image" hint="Category icon/photo shown on homepage">
              <ImageUploader
                images={form.image ? [form.image] : []}
                onChange={(imgs) => f('image', imgs[0] || '')}
                folder="categories"
                maxImages={1}
              />
            </Field>
            <Field label="Sort Order" hint="Lower number appears first">
              <input type="number" value={form.sortOrder} onChange={(e) => f('sortOrder', e.target.value)} className={inputCls} />
            </Field>
            <FormActions onCancel={close_} loading={saveMut.isPending} />
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Delete this category? Products in this category will not be deleted."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  );
}
