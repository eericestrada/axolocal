'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useGroup() {
  const [state, setState] = useState({
    group: null,
    members: [],
    userId: null,
    userRole: null,
    loading: true,
  });
  const supabase = createClient();

  const fetchGroup = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    // Get all memberships, pick the one with earliest joined_at (the "real" group)
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, role, joined_at, groups(id, name, description, invite_code)')
      .eq('user_id', user.id)
      .order('joined_at');

    const membership = memberships?.[0];

    if (!membership?.groups) {
      setState({ group: null, members: [], userId: user.id, userRole: null, loading: false });
      return;
    }

    const { data: members } = await supabase
      .from('group_members')
      .select('role, joined_at, profiles(id, display_name, avatar_url)')
      .eq('group_id', membership.groups.id)
      .order('joined_at');

    setState({
      group: membership.groups,
      members: members || [],
      userId: user.id,
      userRole: membership.role,
      loading: false,
    });
  }, [supabase]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  return { ...state, refetch: fetchGroup };
}
