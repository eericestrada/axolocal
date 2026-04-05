'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { normalizePrimaryType, normalizeSingleType } from '@/utils/type-mapping';
import { PIN_COLORS } from '@/utils/constants';
import BottomSheet from '@/components/ui/BottomSheet';

export default function GooglePlacePreview({ place, groupId, userId, onClose, onAdded }) {
  const supabase = createClient();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);

  useEffect(() => {
    if (!place) return;
    setLoading(true);
    setDetails(null);
    setAlreadyExists(false);

    async function load() {
      // Check if already in our group's places
      const { data: existing } = await supabase
        .from('places')
        .select('id')
        .eq('google_place_id', place.googlePlaceId)
        .eq('group_id', groupId)
        .maybeSingle();

      if (existing) {
        setAlreadyExists(true);
        setDetails({ existingId: existing.id });
        setLoading(false);
        return;
      }

      // Fetch full details from Google
      try {
        const res = await fetch(`/api/places/detail?placeId=${place.googlePlaceId}`);
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        }
      } catch {
        // Fall back to search data
      }
      setLoading(false);
    }
    load();
  }, [place, groupId, supabase]);

  async function handleAdd() {
    if (!place || !groupId) return;
    setSaving(true);

    const primaryType = place.primaryType
      ? normalizeSingleType(place.primaryType)
      : normalizePrimaryType(place.googleTypes);

    const { data: newPlace, error } = await supabase
      .from('places')
      .upsert(
        {
          google_place_id: place.googlePlaceId,
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          primary_type: primaryType,
          google_types: place.googleTypes,
          source: 'manual',
          added_by: userId,
          group_id: groupId,
        },
        { onConflict: 'google_place_id' }
      )
      .select()
      .single();

    if (error) {
      alert('Failed to add place: ' + error.message);
      setSaving(false);
      return;
    }

    // Log activity
    await supabase.from('activity').insert({
      group_id: groupId,
      user_id: userId,
      place_id: newPlace.id,
      action_type: 'add_place',
      metadata: { name: place.name, primaryType },
    });

    setSaving(false);
    onAdded?.(newPlace.id);
  }

  function handleViewExisting() {
    if (details?.existingId) {
      onAdded?.(details.existingId);
    }
  }

  if (!place) return null;

  const color = PIN_COLORS[place.primaryType] || PIN_COLORS.other;

  // Format hours for display
  function formatHours(openingHours) {
    if (!openingHours?.weekdayDescriptions) return null;
    const today = new Date().getDay();
    // Google returns Mon=0, but JS Date.getDay() returns Sun=0
    const idx = today === 0 ? 6 : today - 1;
    return openingHours.weekdayDescriptions[idx] || null;
  }

  const todayHours = details?.currentOpeningHours ? formatHours(details.currentOpeningHours) : null;

  return (
    <BottomSheet open={!!place} onClose={onClose} height="auto">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alreadyExists ? (
        <div className="pb-2">
          <div className="flex items-start gap-2 mb-3">
            <div className="flex-1">
              <h3 className="text-base font-bold">{place.name}</h3>
              <p className="text-xs text-gray-500">{place.address}</p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {place.primaryType}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">This place is already on your map!</p>
          <button
            onClick={handleViewExisting}
            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            View Details
          </button>
        </div>
      ) : (
        <div className="pb-2">
          {/* Header */}
          <div className="flex items-start gap-2 mb-3">
            <div className="flex-1">
              <h3 className="text-base font-bold">{details?.displayName?.text || place.name}</h3>
              <p className="text-xs text-gray-500">{details?.formattedAddress || place.address}</p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {place.primaryType}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-4">
            {/* Today's hours */}
            {todayHours && (
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-700">{todayHours}</p>
              </div>
            )}

            {/* Phone */}
            {details?.nationalPhoneNumber && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <a href={`tel:${details.nationalPhoneNumber}`} className="text-sm text-green-700 font-medium">
                  {details.nationalPhoneNumber}
                </a>
              </div>
            )}

            {/* Website */}
            {details?.websiteUri && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                <a
                  href={details.websiteUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 font-medium truncate"
                >
                  {details.websiteUri.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              </div>
            )}

            {/* Google Maps link */}
            {details?.googleMapsUri && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <a
                  href={details.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 font-medium"
                >
                  View on Google Maps
                </a>
              </div>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add to Map'}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
