'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import MapProvider from './MapProvider';
import PlacePin from './PlacePin';
import PlaceCard from './PlaceCard';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, PIN_COLORS } from '@/utils/constants';

function MapInner({
  places,
  useCaseTags,
  userLocation,
  bundles,
  panTo,
  onPlaceSelect,
  onCheckIn,
  onWishlist,
  onHide,
}) {
  const map = useMap();

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

  // Pan to a location when panTo changes
  useEffect(() => {
    if (panTo && map) {
      map.panTo({ lat: panTo.lat, lng: panTo.lng });
      map.setZoom(15);
    }
  }, [panTo, map]);

  const handlePinClick = useCallback((place) => {
    setSelectedPlace(place);
  }, []);

  return (
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

        {/* Temporary pin for searched place */}
        {panTo && (
          <AdvancedMarker position={{ lat: panTo.lat, lng: panTo.lng }}>
            <div className="flex flex-col items-center">
              <div className="bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap mb-1">
                {panTo.name || 'Searched place'}
              </div>
              <div className="w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow-lg animate-pulse" />
            </div>
          </AdvancedMarker>
        )}
      </Map>

      {/* My location button */}
      {userLocation?.latitude && (
        <button
          onClick={() => {
            if (map) {
              map.panTo({ lat: userLocation.latitude, lng: userLocation.longitude });
              map.setZoom(15);
            }
          }}
          className="absolute bottom-24 right-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100"
          aria-label="Go to my location"
        >
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3m10-10h-3M5 12H2" />
          </svg>
        </button>
      )}

      <PlaceCard
        place={selectedPlace}
        useCaseTags={useCaseTags}
        onClose={() => setSelectedPlace(null)}
        onDetail={(id) => {
          setSelectedPlace(null);
          onPlaceSelect?.(id);
        }}
        onCheckIn={onCheckIn}
        onWishlist={(place) => {
          // Optimistic update so the button reflects immediately
          setSelectedPlace((prev) =>
            prev && prev.id === place.id
              ? { ...prev, wishlisted: !prev.wishlisted }
              : prev
          );
          onWishlist?.(place);
        }}
        onHide={(place) => {
          setSelectedPlace(null);
          onHide?.(place);
        }}
      />
    </div>
  );
}

export default function MapView(props) {
  return (
    <MapProvider>
      <MapInner {...props} />
    </MapProvider>
  );
}
