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

  // Evaluated (stage 2+) always shows as solid — they've been interacted with
  // Unseen (never tapped, stage 1) = hollow outline
  // Seen but not evaluated = solid
  // Wishlisted = gold ring
  const isUnseen = !place.viewed && place.stage === 1 && !tagMatch;
  const isWishlisted = place.wishlisted;

  let bgColor, borderStyle;
  if (isWishlisted) {
    bgColor = color;
    borderStyle = '3px solid #f59e0b'; // amber/gold ring
  } else if (isUnseen) {
    bgColor = 'white';
    borderStyle = `2.5px solid ${color}`;
  } else {
    bgColor = color;
    borderStyle = '2px solid white';
  }

  return (
    <AdvancedMarker
      position={{ lat: place.latitude, lng: place.longitude }}
      onClick={() => onClick?.(place)}
    >
      <div
        className="relative flex items-center justify-center rounded-full cursor-pointer"
        style={{
          width: isWishlisted ? size + 2 : size,
          height: isWishlisted ? size + 2 : size,
          backgroundColor: bgColor,
          border: borderStyle,
          boxShadow: isWishlisted
            ? '0 0 6px rgba(245, 158, 11, 0.5), 0 1px 4px rgba(0,0,0,0.3)'
            : '0 1px 4px rgba(0,0,0,0.3)',
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
