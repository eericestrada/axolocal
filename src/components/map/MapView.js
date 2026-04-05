'use client';

import { useState, useCallback, useMemo } from 'react';
import { Map } from '@vis.gl/react-google-maps';
import MapProvider from './MapProvider';
import PlacePin from './PlacePin';
import PlaceCard from './PlaceCard';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, PIN_COLORS } from '@/utils/constants';

export default function MapView({
  places,
  useCaseTags,
  userLocation,
  bundles,
  onPlaceSelect,
  onCheckIn,
}) {
  const colorMap = useMemo(() => {
    const map = { ...PIN_COLORS };
    if (bundles) {
      for (const b of bundles) {
        map[b.slug] = b.color;
      }
    }
    return map;
  }, [bundles]);

  const [selectedPlace, setSelectedPlace] = useState(null);

  const center = userLocation?.latitude
    ? { lat: userLocation.latitude, lng: userLocation.longitude }
    : DEFAULT_MAP_CENTER;

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
          mapId="81fa7c449cfa673e1ee5e17e"
          className="w-full h-full"
        >
          {places.map((place) => (
            <PlacePin
              key={place.id}
              place={place}
              onClick={handlePinClick}
              tagMatch={place.tagMatch}
              colorMap={colorMap}
            />
          ))}
        </Map>

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
