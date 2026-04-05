'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useGroup } from '@/hooks/useGroup';
import { useBundles } from '@/hooks/useBundles';

// Comprehensive list of Google Place types available for bundling (Table A - searchable)
const AVAILABLE_GOOGLE_TYPES = [
  { category: 'Parks & Outdoors', types: [
    'park', 'city_park', 'state_park', 'national_park', 'dog_park',
    'playground', 'garden', 'botanical_garden', 'nature_preserve',
    'hiking_area', 'picnic_ground', 'barbecue_area', 'beach',
    'scenic_spot', 'wildlife_park', 'wildlife_refuge',
    'campground', 'camping_cabin', 'rv_park',
    'marina', 'fishing_pier', 'fishing_pond',
  ]},
  { category: 'Family & Kids', types: [
    'amusement_park', 'water_park', 'zoo', 'aquarium',
    'indoor_playground', 'miniature_golf_course', 'go_karting_venue',
    'trampoline_park', 'skateboard_park', 'cycling_park',
    'childrens_camp', 'summer_camp_organizer',
  ]},
  { category: 'Coffee & Tea', types: [
    'cafe', 'coffee_shop', 'coffee_stand', 'coffee_roastery',
    'tea_house', 'cat_cafe', 'dog_cafe', 'internet_cafe',
  ]},
  { category: 'Restaurants', types: [
    'restaurant', 'family_restaurant', 'fine_dining_restaurant',
    'fast_food_restaurant', 'diner', 'bistro', 'gastropub',
    'buffet_restaurant', 'brunch_restaurant', 'breakfast_restaurant',
    'american_restaurant', 'barbecue_restaurant', 'cajun_restaurant',
    'californian_restaurant', 'hawaiian_restaurant', 'soul_food_restaurant',
    'southwestern_us_restaurant', 'tex_mex_restaurant',
    'mexican_restaurant', 'latin_american_restaurant', 'brazilian_restaurant',
    'argentinian_restaurant', 'colombian_restaurant', 'cuban_restaurant',
    'chilean_restaurant', 'peruvian_restaurant', 'south_american_restaurant',
    'caribbean_restaurant',
    'italian_restaurant', 'pizza_restaurant', 'french_restaurant',
    'spanish_restaurant', 'tapas_restaurant', 'greek_restaurant',
    'portuguese_restaurant', 'german_restaurant', 'bavarian_restaurant',
    'british_restaurant', 'irish_restaurant', 'belgian_restaurant',
    'swiss_restaurant', 'austrian_restaurant', 'dutch_restaurant',
    'scandinavian_restaurant', 'danish_restaurant', 'czech_restaurant',
    'polish_restaurant', 'hungarian_restaurant', 'croatian_restaurant',
    'romanian_restaurant', 'russian_restaurant', 'ukrainian_restaurant',
    'eastern_european_restaurant', 'european_restaurant',
    'chinese_restaurant', 'cantonese_restaurant', 'dim_sum_restaurant',
    'dumpling_restaurant', 'chinese_noodle_restaurant', 'hot_pot_restaurant',
    'japanese_restaurant', 'sushi_restaurant', 'ramen_restaurant',
    'japanese_izakaya_restaurant', 'japanese_curry_restaurant',
    'tonkatsu_restaurant', 'yakiniku_restaurant', 'yakitori_restaurant',
    'korean_restaurant', 'korean_barbecue_restaurant',
    'thai_restaurant', 'vietnamese_restaurant', 'indian_restaurant',
    'north_indian_restaurant', 'south_indian_restaurant',
    'pakistani_restaurant', 'bangladeshi_restaurant', 'sri_lankan_restaurant',
    'indonesian_restaurant', 'malaysian_restaurant', 'filipino_restaurant',
    'burmese_restaurant', 'cambodian_restaurant', 'taiwanese_restaurant',
    'tibetan_restaurant', 'mongolian_barbecue_restaurant',
    'asian_restaurant', 'asian_fusion_restaurant', 'fusion_restaurant',
    'middle_eastern_restaurant', 'lebanese_restaurant', 'turkish_restaurant',
    'persian_restaurant', 'israeli_restaurant', 'moroccan_restaurant',
    'falafel_restaurant', 'shawarma_restaurant', 'kebab_shop', 'gyro_restaurant',
    'ethiopian_restaurant', 'african_restaurant', 'afghani_restaurant',
    'australian_restaurant', 'western_restaurant',
    'seafood_restaurant', 'steak_house', 'hamburger_restaurant',
    'chicken_restaurant', 'chicken_wings_restaurant',
    'sandwich_shop', 'deli', 'salad_shop', 'soup_restaurant',
    'noodle_shop', 'burrito_restaurant', 'taco_restaurant',
    'hot_dog_restaurant', 'hot_dog_stand', 'fish_and_chips_restaurant',
    'fondue_restaurant', 'basque_restaurant',
    'halal_restaurant', 'vegan_restaurant', 'vegetarian_restaurant',
    'food_court', 'cafeteria',
    'meal_delivery', 'meal_takeaway', 'pizza_delivery',
  ]},
  { category: 'Snacks & Sweets', types: [
    'bakery', 'ice_cream_shop', 'dessert_shop', 'dessert_restaurant',
    'donut_shop', 'candy_store', 'chocolate_shop', 'chocolate_factory',
    'confectionery', 'cake_shop', 'pastry_shop', 'acai_shop',
    'juice_shop', 'snack_bar', 'bagel_shop',
  ]},
  { category: 'Bars & Nightlife', types: [
    'bar', 'bar_and_grill', 'cocktail_bar', 'wine_bar', 'sports_bar',
    'beer_garden', 'brewery', 'brewpub', 'pub', 'irish_pub',
    'hookah_bar', 'lounge_bar', 'oyster_bar_restaurant',
    'night_club', 'comedy_club', 'live_music_venue', 'karaoke',
    'dance_hall', 'casino',
  ]},
  { category: 'Wineries & Tastings', types: [
    'winery', 'vineyard',
  ]},
  { category: 'Culture & Museums', types: [
    'museum', 'art_museum', 'history_museum', 'art_gallery', 'art_studio',
    'performing_arts_theater', 'concert_hall', 'opera_house',
    'philharmonic_hall', 'amphitheatre', 'auditorium',
    'movie_theater', 'planetarium',
    'cultural_center', 'cultural_landmark', 'historical_place',
    'historical_landmark', 'monument', 'castle', 'fountain', 'sculpture',
    'visitor_center', 'tourist_attraction',
  ]},
  { category: 'Education & Libraries', types: [
    'library', 'book_store', 'educational_institution', 'university',
    'research_institute', 'preschool',
  ]},
  { category: 'Fitness & Sports', types: [
    'gym', 'fitness_center', 'sports_club', 'sports_complex',
    'swimming_pool', 'tennis_court', 'ice_skating_rink',
    'golf_course', 'indoor_golf_course', 'athletic_field',
    'ski_resort', 'sports_activity_location', 'arena', 'stadium',
  ]},
  { category: 'Wellness & Relaxation', types: [
    'yoga_studio', 'spa', 'massage', 'massage_spa', 'sauna',
    'wellness_center', 'skin_care_clinic', 'tanning_studio',
  ]},
  { category: 'Entertainment', types: [
    'bowling_alley', 'video_arcade', 'amusement_center',
    'escape_room', 'paintball_center', 'laser_tag_center',
    'off_roading_area', 'adventure_sports_center',
    'ferris_wheel', 'roller_coaster', 'observation_deck',
  ]},
  { category: 'Community', types: [
    'community_center', 'recreation_center', 'event_venue',
    'banquet_hall', 'convention_center', 'wedding_venue',
    'church', 'mosque', 'synagogue', 'buddhist_temple',
    'hindu_temple', 'shinto_shrine',
  ]},
  { category: 'Shopping', types: [
    'shopping_mall', 'department_store', 'clothing_store',
    'womens_clothing_store', 'shoe_store', 'jewelry_store',
    'cosmetics_store', 'gift_shop', 'toy_store',
    'book_store', 'sporting_goods_store', 'sportswear_store',
    'electronics_store', 'cell_phone_store',
    'furniture_store', 'home_goods_store', 'home_improvement_store',
    'garden_center', 'hardware_store', 'building_materials_store',
    'bicycle_store', 'pet_store',
    'thrift_store', 'discount_store', 'flea_market',
    'general_store', 'convenience_store',
  ]},
  { category: 'Grocery & Markets', types: [
    'grocery_store', 'supermarket', 'hypermarket', 'discount_supermarket',
    'farmers_market', 'market', 'butcher_shop', 'asian_grocery_store',
    'health_food_store', 'food_store', 'liquor_store', 'tea_store',
    'warehouse_store', 'wholesaler',
  ]},
  { category: 'Services', types: [
    'hair_salon', 'barber_shop', 'beauty_salon', 'nail_salon',
    'laundry', 'florist', 'pet_care', 'pet_boarding_service',
    'veterinary_care',
  ]},
  { category: 'Lodging', types: [
    'hotel', 'motel', 'bed_and_breakfast', 'hostel', 'resort_hotel',
    'inn', 'guest_house', 'extended_stay_hotel', 'cottage', 'farmstay',
  ]},
];

