'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useFollows } from '@/hooks/useFollows';

export default function GroupPage() {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const supabase = createClient();
  const { isFollowing, toggleFollow } = useFollows();

  const loadGroup = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Get user's group membership (first joined group)
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, role, groups(id, name, description, invite_code)')
      .eq('user_id', user.id)
      .order('joined_at');

    const membership = memberships?.[0];

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

  // No group yet — ask them to get an invite
  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6">
        <h1 className="text-xl font-bold mb-2">Join a Group</h1>
        <p className="text-gray-500 mb-6 text-center">
          Ask a friend to send you an invite link to get started
        </p>
        <div className="w-full max-w-sm border-t border-gray-200 pt-6 mt-2">
          <p className="text-xs text-gray-400 text-center mb-3">Or start your own group</p>
          <form
            onSubmit={handleCreateGroup}
            className="space-y-3"
          >
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              placeholder="Group name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        </div>
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
      <p className="text-xs text-gray-400 mb-2">Follow members to get notified when they check in, rate, or add places.</p>
      <ul className="space-y-2">
        {members.map((member) => {
          const isSelf = member.profiles.id === currentUserId;
          const following = isFollowing(member.profiles.id);
          return (
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
                  {isSelf && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                </p>
                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
              </div>
              {!isSelf && (
                <button
                  onClick={() => toggleFollow(member.profiles.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    following
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
