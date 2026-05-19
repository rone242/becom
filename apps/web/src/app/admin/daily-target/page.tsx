import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';

export default function DailyTargetPage() {
  return <AdminSectionPlaceholder title="Daily Target" subtitle="Set daily sales goals and track team progress." metrics={[{ label: 'Target', value: 'Tk 50k' }, { label: 'Achieved', value: '68%' }, { label: 'Orders needed', value: '11' }]} items={[{ title: 'Morning sales push', meta: 'Tk 12k completed', status: 'On Track' }, { title: 'Landing page orders', meta: '7 orders today', status: 'Good' }, { title: 'Repeat customers', meta: '4 orders today', status: 'Needs Focus' }]} />;
}
