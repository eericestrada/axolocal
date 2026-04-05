import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BottomNav from '@/components/ui/BottomNav';

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
