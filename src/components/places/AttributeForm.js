'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import StarRating from '@/components/ui/StarRating';

export default function AttributeForm({ placeId, userId, primaryType, onSave }) {
  const [attributes, setAttributes] = useState([]);
  const [values, setValues] = useState({});
  const [existingValues, setExistingValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // Fetch attribute definitions
      const { data: attrs } = await supabase
        .from('category_attributes')
        .select('*')
        .eq('primary_type', primaryType)
        .order('sort_order');

      setAttributes(attrs || []);

      // Fetch user's existing values
      if (attrs?.length > 0) {
        const attrIds = attrs.map((a) => a.id);
        const { data: votes } = await supabase
          .from('place_attribute_votes')
          .select('attribute_id, value')
          .eq('place_id', placeId)
          .eq('user_id', userId)
          .in('attribute_id', attrIds);

        const existing = {};
        for (const v of votes || []) {
          existing[v.attribute_id] = v.value;
        }
        setExistingValues(existing);
        setValues(existing);
      }

      setLoading(false);
    }
    load();
  }, [placeId, userId, primaryType, supabase]);

  function handleChange(attrId, value) {
    setValues((prev) => ({ ...prev, [attrId]: value }));
  }

  async function handleSave() {
    setSaving(true);

    const upserts = Object.entries(values)
      .filter(([attrId, val]) => val !== '' && val !== undefined)
      .map(([attrId, val]) => ({
        place_id: placeId,
        attribute_id: attrId,
        user_id: userId,
        value: String(val),
      }));

    if (upserts.length > 0) {
      await supabase
        .from('place_attribute_votes')
        .upsert(upserts, { onConflict: 'place_id,attribute_id,user_id' });
    }

    setSaving(false);
    onSave?.();
  }

  if (loading) return <p className="text-sm text-gray-400">Loading attributes...</p>;
  if (attributes.length === 0) return null;

  return (
    <div className="space-y-3">
      {attributes.map((attr) => (
        <div key={attr.id}>
          <label className="block text-sm font-medium mb-1">{attr.label}</label>

          {attr.input_type === 'boolean' && (
            <div className="flex gap-2">
              {['true', 'false'].map((val) => (
                <button
                  key={val}
                  onClick={() => handleChange(attr.id, val)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    values[attr.id] === val
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {val === 'true' ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          )}

          {attr.input_type === 'select' && (
            <div className="flex flex-wrap gap-2">
              {(attr.options || []).map((option) => (
                <button
                  key={option}
                  onClick={() => handleChange(attr.id, option)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    values[attr.id] === option
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {attr.input_type === 'rating' && (
            <StarRating
              value={Number(values[attr.id]) || 0}
              onChange={(val) => handleChange(attr.id, String(val))}
              size="md"
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Attributes'}
      </button>
    </div>
  );
}
