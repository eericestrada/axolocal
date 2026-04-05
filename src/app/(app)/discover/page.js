'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Map } from '@vis.gl/react-google-maps';
import MapProvider from '@/components/map/MapProvider';
import { useGroup } from '@/hooks/useGroup';
import { useLocation } from '@/hooks/useLocation';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, SEEDABLE_TYPES } from '@/utils/constants';

export default function DiscoverPage() {
  const router = useRouter();
  const { group, loading: groupLoading } = useGroup();
  const location = useLocation();

  const [selectedType, setSelectedType] = useState(SEEDABLE_TYPES[0]);
  const [regionName, setRegionName] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState(null);
  const boundsRef = useRef(null);

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
    // Reset estimate when map moves
    setEstimate(null);
    setResult(null);
  }

  async function handleEstimate() {
    if (!boundsRef.current || !group) return;
    setEstimating(true);
    setEstimate(null);

    const res = await fetch('/api/places/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bounds: boundsRef.current,
        type: selectedType,
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
    if (!boundsRef.current || !group) return;
    setSeeding(true);

    const res = await fetch('/api/places/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bounds: boundsRef.current,
        type: selectedType,
        groupId: group.id,
        regionName: regionName.trim() || undefined,
        dryRun: false,
      }),
    });
    const data = await res.json();
    setSeeding(false);
    setResult(data);
  }

  if (groupLoading) {
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
            mapId="axolocal-discover"
            onBoundsChanged={handleBoundsChanged}
            className="w-full h-full"
          />
        </MapProvider>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <h2 className="text-base font-semibold">Discover Places</h2>
        <p className="text-xs text-gray-500">
          Pan the map to the area you want to search, then discover.
        </p>

        {/* Type selector */}
        <div className="flex gap-2">
          {SEEDABLE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedType === type
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}s
            </button>
          ))}
        </div>

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
              Found <strong>{result.placesFound}</strong> {selectedType}s.{' '}
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
            disabled={estimating}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {estimating ? 'Estimating...' : 'Estimate'}
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding || !estimate}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {seeding ? 'Searching...' : `Discover ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}s`}
          </button>
        </div>
      </div>
    </div>
  );
}
