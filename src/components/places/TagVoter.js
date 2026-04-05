'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TagVoter({ placeId, userId, tagSummary, useCaseTags, onVote }) {
  const [voting, setVoting] = useState(null);
  const supabase = createClient();

  function getUserVote(tagId) {
    const summary = tagSummary?.[tagId];
    if (!summary) return null;
    const userVote = summary.votes?.find((v) => v.user_id === userId);
    return userVote ? userVote.vote : null;
  }

  async function handleVote(tagId) {
    const currentVote = getUserVote(tagId);
    setVoting(tagId);

    if (currentVote === null) {
      // No vote → yes
      await supabase.from('place_tag_votes').upsert(
        { place_id: placeId, tag_id: tagId, user_id: userId, vote: true },
        { onConflict: 'place_id,tag_id,user_id' }
      );
    } else if (currentVote === true) {
      // Yes → no
      await supabase.from('place_tag_votes').upsert(
        { place_id: placeId, tag_id: tagId, user_id: userId, vote: false },
        { onConflict: 'place_id,tag_id,user_id' }
      );
    } else {
      // No → remove vote
      await supabase
        .from('place_tag_votes')
        .delete()
        .eq('place_id', placeId)
        .eq('tag_id', tagId)
        .eq('user_id', userId);
    }

    setVoting(null);
    onVote?.();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {useCaseTags.map((tag) => {
        const userVote = getUserVote(tag.id);
        const summary = tagSummary?.[tag.id];
        const total = summary?.total || 0;
        const yes = summary?.yes || 0;

        let chipClass;
        if (userVote === true) {
          chipClass = 'bg-green-600 text-white';
        } else if (userVote === false) {
          chipClass = 'bg-red-100 text-red-700 ring-1 ring-red-300';
        } else {
          chipClass = 'bg-gray-100 text-gray-700';
        }

        return (
          <button
            key={tag.id}
            onClick={() => handleVote(tag.id)}
            disabled={voting === tag.id}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${chipClass} disabled:opacity-50`}
          >
            {tag.label}
            {total > 0 && (
              <span className="ml-1 opacity-70">
                {yes}/{total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
