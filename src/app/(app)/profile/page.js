'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Profile</h1>
      <p className="text-gray-500 mb-6">Your stats — coming in Phase E</p>
      <button
        onClick={handleSignOut}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        Sign Out
      </button>
    </div>
  );
}
