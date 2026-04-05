import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePrimaryType, normalizeSingleType } from '@/utils/type-mapping';
import {
  GRID_SPACING_MILES,
  MAX_GRID_CELLS,
  SEED_RADIUS_METERS,
  COST_PER_1000_REQUESTS,
} from '@/utils/constants';

function computeGrid(bounds) {
  const { north, south, east, west } = bounds;
  const centerLat = (north + south) / 2;
  const heightMiles = (north - south) * 69.0;
  const widthMiles = (east - west) * 69.0 * Math.cos((centerLat * Math.PI) / 180);

  const rows = Math.max(1, Math.ceil(heightMiles / GRID_SPACING_MILES));
  const cols = Math.max(1, Math.ceil(widthMiles / GRID_SPACING_MILES));

  if (rows * cols > MAX_GRID_CELLS) {
    return { error: `Area too large (${rows}x${cols} = ${rows * cols} cells). Max is ${MAX_GRID_CELLS}. Zoom in or pick a smaller area.` };
  }

  const latStep = (north - south) / rows;
  const lngStep = (east - west) / cols;
  const points = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      points.push({
        latitude: south + (i + 0.5) * latStep,
        longitude: west + (j + 0.5) * lngStep,
      });
    }
  }

  return { rows, cols, points, totalCells: rows * cols };
}

const MAX_TYPES_PER_REQUEST = 50;

// Track types Google has rejected so we don't retry them
const invalidTypes = new Set();

async function searchNearbyBatch(center, typeBatch) {
  // Filter out previously rejected types
  const validTypes = typeBatch.filter((t) => !invalidTypes.has(t));
  if (validTypes.length === 0) return [];

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType',
    },
    body: JSON.stringify({
      includedTypes: validTypes,
      locationRestriction: {
        circle: {
          center: { latitude: center.latitude, longitude: center.longitude },
          radius: SEED_RADIUS_METERS,
        },
      },
      maxResultCount: 20,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // If Google rejects a type, extract it, add to invalid set, and retry without it
    const msg = data.error?.message || '';
    const match = msg.match(/Unsupported types?: (.+)\./);
    if (res.status === 400 && match) {
      const badTypes = match[1].split(',').map((t) => t.trim());
      badTypes.forEach((t) => invalidTypes.add(t));
      console.warn('Skipping invalid types:', badTypes.join(', '));
      return searchNearbyBatch(center, validTypes.filter((t) => !invalidTypes.has(t)));
    }
    console.error('Nearby search error:', res.status, JSON.stringify(data));
    return [];
  }

  return data.places || [];
}

async function searchNearby(center, includedTypes) {
  // Google limits includedTypes to 50 per request; batch if needed
  if (includedTypes.length <= MAX_TYPES_PER_REQUEST) {
    return searchNearbyBatch(center, includedTypes);
  }

  const allResults = [];
  const seen = new Set();
  for (let i = 0; i < includedTypes.length; i += MAX_TYPES_PER_REQUEST) {
    const batch = includedTypes.slice(i, i + MAX_TYPES_PER_REQUEST);
    const results = await searchNearbyBatch(center, batch);
    for (const place of results) {
      if (!seen.has(place.id)) {
        seen.add(place.id);
        allResults.push(place);
      }
    }
  }
  return allResults;
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bounds, type, types, bundleSlug, groupId, regionName, dryRun } = await request.json();

  // Support both old single-type and new multi-type format
  const includedTypes = types || (type ? [type] : null);

  if (!bounds || !includedTypes || !groupId) {
    return NextResponse.json(
      { error: 'bounds, types (or type), and groupId are required' },
      { status: 400 }
    );
  }

  // Verify group membership
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a group member' }, { status: 403 });
  }

  const grid = computeGrid(bounds);
  if (grid.error) {
    return NextResponse.json({ error: grid.error }, { status: 400 });
  }

  // Dry run — return estimate only
  if (dryRun) {
    const typeBatches = Math.ceil(includedTypes.length / MAX_TYPES_PER_REQUEST);
    const totalCalls = grid.totalCells * typeBatches;
    const estimatedCost = ((totalCalls / 1000) * COST_PER_1000_REQUESTS).toFixed(2);
    return NextResponse.json({
      estimatedCalls: totalCalls,
      gridSize: `${grid.rows}x${grid.cols}`,
      typeBatches,
      estimatedCost: `$${estimatedCost}`,
    });
  }

  // Real run — search and insert
  const seen = new Set();
  const allPlaces = [];

  // Sequential to respect rate limits
  for (const point of grid.points) {
    const results = await searchNearby(point, includedTypes);
    for (const place of results) {
      if (!seen.has(place.id)) {
        seen.add(place.id);
        allPlaces.push(place);
      }
    }
  }

  if (allPlaces.length === 0) {
    return NextResponse.json({
      region: null,
      placesFound: 0,
      placesInserted: 0,
      apiCallsMade: grid.totalCells,
    });
  }

  // Create region
  const { data: region } = await supabase
    .from('regions')
    .insert({
      group_id: groupId,
      name: regionName || 'Discovered Area',
      auto_detected: !regionName,
      bounds,
    })
    .select()
    .single();

  // Prepare place rows
  const placeRows = allPlaces.map((place) => ({
    google_place_id: place.id,
    name: place.displayName?.text || 'Unknown',
    address: place.formattedAddress || '',
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    primary_type: place.primaryType
      ? normalizeSingleType(place.primaryType)
      : normalizePrimaryType(place.types),
    google_types: place.types || [],
    source: 'seeded',
    group_id: groupId,
    region_id: region?.id,
  }));

  // Batch upsert (100 at a time)
  let insertedCount = 0;
  for (let i = 0; i < placeRows.length; i += 100) {
    const batch = placeRows.slice(i, i + 100);
    const { data, error } = await supabase
      .from('places')
      .upsert(batch, { onConflict: 'google_place_id', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error('Batch insert error:', error);
    } else {
      insertedCount += (data?.length || 0);
    }
  }

  // Log activity
  await supabase.from('activity').insert({
    group_id: groupId,
    user_id: user.id,
    action_type: 'discovery',
    metadata: {
      bundleSlug: bundleSlug || type,
      regionName: region?.name,
      placesFound: allPlaces.length,
      placesInserted: insertedCount,
    },
  });

  return NextResponse.json({
    region,
    placesFound: allPlaces.length,
    placesInserted: insertedCount,
    apiCallsMade: grid.totalCells,
  });
}
