'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useGroup } from '@/hooks/useGroup';
import { useBundles } from '@/hooks/useBundles';

// Comprehensive list of Google Place types available for bundling
const AVAILABLE_GOOGLE_TYPES = [
  { category: 'Outdoor & Recreation', types: [
    'park', 'playground', 'dog_park', 'national_park', 'campground',
    'recreation_center', 'community_center', 'swimming_pool', 'sports_club',
    'amusement_park', 'zoo', 'aquarium',
  ]},
  { category: 'Food & Drink', types: [
    'restaurant', 'fast_food_restaurant', 'chinese_restaurant', 'italian_restaurant',
    'japanese_restaurant', 'mexican_restaurant', 'thai_restaurant', 'indian_restaurant',
    'american_restaurant', 'barbecue_restaurant', 'seafood_restaurant', 'steak_house',
    'pizza_restaurant', 'sushi_restaurant', 'hamburger_restaurant', 'sandwich_shop',
    'cafe', 'coffee_shop', 'bakery', 'ice_cream_shop', 'dessert_shop',
    'bar', 'night_club', 'wine_bar',
  ]},
  { category: 'Fitness & Wellness', types: [
    'gym', 'fitness_center', 'yoga_studio', 'spa',
  ]},
  { category: 'Culture & Learning', types: [
    'library', 'museum', 'art_gallery', 'performing_arts_theater',
    'movie_theater', 'bowling_alley',
  ]},
  { category: 'Shopping', types: [
    'shopping_mall', 'book_store', 'clothing_store', 'grocery_store',
    'farmers_market', 'pet_store',
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
