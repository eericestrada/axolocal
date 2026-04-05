'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import BottomSheet from '@/components/ui/BottomSheet';
import StarRating from '@/components/ui/StarRating';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';
import { PIN_COLORS } from '@/utils/constants';

export default function PlaceCard({ place, useCaseTags, userId, onClose, onDetail, onCheckIn, onVisitedChange }) {
  const [togglingVisited, setTogglingVisited] = useState(false);
  const supabase = createClient();

  if (!place) return null;

  const color = PIN_COLORS[place.primary_type] || PIN_COLORS.other;
  const stageText =
    place.stage === 1
      ? 'Not yet visited'
      : place.stage === 2
        ? 'Visited'
        : 'Fully characterized';

  function handleNavigate() {
    const q = place.address || `${place.latitude},${place.longitude}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`,
      '_blank'
    );
  }

  async function handleToggleVisited() {
    if (!userId) return;
    setTogglingVisited(true);
    if (place.visited) {
      await supabase
        .from('visited_places')
        .delete()
        .eq('place_id', place.id)
        .eq('user_id', userId);
    } else {
      await supabase.from('visited_places').insert({
        place_id: place.id,
        user_id: userId,
      });
    }
    setTogglingVisited(false);
    onVisitedChange?.();
  }

  return (
    <BottomSheet open={!!place} onClose={onClose} height="55vh">
      {/* Name and type */}
      <div className="flex items-start gap-2 mb-1">
        <div className="flex-1">
          <h3 className="text-base font-semibold leading-tight">
            {place.nickname || place.name}
          </h3>
          {place.nickname && (
            <p className="text-xs text-gray-500">{place.name}</p>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {place.primary_type}
        </span>
      </div>

      {/* Address — tap to navigate */}
      {place.address && (
        <button
          onClick={handleNavigate}
          className="flex items-center gap-1 text-left text-xs text-blue-600 mb-2"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span className="underline truncate">{place.address}</span>
        </button>
      )}

      {/* Rating + stage */}
      <div className="flex items-center gap-2 mb-2">
        {place.avgRating != null ? (
          <>
            <StarRating value={place.avgRating} readOnly size="sm" />
            <span className="text-xs text-gray-500">
              {place.avgRating.toFixed(1)} ({place.ratingCount})
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-400">No ratings yet</span>
        )}
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-400">{stageText}</span>
      </div>

      {/* Tags */}
      {useCaseTags && (
        <div className="flex flex-wrap gap-1 mb-3">
          {useCaseTags.map((tag) => {
            const summary = place.tagSummary?.[tag.id];
            if (!summary || summary.total === 0) return null;
            return (
              <ConfidenceBadge
                key={tag.id}
                label={tag.label}
                yesCount={summary.yes}
                totalCount={summary.total}
              />
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={handleNavigate}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Navigate
        </button>
        <button
          onClick={handleToggleVisited}
          disabled={togglingVisited}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            place.visited
              ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
              : 'border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {place.visited ? 'Been Here' : 'Been Here?'}
        </button>
        <button
          onClick={() => onCheckIn?.(place)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Check In
        </button>
      </div>

      {/* Details link */}
      <button
        onClick={() => onDetail?.(place.id)}
        className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
      >
        View full details &rarr;
      </button>
    </BottomSheet>
  );
}
