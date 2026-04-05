'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Map } from '@vis.gl/react-google-maps';
import MapProvider from '@/components/map/MapProvider';
import { useGroup } from '@/hooks/useGroup';
import { useBundles } from '@/hooks/useBundles';
import { useLocation } from '@/hooks/useLocation';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/utils/constants';

export default function DiscoverPage() {
  const router = useRouter();
  const { group, loading: groupLoading } = useGroup();
  const { bundles, loading: bundlesLoading } = useBundles(group?.id);
  const location = useLocation();

  const [selectedBundleId, setSelectedBundleId] = useState('all');
  const [regionName, setRegionName] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState(null);
  const boundsRef = useRef(null);

  // "All" combines every bundle's types; otherwise pick the selected one
  const isAll = selectedBundleId === 'all';
  const selectedBundle = isAll
    ? null
    : bundles.find((b) => b.id === selectedBundleId) || bundles[0];

  // Combine all bundle types (deduplicated) for "All" mode
  const allTypes = isAll
    ? [...new Set(bundles.flatMap((b) => b.google_types || []))]
    : selectedBundle?.google_types || [];

  const center = location.latitude
    ? { lat: location.latitude, lng: location.longitude }
    : DEFAULT_MAP_CENTER;

  function handleBoundsChanged(event) {
    const map = event.map;
    const bounds = map.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    boundsRef.current = {
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    };
    setEstimate(null);
    setResult(null);
  }

  async function handleEstimate() {
    if (!boundsRef.current || !group || !selectedBundle) return;
    setEstimating(true);
    setEstimate(null);

    const res = await fetch('/api/places/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bounds: boundsRef.current,
        types: allTypes,
        bundleSlug: isAll ? 'all' : selectedBundle?.slug,
        groupId: group.id,
        dryRun: true,
      }),
    });
    const data = await res.json();
    setEstimating(false);

    if (data.error) {
      alert(data.error);
    } else {
      setEstimate(data);
    }
  }

  async function handleSeed() {
    if (!boundsRef.current || !group || !selectedBundle) return;
    setSeeding(true);

    const res = await fetch('/api/places/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bounds: boundsRef.current,
        types: allTypes,
        bundleSlug: isAll ? 'all' : selectedBundle?.slug,
        groupId: group.id,
        regionName: regionName.trim() || undefined,
        dryRun: false,
      }),
    });
    const data = await res.json();
    setSeeding(false);
    setResult(data);
  }

  if (groupLoading || bundlesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div className="flex-1 min-h-0">
        <MapProvider>
          <Map
            defaultCenter={center}
            defaultZoom={DEFAULT_MAP_ZOOM}
            gestureHandling="greedy"
            disableDefaultUI
            mapId="81fa7c449cfa673e73222cfd"
            onBoundsChanged={handleBoundsChanged}
            className="w-full h-full"
          />
        </MapProvider>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <h2 className="text-base font-semibold">Discover Places</h2>
        <p className="text-xs text-gray-500">
          Pan the map to the area you want to search, pick a category, then discover.
          Re-searching an area costs the same — results are deduplicated but API calls are not.
        </p>

        {/* Bundle selector */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedBundleId('all')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isAll
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {bundles.map((bundle) => (
            <button
              key={bundle.id}
              onClick={() => setSelectedBundleId(bundle.id)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                selectedBundle?.id === bundle.id
                  ? { backgroundColor: bundle.color, color: '#fff' }
                  : { backgroundColor: '#f3f4f6', color: '#374151' }
              }
            >
              {bundle.label}
            </button>
          ))}
        </div>

        {isAll && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            Tip: "All Categories" works best in suburban/spread-out areas. For dense areas
            (downtown), search individual categories for more complete results — each API
            call returns max 20 places regardless of how many exist.
          </p>
        )}

        {/* Region name */}
        <input
          type="text"
          value={regionName}
          onChange={(e) => setRegionName(e.target.value)}
          placeholder="Region name (optional, e.g., San Antonio)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />

        {/* Estimate */}
        {estimate && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p>
              Grid: <strong>{estimate.gridSize}</strong> ({estimate.estimatedCalls} API calls)
            </p>
            <p>
              Estimated cost: <strong>{estimate.estimatedCost}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Google provides $200/mo free credit — well within that limit.
            </p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-lg bg-green-50 p-3 text-sm">
            <p>
              Found <strong>{result.placesFound}</strong> places.{' '}
              <strong>{result.placesInserted}</strong> new places added.
            </p>
            <button
              onClick={() => router.push('/map')}
              className="text-green-600 font-medium mt-1"
            >
              View on Map
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleEstimate}
            disabled={estimating || allTypes.length === 0}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {estimating ? 'Estimating...' : 'Estimate'}
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding || !estimate}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {seeding ? 'Searching...' : `Discover ${isAll ? 'All' : selectedBundle?.label || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
