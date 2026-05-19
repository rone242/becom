import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';

export default function PortfolioPage() {
  return <AdminSectionPlaceholder title="Portfolio" subtitle="Showcase case studies, brand stories, and featured work." metrics={[{ label: 'Published', value: '6' }, { label: 'Drafts', value: '2' }, { label: 'Views', value: '1.2k' }]} items={[{ title: 'Premium Jola Gur story', meta: 'Brand showcase', status: 'Published' }, { title: 'Organic sourcing', meta: 'Case study', status: 'Draft' }, { title: 'Customer success', meta: 'Featured story', status: 'Published' }]} />;
}
