'use client';

import BottomSheet from '@/components/ui/BottomSheet';
import StarRating from '@/components/ui/StarRating';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';
import { PIN_COLORS } from '@/utils/constants';

export default function PlaceCard({ place, useCaseTags, onClose, onDetail, onCheckIn }) {
  if (!place) return null;

  const color = PIN_COLORS[place.primary_type] || PIN_COLORS.other;
  const stageText =
    place.stage === 1
      ? 'Not yet visited'
      : place.stage === 2
        ? 'Visited but untagged'
        : 'Fully characterized';

  return (
    <BottomSheet open={!!place} onClose={onClose} height="40vh">
      {/* Name and type */}
      <div className="flex items-start gap-2 mb-2">
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

      {/* Rating */}
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
      </div>

      {/* Tags */}
      {useCaseTags && (
        <div className="flex flex-wrap gap-1 mb-2">
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

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span>{place.checkInCount} check-in{place.checkInCount !== 1 ? 's' : ''}</span>
        <span>{stageText}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onDetail?.(place.id)}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Details
        </button>
        <button
          onClick={() => onCheckIn?.(place)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Check In
        </button>
      </div>
    </BottomSheet>
  );
}
