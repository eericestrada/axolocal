// Maps Google Places types to our normalized primary types
const TYPE_MAP = {
  // Parks
  park: 'park',
  playground: 'park',
  national_park: 'park',
  dog_park: 'park',
  // Cafes
  cafe: 'cafe',
  coffee_shop: 'cafe',
  // Restaurants
  restaurant: 'restaurant',
  fast_food_restaurant: 'restaurant',
  chinese_restaurant: 'restaurant',
  italian_restaurant: 'restaurant',
  japanese_restaurant: 'restaurant',
  mexican_restaurant: 'restaurant',
  thai_restaurant: 'restaurant',
  indian_restaurant: 'restaurant',
  american_restaurant: 'restaurant',
  barbecue_restaurant: 'restaurant',
  seafood_restaurant: 'restaurant',
  steak_house: 'restaurant',
  pizza_restaurant: 'restaurant',
  sushi_restaurant: 'restaurant',
  hamburger_restaurant: 'restaurant',
  sandwich_shop: 'restaurant',
  // Bars
  bar: 'bar',
  night_club: 'bar',
  wine_bar: 'bar',
  // Bakeries
  bakery: 'bakery',
  // Gyms
  gym: 'gym',
  fitness_center: 'gym',
};

// Priority when multiple types match — first match wins
const TYPE_PRIORITY = ['park', 'cafe', 'restaurant', 'bar', 'bakery', 'gym'];

/**
 * Normalize a single Google Places primaryType string.
 * @param {string} googlePrimaryType - e.g., "cafe", "restaurant"
 * @returns {string} normalized type
 */
export function normalizeSingleType(googlePrimaryType) {
  if (!googlePrimaryType) return 'other';
  return TYPE_MAP[googlePrimaryType] || 'other';
}

/**
 * Normalize from a Google Places types array.
 * Checks each type against TYPE_MAP, returns the highest-priority match.
 * @param {string[]} googleTypes - e.g., ["cafe", "restaurant", "food"]
 * @returns {string} normalized type
 */
export function normalizePrimaryType(googleTypes) {
  if (!googleTypes || !Array.isArray(googleTypes) || googleTypes.length === 0) {
    return 'other';
  }

  const matched = new Set();
  for (const type of googleTypes) {
    const normalized = TYPE_MAP[type];
    if (normalized) matched.add(normalized);
  }

  for (const priority of TYPE_PRIORITY) {
    if (matched.has(priority)) return priority;
  }

  return 'other';
}
