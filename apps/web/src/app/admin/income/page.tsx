import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';

export default function IncomePage() {
  return <AdminSectionPlaceholder title="Income" subtitle="Monitor sales income, payouts, and financial snapshots." metrics={[{ label: 'Today', value: 'Tk 18k' }, { label: 'This month', value: 'Tk 426k' }, { label: 'Refunds', value: 'Tk 3k' }]} items={[{ title: 'Order #1042', meta: 'Cash on delivery', status: 'Collected' }, { title: 'Order #1041', meta: 'bKash payment', status: 'Paid' }, { title: 'Order #1038', meta: 'Partial refund', status: 'Adjusted' }]} />;
}
