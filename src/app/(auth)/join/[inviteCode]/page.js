'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function JoinGroupPage() {
  const { inviteCode } = useParams();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Look up group by invite code
      const { data: group, error } = await supabase
        .from('groups')
        .select('id, name, description, invite_expires_at')
        .eq('invite_code', inviteCode)
        .single();

      if (error || !group) {
        setError('Invalid invite link');
      } else if (
        group.invite_expires_at &&
        new Date(group.invite_expires_at) < new Date()
      ) {
        setError('This invite link has expired');
      } else {
        setGroup(group);
      }
      setLoading(false);
    }
    load();
  }, [inviteCode, supabase]);

  async function handleJoin() {
    if (!user) {
      // Redirect to signup with a return URL
      router.push(`/signup?next=/join/${inviteCode}`);
      return;
    }

    setJoining(true);
    setError(null);

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      router.push('/map');
      return;
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'member',
    });

    if (error) {
      setError('Failed to join group');
      setJoining(false);
    } else {
      router.push('/map');
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/login" className="text-green-600 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold mb-2">Join Group</h1>
        <p className="text-xl mb-1">{group.name}</p>
        {group.description && (
          <p className="text-gray-500 mb-8">{group.description}</p>
        )}

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {joining
            ? 'Joining...'
            : user
              ? 'Join Group'
              : 'Sign Up to Join'}
        </button>

        {!user && (
          <p className="mt-4 text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href={`/login?next=/join/${inviteCode}`}
              className="text-green-600 hover:underline"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
