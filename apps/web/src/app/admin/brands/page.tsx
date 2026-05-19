'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { brandsApi } from '@/lib/api';
import {
  Modal, ConfirmDialog, Field, inputCls, PageHeader,
  DataTable, Th, Td, FormActions, EmptyState,
} from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

const BLANK = { name: '', description: '', logo: '', website: '' };

export default function AdminBrandsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const { data, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.getAll().then((r) => r.data),
  });
  const brands = Array.isArray(data) ? data : [];

  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? brandsApi.update(editing.id, d) : brandsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); close_(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => brandsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); setDeleteId(null); },
  });

  const open_ = (b?: any) => {
    setEditing(b || null);
    setForm(b ? { name: b.name, description: b.description || '', logo: b.logo || '', website: b.website || '' } : { ...BLANK });
    setShowForm(true);
  };
  const close_ = () => { setShowForm(false); setEditing(null); };

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Brands"
        subtitle={`${brands.length} brand(s)`}
        action={
          <button onClick={() => open_()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors">
            <Plus className="w-4 h-4" /> Add Brand
          </button>
        }
      />

      <DataTable>
        <thead><tr><Th>Name</Th><Th>Slug</Th><Th>Website</Th><Th>Actions</Th></tr></thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
          {!isLoading && brands.length === 0 && <tr><td colSpan={4}><EmptyState message="No brands yet." /></td></tr>}
          {brands.map((b: any) => (
            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
              <Td><span className="font-medium text-gray-900">{b.name}</span></Td>
              <Td><code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{b.slug}</code></Td>
              <Td>{b.website ? <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">{b.website}</a> : '—'}</Td>
              <Td>
                <div className="flex gap-2">
                  <button onClick={() => open_(b)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteId(b.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {showForm && (
        <Modal title={editing ? 'Edit Brand' : 'Add Brand'} onClose={close_}>
          <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-4">
            <Field label="Brand Name" required>
              <input required value={form.name} onChange={(e) => f('name', e.target.value)} className={inputCls} placeholder="Brand name" />
            </Field>
            <Field label="Description">
              <textarea rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Logo" hint="Brand logo image">
              <ImageUploader
                images={form.logo ? [form.logo] : []}
                onChange={(imgs) => f('logo', imgs[0] || '')}
                folder="brands"
                maxImages={1}
              />
            </Field>
            <Field label="Website">
              <input value={form.website} onChange={(e) => f('website', e.target.value)} className={inputCls} placeholder="https://…" />
            </Field>
            <FormActions onCancel={close_} loading={saveMut.isPending} />
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Delete this brand?"
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  );
}