const PRESET_COLORS = [
  '#16a34a', '#92400e', '#dc2626', '#7c3aed', '#ea580c', '#0891b2',
  '#3b82f6', '#ec4899', '#eab308', '#14b8a6', '#6366f1', '#f97316',
];

function formatTypeName(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SettingsPage() {
  const router = useRouter();
  const { group, userRole, loading: groupLoading } = useGroup();
  const { bundles, loading: bundlesLoading, refetch } = useBundles(group?.id);
  const [editingBundle, setEditingBundle] = useState(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  if (groupLoading || bundlesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-gray-500">Only admins can manage settings.</p>
      </div>
    );
  }

  async function handleSave(bundle) {
    setSaving(true);
    if (bundle.id) {
      await supabase
        .from('category_bundles')
        .update({
          label: bundle.label,
          slug: bundle.slug,
          color: bundle.color,
          google_types: bundle.google_types,
          sort_order: bundle.sort_order,
        })
        .eq('id', bundle.id);
    } else {
      await supabase.from('category_bundles').insert({
        group_id: group.id,
        label: bundle.label,
        slug: bundle.slug,
        color: bundle.color,
        google_types: bundle.google_types,
        sort_order: bundles.length,
      });
    }
    setSaving(false);
    setEditingBundle(null);
    refetch();
  }

  async function handleDelete(bundleId) {
    if (!confirm('Delete this category? Places already tagged with this type will keep their type.')) return;
    await supabase.from('category_bundles').delete().eq('id', bundleId);
    refetch();
  }

  function startNewBundle() {
    setEditingBundle({
      id: null,
      label: '',
      slug: '',
      color: PRESET_COLORS[bundles.length % PRESET_COLORS.length],
      google_types: [],
      sort_order: bundles.length,
    });
  }

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 mb-4 text-sm text-gray-600 hover:text-gray-900"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h1 className="text-xl font-bold mb-1">Category Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Configure which types of places appear in each category when discovering and filtering.
      </p>

      {/* Bundle list */}
      <div className="space-y-3 mb-6">
        {bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: bundle.color }}
                />
                <h3 className="text-sm font-semibold">{bundle.label}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingBundle({ ...bundle })}
                  className="text-xs text-green-600 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(bundle.id)}
                  className="text-xs text-red-500 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {(bundle.google_types || []).map((type) => (
                <span
                  key={type}
                  className="inline-block rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px]"
                >
                  {formatTypeName(type)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={startNewBundle}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 p-3 text-sm font-medium text-gray-500 hover:border-green-600 hover:text-green-600"
      >
        + Add Category
      </button>

      {/* Edit modal */}
      {editingBundle && (
        <BundleEditor
          bundle={editingBundle}
          onSave={handleSave}
          onCancel={() => setEditingBundle(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

function BundleEditor({ bundle, onSave, onCancel, saving }) {
  const [label, setLabel] = useState(bundle.label);
  const [slug, setSlug] = useState(bundle.slug);
  const [color, setColor] = useState(bundle.color);
  const [selectedTypes, setSelectedTypes] = useState(new Set(bundle.google_types || []));

  function toggleType(type) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleLabelChange(value) {
    setLabel(value);
    // Auto-generate slug from label if creating new
    if (!bundle.id) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    }
  }

  function handleSubmit() {
    if (!label.trim() || !slug.trim()) return;
    onSave({
      ...bundle,
      label: label.trim(),
      slug: slug.trim(),
      color,
      google_types: [...selectedTypes],
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-4">
          {bundle.id ? 'Edit Category' : 'New Category'}
        </h2>

        {/* Label */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Label</label>
          <input
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="e.g., Parks & Outdoors"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        {/* Slug */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Slug <span className="text-gray-400 font-normal">(internal identifier)</span>
          </label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g., park"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        {/* Color */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? '#111' : 'transparent',
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Google types */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Included Google Place Types ({selectedTypes.size} selected)
          </label>
          {AVAILABLE_GOOGLE_TYPES.map(({ category, types }) => (
            <div key={category} className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">{category}</p>
              <div className="flex flex-wrap gap-1.5">
                {types.map((type) => {
                  const active = selectedTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={active ? { backgroundColor: color } : undefined}
                    >
                      {formatTypeName(type)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !label.trim() || !slug.trim()}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
