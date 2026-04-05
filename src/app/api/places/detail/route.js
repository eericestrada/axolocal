import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');
  if (!placeId) {
    return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
  }

  // placeId should be in format "places/ChIJ..."
  const name = placeId.startsWith('places/') ? placeId : `places/${placeId}`;

  const res = await fetch(`https://places.googleapis.com/v1/${name}`, {
    headers: {
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types,primaryType,currentOpeningHours,nationalPhoneNumber,websiteUri,googleMapsUri,photos',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Google Places detail error:', err);
    return NextResponse.json({ error: 'Google Places API error' }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
