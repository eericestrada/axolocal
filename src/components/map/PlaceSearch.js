'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function PlaceSearch({ location }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);

  function handleChange(value) {
    setQuery(value);
    clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const body = { query: value };
      if (location?.latitude) {
        body.latitude = location.latitude;
        body.longitude = location.longitude;
      }

      try {
        const res = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 400);
  }

  function handleSelect(place) {
    setQuery('');
    setResults([]);
    setFocused(false);
    // Navigate to add page with the Google place ID pre-selected
    router.push(`/add?placeId=${place.id}&name=${encodeURIComponent(place.displayName?.text || place.name || '')}`);
  }

  function handleBlur() {
    // Delay to allow click on results
    setTimeout(() => setFocused(false), 200);
  }

  return (
    <div className="relative px-3 pt-1.5">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder="Search Google to add a place..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-1.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {focused && results.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
          {results.map((place) => (
            <button
              key={place.id}
              onMouseDown={() => handleSelect(place)}
              className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-b-0"
            >
              <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {place.displayName?.text || place.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {place.formattedAddress || place.shortFormattedAddress || ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
