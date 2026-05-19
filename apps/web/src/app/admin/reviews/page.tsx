import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';

export default function ReviewsPage() {
  return <AdminSectionPlaceholder title="Reviews" subtitle="Moderate customer reviews, ratings, and testimonials." metrics={[{ label: 'New reviews', value: '12' }, { label: 'Average rating', value: '4.7' }, { label: 'Hidden', value: '3' }]} items={[{ title: 'Great product quality', meta: '5 stars on Premium Jola Gur', status: 'Visible' }, { title: 'Fast delivery', meta: '4 stars on Honey', status: 'Visible' }, { title: 'Needs follow-up', meta: '2 stars on Dates', status: 'Review' }]} />;
}
