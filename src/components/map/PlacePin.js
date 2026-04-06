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

  // Stage 1: hollow outline pin (unevaluated)
  // Stage 2+: solid filled pin (evaluated)
  const isUneval = place.stage === 1 && !tagMatch;

  return (
    <AdvancedMarker
      position={{ lat: place.latitude, lng: place.longitude }}
      onClick={() => onClick?.(place)}
    >
      <div
        className="relative flex items-center justify-center rounded-full cursor-pointer"
        style={{
          width: size,
          height: size,
          backgroundColor: isUneval ? 'white' : color,
          border: isUneval ? `2.5px solid ${color}` : '2px solid white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
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
