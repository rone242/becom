import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';

export default function ActivityLogPage() {
  return <AdminSectionPlaceholder title="Activity Log" subtitle="Audit admin actions, changes, and system events." metrics={[{ label: 'Events today', value: '47' }, { label: 'Admins active', value: '3' }, { label: 'Alerts', value: '1' }]} items={[{ title: 'Settings updated', meta: 'Delivery charge changed', status: 'Logged' }, { title: 'Product edited', meta: 'Premium Jola Gur', status: 'Logged' }, { title: 'Order status changed', meta: 'Order #1042 confirmed', status: 'Logged' }]} />;
}
