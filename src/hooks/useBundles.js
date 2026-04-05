'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useBundles(groupId) {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchBundles = useCallback(async () => {
    if (!groupId) {
      setBundles([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('category_bundles')
      .select('*')
      .eq('group_id', groupId)
      .order('sort_order');

    setBundles(data || []);
    setLoading(false);
  }, [groupId, supabase]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  return { bundles, loading, refetch: fetchBundles };
}
