import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';

export default function RequisitionPage() {
  return <AdminSectionPlaceholder title="Requisition" subtitle="Track stock requests, approvals, and purchase needs." metrics={[{ label: 'Open requests', value: '8' }, { label: 'Approved today', value: '3' }, { label: 'Pending value', value: 'Tk 42k' }]} items={[{ title: 'Honey jar restock', meta: 'Requested by inventory team', status: 'Pending' }, { title: 'Packaging labels', meta: 'Due tomorrow', status: 'Approved' }, { title: 'Courier bags', meta: 'Low supply warning', status: 'Review' }]} />;
}
