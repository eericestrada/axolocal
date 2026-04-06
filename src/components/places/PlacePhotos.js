'use client';

import { useState, useEffect } from 'react';

/**
 * PlacePhotos — horizontal scrollable photo strip with lightbox.
 *
 * Props:
 *   googlePlaceId — fetch photos from Google Places API
 *   compact — smaller thumbnails for PlaceCard (default false)
 *   maxPhotos — limit number of photos (default 5)
 */
export default function PlacePhotos({ googlePlaceId, compact = false, maxPhotos = 5 }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    if (!googlePlaceId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const detailRes = await fetch(`/api/places/detail?placeId=${googlePlaceId}`);
        if (!detailRes.ok) { setLoading(false); return; }
        const detail = await detailRes.json();

        if (!detail.photos || detail.photos.length === 0) {
          setLoading(false);
          return;
        }

        const photoNames = detail.photos.slice(0, maxPhotos);
        const uris = await Promise.all(
          photoNames.map(async (photo) => {
            try {
              const res = await fetch(
                `/api/places/photo?name=${encodeURIComponent(photo.name)}&maxHeight=${compact ? '200' : '400'}`
              );
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
  }, [googlePlaceId, compact, maxPhotos]);

  if (loading) {
    const w = compact ? 'w-28' : 'w-48';
    const h = compact ? 'h-20' : 'h-32';
    return (
      <div className={`flex gap-2 overflow-x-auto py-2 ${compact ? '' : 'px-4'}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={`shrink-0 ${w} ${h} rounded-lg bg-gray-100 animate-pulse`} />
        ))}
      </div>
    );
  }

  if (photos.length === 0) return null;

  const imgClass = compact
    ? 'shrink-0 w-28 h-20 rounded-lg object-cover snap-start cursor-pointer'
    : 'shrink-0 w-48 h-32 rounded-lg object-cover snap-start cursor-pointer';

  return (
    <>
      <div className={compact ? '' : 'border-b border-gray-100'}>
        <div className={`flex gap-2 overflow-x-auto snap-x ${compact ? 'py-2' : 'py-3 px-4'}`}>
          {photos.map((uri, i) => (
            <img
              key={i}
              src={uri}
              alt={`Photo ${i + 1}`}
              className={imgClass}
              loading="lazy"
              onClick={() => setLightboxIdx(i)}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous */}
          {lightboxIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
              className="absolute left-2 text-white/80 hover:text-white z-10"
            >
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          {/* Next */}
          {lightboxIdx < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
              className="absolute right-2 text-white/80 hover:text-white z-10"
            >
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}

          {/* Image */}
          <img
            src={photos[lightboxIdx]}
            alt={`Photo ${lightboxIdx + 1}`}
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Counter */}
          <p className="absolute bottom-4 text-white/60 text-sm">
            {lightboxIdx + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
