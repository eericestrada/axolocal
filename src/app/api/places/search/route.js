import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePrimaryType, normalizeSingleType } from '@/utils/type-mapping';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { query, latitude, longitude, radius } = await request.json();
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const body = {
    textQuery: query,
    maxResultCount: 10,
  };

  if (latitude && longitude) {
    body.locationBias = {
      circle: {
        center: { latitude, longitude },
        radius: radius || 5000,
      },
    };
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Google Places search error:', err);
    return NextResponse.json({ error: 'Google Places API error' }, { status: 502 });
  }

  const data = await res.json();
  const results = (data.places || []).map((place) => ({
    googlePlaceId: place.id,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    primaryType: place.primaryType
      ? normalizeSingleType(place.primaryType)
      : normalizePrimaryType(place.types),
    googleTypes: place.types || [],
  }));

  return NextResponse.json({ results });
}
