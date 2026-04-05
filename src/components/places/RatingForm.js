'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StarRating from '@/components/ui/StarRating';

export default function RatingForm({ placeId, userId, existingRating, onSave }) {
  const [score, setScore] = useState(existingRating?.score || 0);
  const [note, setNote] = useState(existingRating?.note || '');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handleSave() {
    if (score === 0) return;
    setSaving(true);

    const { error } = await supabase.from('ratings').upsert(
      {
        place_id: placeId,
        user_id: userId,
        score,
        note: note.trim() || null,
      },
      { onConflict: 'place_id,user_id' }
    );

    setSaving(false);
    if (!error) onSave?.();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Your Rating</label>
        <StarRating value={score} onChange={setScore} size="lg" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Note <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="e.g., get the brisket tacos"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || score === 0}
        className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : existingRating ? 'Update Rating' : 'Save Rating'}
      </button>
    </div>
  );
}
