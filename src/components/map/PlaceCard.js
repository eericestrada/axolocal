'use client';

import BottomSheet from '@/components/ui/BottomSheet';
import StarRating from '@/components/ui/StarRating';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';
import PlacePhotos from '@/components/places/PlacePhotos';
import { PIN_COLORS } from '@/utils/constants';

export default function PlaceCard({ place, useCaseTags, onClose, onDetail, onCheckIn, onWishlist, onHide }) {
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

      {/* Photos */}
      {place.google_place_id && (
        <PlacePhotos googlePlaceId={place.google_place_id} compact maxPhotos={3} />
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

      {/* Actions — two rows */}
      <div className="flex gap-1.5 mb-1.5">
        {/* Navigate */}
        <button
          onClick={handleNavigate}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-600 px-2 py-2 text-xs font-medium text-white hover:bg-green-700"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
          Navigate
        </button>
        {/* Check In */}
        <button
          onClick={() => onCheckIn?.(place)}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-300 px-2 py-2 text-xs font-medium hover:bg-gray-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Check In
        </button>
        {/* Details */}
        <button
          onClick={() => onDetail?.(place.id)}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-300 px-2 py-2 text-xs font-medium hover:bg-gray-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          Details
        </button>
      </div>
      <div className="flex gap-1.5">
        {/* Wishlist */}
        <button
          onClick={() => onWishlist?.(place)}
          className={`flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
            place.wishlisted
              ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300'
              : 'border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill={place.wishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          {place.wishlisted ? 'Saved' : 'Wishlist'}
        </button>
        {/* Hide */}
        <button
          onClick={() => onHide?.(place)}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-300 px-2 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
          Hide
        </button>
      </div>
    </BottomSheet>
  );
}
