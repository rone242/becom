import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';

export default function BlogsPage() {
  return <AdminSectionPlaceholder title="Blogs" subtitle="Plan, write, and publish SEO content for your store." metrics={[{ label: 'Published posts', value: '18' }, { label: 'Drafts', value: '5' }, { label: 'SEO score', value: '82%' }]} items={[{ title: 'Benefits of Jola Gur', meta: 'SEO article', status: 'Published' }, { title: 'How to store honey', meta: 'Guide', status: 'Draft' }, { title: 'Ramadan food ideas', meta: 'Campaign post', status: 'Scheduled' }]} />;
}
