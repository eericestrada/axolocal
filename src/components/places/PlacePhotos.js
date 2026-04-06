'use client';

import { useState, useEffect } from 'react';

export default function PlacePhotos({ googlePlaceId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!googlePlaceId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        // Fetch place details to get photo references
        const detailRes = await fetch(`/api/places/detail?placeId=${googlePlaceId}`);
        if (!detailRes.ok) { setLoading(false); return; }
        const detail = await detailRes.json();

        if (!detail.photos || detail.photos.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch up to 5 photo URIs
        const photoNames = detail.photos.slice(0, 5);
        const uris = await Promise.all(
          photoNames.map(async (photo) => {
            try {
              const res = await fetch(`/api/places/photo?name=${encodeURIComponent(photo.name)}&maxHeight=400`);
              if (!res.ok) return null;
              const data = await res.json();
              return data.photoUri;
            } catch {
              return null;
            }
          })
        );

        setPhotos(uris.filter(Boolean));
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    load();
  }, [googlePlaceId]);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto py-2 px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shrink-0 w-48 h-32 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) return null;

  return (
    <div className="border-b border-gray-100">
      <div className="flex gap-2 overflow-x-auto py-3 px-4 snap-x">
        {photos.map((uri, i) => (
          <img
            key={i}
            src={uri}
            alt={`Photo ${i + 1}`}
            className="shrink-0 w-48 h-32 rounded-lg object-cover snap-start"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}
