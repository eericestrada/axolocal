'use client';

import { useState, useEffect, useCallback } from 'react';

export function useFollows() {
  const [follows, setFollows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFollows = useCallback(async () => {
    try {
      const res = await fetch('/api/follows');
      const data = await res.json();
      setFollows(data.follows || []);
    } catch {
      setFollows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFollows();
  }, [fetchFollows]);

  const toggleFollow = useCallback(async (followedId) => {
    const isCurrentlyFollowing = follows.some((f) => f.followed_id === followedId);
    const action = isCurrentlyFollowing ? 'unfollow' : 'follow';

    // Optimistic update
    if (isCurrentlyFollowing) {
      setFollows((prev) => prev.filter((f) => f.followed_id !== followedId));
    } else {
      setFollows((prev) => [...prev, { followed_id: followedId }]);
    }

    try {
      await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followed_id: followedId, action }),
      });
    } catch {
      // Revert on error
      fetchFollows();
    }
  }, [follows, fetchFollows]);

  const isFollowing = useCallback(
    (userId) => follows.some((f) => f.followed_id === userId),
    [follows]
  );

  return { follows, loading, toggleFollow, isFollowing };
}
