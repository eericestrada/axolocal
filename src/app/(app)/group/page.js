'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function GroupPage() {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  const loadGroup = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's group membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('group_id, role, groups(id, name, description, invite_code)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (membership?.groups) {
      setGroup(membership.groups);
      setUserRole(membership.role);

      // Load members
      const { data: members } = await supabase
        .from('group_members')
        .select('role, joined_at, profiles(id, display_name, avatar_url)')
        .eq('group_id', membership.groups.id)
        .order('joined_at');

      setMembers(members || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  async function handleCreateGroup(e) {
    e.preventDefault();
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Generate a short invite code
    const inviteCode = Math.random().toString(36).substring(2, 8);

    const { data: newGroup, error } = await supabase
      .from('groups')
      .insert({
        name: groupName,
        invite_code: inviteCode,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      alert('Failed to create group');
      setCreating(false);
      return;
    }

    // Add creator as admin
    await supabase.from('group_members').insert({
      group_id: newGroup.id,
      user_id: user.id,
      role: 'admin',
    });

    setCreating(false);
    loadGroup();
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/join/${group.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // No group yet — show create form
  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6">
        <h1 className="text-xl font-bold mb-2">Create a Group</h1>
        <p className="text-gray-500 mb-6 text-center">
          Start a group to discover places with your friends
        </p>

        <form
          onSubmit={handleCreateGroup}
          className="w-full max-w-sm space-y-4"
        >
          <div>
            <label
              htmlFor="groupName"
              className="block text-sm font-medium mb-1"
            >
              Group Name
            </label>
            <input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              placeholder="e.g., SA Crew"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    );
  }

  // Show group details
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-1">{group.name}</h1>
      {group.description && (
        <p className="text-gray-500 mb-4">{group.description}</p>
      )}

      {/* Invite link */}
      <div className="mb-6 rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-medium mb-2">Invite Friends</h2>
        <div className="flex gap-2">
          <input
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${group.invite_code}`}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50"
          />
          <button
            onClick={copyInviteLink}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Admin settings */}
      {userRole === 'admin' && (
        <Link
          href="/settings"
          className="block mb-6 rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium">Category Settings</h2>
              <p className="text-xs text-gray-500">Configure place categories and discovery types</p>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>
      )}

      {/* Members list */}
      <h2 className="text-sm font-medium mb-2">
        Members ({members.length})
      </h2>
      <ul className="space-y-2">
        {members.map((member) => (
          <li
            key={member.profiles.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
          >
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium text-green-700">
              {member.profiles.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {member.profiles.display_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">{member.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
