'use client';

import { PIN_COLORS } from '@/utils/constants';

export default function PlaceList({ places, bundles, useCaseTags, onSelect }) {
  // Build tag label lookup
  const tagLabels = {};
  if (useCaseTags) {
    for (const tag of useCaseTags) {
      tagLabels[tag.id] = tag.label;
    }
  }
  // Build color map from bundles
  const colorMap = { ...PIN_COLORS };
  if (bundles) {
    for (const b of bundles) {
      colorMap[b.slug] = b.color;
    }
  }
  if (places.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-gray-400 text-sm">No places to show</p>
      </div>
    );
  }

  // Sort: stage 3 first, then 2, then 1. Within stage, by avgRating desc.
  const sorted = [...places].sort((a, b) => {
    if (b.stage !== a.stage) return b.stage - a.stage;
    return (b.avgRating || 0) - (a.avgRating || 0);
  });

  return (
    <div className="overflow-y-auto h-full">
      {sorted.map((place) => {
        const color = colorMap[place.primary_type] || colorMap.other;
        return (
          <button
            key={place.id}
            onClick={() => onSelect?.(place.id)}
            className="w-full flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 text-left"
          >
            {/* Type dot */}
            <div
              className="mt-1 shrink-0 rounded-full"
              style={{
                width: 12,
                height: 12,
                backgroundColor: place.stage === 1 ? '#9ca3af' : color,
                opacity: place.stage === 1 ? 0.7 : 1,
              }}
            />

            <div className="flex-1 min-w-0">
              {/* Name + nickname */}
              <p className="text-sm font-medium text-gray-900 truncate">
                {place.nickname || place.name}
              </p>
              {place.nickname && (
                <p className="text-xs text-gray-400 truncate">{place.name}</p>
              )}

              {/* Address */}
              {place.address && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {place.address}
                </p>
              )}

              {/* Tags */}
              {place.tagSummary && Object.keys(place.tagSummary).length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {Object.entries(place.tagSummary).map(([tagId, summary]) => {
                    if (summary.yes === 0) return null;
                    const pct = Math.round((summary.yes / summary.total) * 100);
                    return (
                      <span
                        key={tagId}
                        className="inline-block rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-[10px] font-medium"
                      >
                        {tagLabels[tagId] || tagId} {pct}%
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right side: rating + check-in count */}
            <div className="shrink-0 text-right">
              {place.avgRating != null && (
                <div className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">
                    {place.avgRating.toFixed(1)}
                  </span>
                </div>
              )}
              {place.checkInCount > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {place.checkInCount} visit{place.checkInCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
