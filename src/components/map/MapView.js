'use client';

import { useState, useCallback, useRef } from 'react';
import { Map } from '@vis.gl/react-google-maps';
import MapProvider from './MapProvider';
import PlacePin from './PlacePin';
import PlaceCard from './PlaceCard';
import DiscoverHereBanner from './DiscoverHereBanner';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, SEEDABLE_TYPES } from '@/utils/constants';

export default function MapView({
  places,
  useCaseTags,
  userLocation,
  groupId,
  onPlaceSelect,
  onCheckIn,
}) {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const boundsRef = useRef(null);
  const debounceRef = useRef(null);

  const center = userLocation?.latitude
    ? { lat: userLocation.latitude, lng: userLocation.longitude }
    : DEFAULT_MAP_CENTER;

  const handleBoundsChanged = useCallback(
    (event) => {
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

      // Debounce discover check
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const inBounds = places.filter(
          (p) =>
            p.latitude >= boundsRef.current.south &&
            p.latitude <= boundsRef.current.north &&
            p.longitude >= boundsRef.current.west &&
            p.longitude <= boundsRef.current.east
        );
        setShowDiscover(inBounds.length === 0 && groupId);
      }, 1000);
    },
    [places, groupId]
  );

  const handleDiscover = useCallback(async () => {
    if (!boundsRef.current || !groupId) return;

    setDiscoverLoading(true);

    // Dry run first
    const estimateRes = await fetch('/api/places/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bounds: boundsRef.current,
        type: SEEDABLE_TYPES[0],
        groupId,
        dryRun: true,
      }),
    });
    const estimate = await estimateRes.json();

    if (estimate.error) {
      alert(estimate.error);
      setDiscoverLoading(false);
      return;
    }

    const confirmed = confirm(
      `This will search a ${estimate.gridSize} grid (${estimate.estimatedCalls} API calls, ~${estimate.estimatedCost}). Continue?`
    );

    if (!confirmed) {
      setDiscoverLoading(false);
      return;
    }

    const seedRes = await fetch('/api/places/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bounds: boundsRef.current,
        type: SEEDABLE_TYPES[0],
        groupId,
        dryRun: false,
      }),
    });
    const result = await seedRes.json();

    setDiscoverLoading(false);
    setShowDiscover(false);

    if (result.placesFound > 0) {
      alert(
        `Found ${result.placesFound} parks! ${result.placesInserted} new places added.`
      );
      // Parent should refetch places
      window.dispatchEvent(new Event('places-updated'));
    } else {
      alert('No parks found in this area.');
    }
  }, [groupId]);

  const handlePinClick = useCallback((place) => {
    setSelectedPlace(place);
  }, []);

  return (
    <MapProvider>
      <div className="relative w-full h-full">
        <Map
          defaultCenter={center}
          defaultZoom={DEFAULT_MAP_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI
          mapId="axolocal-map"
          onBoundsChanged={handleBoundsChanged}
          className="w-full h-full"
        >
          {places.map((place) => (
            <PlacePin
              key={place.id}
              place={place}
              onClick={handlePinClick}
              tagMatch={place.tagMatch}
            />
          ))}
        </Map>

        <DiscoverHereBanner
          visible={showDiscover}
          onDiscover={handleDiscover}
          loading={discoverLoading}
        />

        <PlaceCard
          place={selectedPlace}
          useCaseTags={useCaseTags}
          onClose={() => setSelectedPlace(null)}
          onDetail={(id) => {
            setSelectedPlace(null);
            onPlaceSelect?.(id);
          }}
          onCheckIn={onCheckIn}
        />
      </div>
    </MapProvider>
  );
}
