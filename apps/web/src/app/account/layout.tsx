import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession() as any;

  // Not logged in → send to login
  if (!session) {
    redirect('/auth/login?callbackUrl=/account');
  }

  // Admin → redirect to admin panel
  if (session?.user?.role === 'ADMIN') {
    redirect('/admin');
  }

  return <>{children}</>;
}
