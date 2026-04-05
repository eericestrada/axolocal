'use client';

import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { PIN_COLORS } from '@/utils/constants';

export default function PlacePin({ place, onClick, tagMatch, colorMap }) {
  const colors = colorMap || PIN_COLORS;
  const color = colors[place.primary_type] || colors.other || '#3b82f6';

  let size, opacity, showRating, showQuestion;

  switch (place.stage) {
    case 3:
      size = 36;
      opacity = 1;
      showRating = place.avgRating != null;
      break;
    case 2:
      size = 30;
      opacity = 1;
      showRating = false;
      break;
    default:
      size = 24;
      opacity = 0.7;
      showRating = false;
  }

  // Tag filter overrides
  if (tagMatch === 'unknown') {
    opacity = 0.3;
    showQuestion = true;
    showRating = false;
  } else if (tagMatch === 'match') {
    opacity = 1;
  }

  return (
    <AdvancedMarker
      position={{ lat: place.latitude, lng: place.longitude }}
      onClick={() => onClick?.(place)}
    >
      <div
        className="relative flex items-center justify-center rounded-full border-2 border-white shadow-md cursor-pointer"
        style={{
          width: size,
          height: size,
          backgroundColor: place.stage === 1 && !tagMatch ? '#9ca3af' : color,
          opacity,
        }}
      >
        {showRating && (
          <span className="text-white text-[11px] font-bold leading-none">
            {place.avgRating.toFixed(1)}
          </span>
        )}
        {showQuestion && (
          <span className="text-white text-[12px] font-bold leading-none">?</span>
        )}
      </div>
    </AdvancedMarker>
  );
}
