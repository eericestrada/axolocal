// Maps Google Places types to our normalized primary types
const TYPE_MAP = {
  // Parks & Outdoors
  park: 'park',
  city_park: 'park',
  state_park: 'park',
  national_park: 'park',
  playground: 'park',
  indoor_playground: 'park',
  dog_park: 'park',
  nature_preserve: 'park',
  hiking_area: 'park',
  botanical_garden: 'park',
  garden: 'park',
  wildlife_park: 'park',
  wildlife_refuge: 'park',
  campground: 'park',
  picnic_ground: 'park',
  barbecue_area: 'park',
  beach: 'park',
  scenic_spot: 'park',
  skateboard_park: 'park',
  water_park: 'park',
  // Cafes
  cafe: 'cafe',
  coffee_shop: 'cafe',
  coffee_stand: 'cafe',
  coffee_roastery: 'cafe',
  tea_house: 'cafe',
  cat_cafe: 'cafe',
  dog_cafe: 'cafe',
  internet_cafe: 'cafe',
  // Restaurants
  restaurant: 'restaurant',
  family_restaurant: 'restaurant',
  fine_dining_restaurant: 'restaurant',
  fast_food_restaurant: 'restaurant',
  diner: 'restaurant',
  bistro: 'restaurant',
  gastropub: 'restaurant',
  buffet_restaurant: 'restaurant',
  brunch_restaurant: 'restaurant',
  breakfast_restaurant: 'restaurant',
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
  korean_restaurant: 'restaurant',
  vietnamese_restaurant: 'restaurant',
  greek_restaurant: 'restaurant',
  french_restaurant: 'restaurant',
  spanish_restaurant: 'restaurant',
  mediterranean_restaurant: 'restaurant',
  middle_eastern_restaurant: 'restaurant',
  ethiopian_restaurant: 'restaurant',
  caribbean_restaurant: 'restaurant',
  latin_american_restaurant: 'restaurant',
  brazilian_restaurant: 'restaurant',
  peruvian_restaurant: 'restaurant',
  ramen_restaurant: 'restaurant',
  noodle_shop: 'restaurant',
  taco_restaurant: 'restaurant',
  burrito_restaurant: 'restaurant',
  kebab_shop: 'restaurant',
  falafel_restaurant: 'restaurant',
  vegan_restaurant: 'restaurant',
  vegetarian_restaurant: 'restaurant',
  deli: 'restaurant',
  food_court: 'restaurant',
  // Bars
  bar: 'bar',
  bar_and_grill: 'bar',
  cocktail_bar: 'bar',
  night_club: 'bar',
  wine_bar: 'bar',
  sports_bar: 'bar',
  beer_garden: 'bar',
  brewery: 'bar',
  brewpub: 'bar',
  pub: 'bar',
  irish_pub: 'bar',
  lounge_bar: 'bar',
  hookah_bar: 'bar',
  // Bakeries & Sweets
  bakery: 'bakery',
  ice_cream_shop: 'bakery',
  dessert_shop: 'bakery',
  dessert_restaurant: 'bakery',
  donut_shop: 'bakery',
  candy_store: 'bakery',
  chocolate_shop: 'bakery',
  cake_shop: 'bakery',
  pastry_shop: 'bakery',
  confectionery: 'bakery',
  acai_shop: 'bakery',
  juice_shop: 'bakery',
  // Gyms & Fitness
  gym: 'gym',
  fitness_center: 'gym',
  sports_club: 'gym',
  sports_complex: 'gym',
  swimming_pool: 'gym',
  yoga_studio: 'gym',
  athletic_field: 'gym',
  tennis_court: 'gym',
  ice_skating_rink: 'gym',
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
