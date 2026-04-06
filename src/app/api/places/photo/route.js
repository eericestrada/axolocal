import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const photoName = searchParams.get('name');
  if (!photoName) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const maxHeight = searchParams.get('maxHeight') || '400';

  const res = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${maxHeight}&skipHttpRedirect=true`,
    {
      headers: {
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ photoUri: data.photoUri });
}
