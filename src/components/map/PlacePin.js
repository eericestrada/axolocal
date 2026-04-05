'use client';

import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { PIN_COLORS } from '@/utils/constants';

export default function PlacePin({ place, onClick, tagMatch }) {
  const color = PIN_COLORS[place.primary_type] || PIN_COLORS.other;

  let size, opacity, showRating, showQuestion;

  switch (place.stage) {
    case 3:
      size = 20;
      opacity = 1;
      showRating = place.avgRating != null;
      break;
    case 2:
      size = 16;
      opacity = 1;
      showRating = false;
      break;
    default:
      size = 12;
      opacity = 0.5;
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
          <span className="text-white text-[7px] font-bold leading-none">
            {place.avgRating.toFixed(1)}
          </span>
        )}
        {showQuestion && (
          <span className="text-white text-[8px] font-bold leading-none">?</span>
        )}
      </div>
    </AdvancedMarker>
  );
}
