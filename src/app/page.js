import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/map');
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-3">Axolocal</h1>
        <p className="text-lg text-gray-600 mb-8">
          Discover, rate, and track local places with your friends. Find
          kid-friendly parks, work-friendly cafes, and hidden gems — curated by
          the people you trust.
        </p>

        <div className="space-y-3">
          <Link
            href="/signup"
            className="block w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
