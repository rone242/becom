import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';

export default function CustomizationPage() {
  return <AdminSectionPlaceholder title="Customization" subtitle="Control theme, homepage sections, banners, and visual preferences." metrics={[{ label: 'Active blocks', value: '14' }, { label: 'Draft changes', value: '2' }, { label: 'Theme', value: 'Default' }]} items={[{ title: 'Homepage hero banner', meta: 'Last edited today', status: 'Live' }, { title: 'Footer links', meta: '5 links configured', status: 'Live' }, { title: 'Campaign strip', meta: 'Scheduled for Friday', status: 'Draft' }]} />;
}
