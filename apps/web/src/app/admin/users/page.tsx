'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { PageHeader, DataTable, Th, Td, EmptyState } from '@/components/admin/ui';

export default function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
  });
  const users = Array.isArray(data) ? data : [];

  return (
    <div>
      <PageHeader title="Users" subtitle={`${users.length} registered user(s)`} />

      <DataTable>
        <thead>
          <tr><Th>Name</Th><Th>Phone</Th><Th>Email</Th><Th>Role</Th><Th>Joined</Th></tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
          {!isLoading && users.length === 0 && <tr><td colSpan={5}><EmptyState message="No users yet." /></td></tr>}
          {users.map((u: any) => (
            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
              <Td>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="font-medium text-gray-900">{u.name || '—'}</span>
                </div>
              </Td>
              <Td>{u.phone || '—'}</Td>
              <Td>{u.email || '—'}</Td>
              <Td>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {u.role}
                </span>
              </Td>
              <Td className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
