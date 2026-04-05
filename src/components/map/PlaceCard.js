'use client';

import BottomSheet from '@/components/ui/BottomSheet';
import StarRating from '@/components/ui/StarRating';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';
import { PIN_COLORS } from '@/utils/constants';

export default function PlaceCard({ place, useCaseTags, onClose, onDetail, onCheckIn }) {
  if (!place) return null;

  const color = PIN_COLORS[place.primary_type] || PIN_COLORS.other;

  function handleNavigate() {
    const q = place.address || `${place.latitude},${place.longitude}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`,
      '_blank'
    );
  }

  // Build recent activity text from ratings
  const recentActivity = [];
  if (place.ratings?.length > 0) {
    for (const r of place.ratings.slice(0, 2)) {
      const name = r.profiles?.display_name || r.display_name;
      if (name) {
        recentActivity.push(`${name} rated ${r.score}/5${r.note ? ` — "${r.note}"` : ''}`);
      }
    }
  }
  if (place.checkInCount > 0) {
    recentActivity.push(`${place.checkInCount} check-in${place.checkInCount !== 1 ? 's' : ''}`);
  }

  return (
    <BottomSheet open={!!place} onClose={onClose} height="auto">
      {/* Name and type */}
      <div className="flex items-start gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold leading-tight truncate">
            {place.nickname || place.name}
          </h3>
          {place.nickname && (
            <p className="text-xs text-gray-500 truncate">{place.name}</p>
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

      {/* Rating + tags in one row */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {place.avgRating != null ? (
          <div className="flex items-center gap-1">
            <StarRating value={place.avgRating} readOnly size="sm" />
            <span className="text-xs text-gray-500">
              {place.avgRating.toFixed(1)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">No ratings yet</span>
        )}
        {useCaseTags?.map((tag) => {
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

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div className="mb-2">
          {recentActivity.map((text, i) => (
            <p key={i} className="text-xs text-gray-500 truncate">{text}</p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleNavigate}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Navigate
        </button>
        <button
          onClick={() => onCheckIn?.(place)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Check In
        </button>
        <button
          onClick={() => onDetail?.(place.id)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Details
        </button>
      </div>
    </BottomSheet>
  );
}
