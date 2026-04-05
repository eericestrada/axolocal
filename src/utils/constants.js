// Pin colors by primary type
export const PIN_COLORS = {
  park: '#16a34a',       // green
  cafe: '#92400e',       // brown
  restaurant: '#dc2626', // red
  bar: '#7c3aed',        // purple
  bakery: '#ea580c',     // orange
  gym: '#0891b2',        // cyan
  other: '#3b82f6',      // blue
};

// Primary types for the filter bar
export const PRIMARY_TYPES = [
  { slug: 'park', label: 'Parks' },
  { slug: 'cafe', label: 'Coffee' },
  { slug: 'restaurant', label: 'Restaurants' },
  { slug: 'bar', label: 'Bars' },
  { slug: 'bakery', label: 'Bakeries' },
  { slug: 'gym', label: 'Gyms' },
];

// Types eligible for bulk seeding
export const SEEDABLE_TYPES = ['park'];

// Default map center (San Antonio)
export const DEFAULT_MAP_CENTER = { lat: 29.4241, lng: -98.4936 };
export const DEFAULT_MAP_ZOOM = 13;

// Seeding config
export const GRID_SPACING_MILES = 1.0;
export const MAX_GRID_CELLS = 900;
export const SEED_RADIUS_METERS = 1200;

// Google Places API cost per 1000 Nearby Search requests
export const COST_PER_1000_REQUESTS = 32;
