'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import StarRating from '@/components/ui/StarRating';

export default function RatingForm({ placeId, userId, groupId, existingRating, onSave }) {
  const [score, setScore] = useState(existingRating?.score || 0);
  const [note, setNote] = useState(existingRating?.note || '');
  const supabase = createClient();

  const save = useCallback(async (newScore, newNote) => {
    if (newScore === 0) return;
    await supabase.from('ratings').upsert(
      {
        place_id: placeId,
        user_id: userId,
        score: newScore,
        note: newNote.trim() || null,
      },
      { onConflict: 'place_id,user_id' }
    );
    if (groupId) {
      await supabase.from('activity').insert({
        group_id: groupId,
        user_id: userId,
        place_id: placeId,
        action_type: 'rating',
        metadata: { score: newScore },
      });
    }
    onSave?.();
  }, [placeId, userId, groupId, supabase, onSave]);

  function handleScoreChange(newScore) {
    setScore(newScore);
    save(newScore, note);
  }

  function handleNoteBlur() {
    if (score > 0) {
      save(score, note);
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium mb-1">Your Rating</label>
        <StarRating value={score} onChange={handleScoreChange} size="lg" />
      </div>

      {score > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Note <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleNoteBlur}
            maxLength={200}
            placeholder="e.g., get the brisket tacos"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
      )}
    </div>
  );
}
