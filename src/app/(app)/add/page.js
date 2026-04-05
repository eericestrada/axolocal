'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useGroup } from '@/hooks/useGroup';
import { useLocation } from '@/hooks/useLocation';
import StarRating from '@/components/ui/StarRating';
import TagVoter from '@/components/places/TagVoter';
import { PIN_COLORS } from '@/utils/constants';

export default function AddPlacePage() {
  const router = useRouter();
  const supabase = createClient();
  const { group, userId, loading: groupLoading } = useGroup();
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [nickname, setNickname] = useState('');
  const [score, setScore] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [useCaseTags, setUseCaseTags] = useState([]);
  const [tagVotes, setTagVotes] = useState({});
  const debounceRef = useRef(null);

  useEffect(() => {
    supabase
      .from('use_case_tags')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setUseCaseTags(data || []));
  }, [supabase]);

  function handleSearch(value) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const body = { query: value };
      if (location.latitude) {
        body.latitude = location.latitude;
        body.longitude = location.longitude;
      }

      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResults(data.results || []);
      setSearching(false);
    }, 300);
  }

  function handleTagToggle(tagId) {
    setTagVotes((prev) => {
      const current = prev[tagId];
      if (current === undefined) return { ...prev, [tagId]: true };
      if (current === true) return { ...prev, [tagId]: false };
      const next = { ...prev };
      delete next[tagId];
      return next;
    });
  }

  async function handleSave() {
    if (!selected || !group) return;
    setSaving(true);

    // Insert place
    const { data: place, error } = await supabase
      .from('places')
      .upsert(
        {
          google_place_id: selected.googlePlaceId,
          name: selected.name,
          nickname: nickname.trim() || null,
          address: selected.address,
          latitude: selected.latitude,
          longitude: selected.longitude,
          primary_type: selected.primaryType,
          google_types: selected.googleTypes,
          source: 'manual',
          added_by: userId,
          group_id: group.id,
        },
        { onConflict: 'google_place_id' }
      )
      .select()
      .single();

    if (error) {
      alert('Failed to add place: ' + error.message);
      setSaving(false);
      return;
    }

    // Insert tag votes
    const tagInserts = Object.entries(tagVotes).map(([tagId, vote]) => ({
      place_id: place.id,
      tag_id: tagId,
      user_id: userId,
      vote,
    }));
    if (tagInserts.length > 0) {
      await supabase
        .from('place_tag_votes')
        .upsert(tagInserts, { onConflict: 'place_id,tag_id,user_id' });
    }

    // Insert rating
    if (score > 0) {
      await supabase.from('ratings').upsert(
        {
          place_id: place.id,
          user_id: userId,
          score,
          note: note.trim() || null,
        },
        { onConflict: 'place_id,user_id' }
      );
    }

    // Activity
    await supabase.from('activity').insert({
      group_id: group.id,
      user_id: userId,
      place_id: place.id,
      action_type: 'add_place',
      metadata: { name: selected.name, primaryType: selected.primaryType },
    });
    // Notify followers (fire and forget)
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor_id: userId,
        action_type: 'add_place',
        place_name: selected.name,
        place_id: place.id,
      }),
    });

    setSaving(false);
    router.push(`/places/${place.id}`);
  }

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Confirmation screen
  if (selected) {
    const color = PIN_COLORS[selected.primaryType] || PIN_COLORS.other;
    // Build a fake tagSummary for display
    const fakeSummary = {};
    for (const [tagId, vote] of Object.entries(tagVotes)) {
      fakeSummary[tagId] = {
        yes: vote ? 1 : 0,
        no: vote ? 0 : 1,
        total: 1,
        votes: [{ user_id: userId, vote }],
      };
    }

    return (
      <div className="p-4 pb-20">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-gray-500 mb-4"
        >
          &larr; Back to search
        </button>

        <div className="flex items-start gap-2 mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold">{selected.name}</h1>
            <p className="text-sm text-gray-500">{selected.address}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {selected.primaryType}
          </span>
        </div>

        {/* Nickname */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Nickname <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder='e.g., "The good taco place"'
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            What&apos;s this place good for?
          </label>
          <div className="flex flex-wrap gap-2">
            {useCaseTags.filter((tag) => {
              if (!tag.applies_to) return true;
              return tag.applies_to.includes(selected.primaryType);
            }).map((tag) => {
              const vote = tagVotes[tag.id];
              let chipClass;
              if (vote === true) chipClass = 'bg-green-600 text-white';
              else if (vote === false) chipClass = 'bg-red-100 text-red-700 ring-1 ring-red-300';
              else chipClass = 'bg-gray-100 text-gray-700';

              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${chipClass}`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Rating <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <StarRating value={score} onChange={setScore} size="lg" />
        </div>

        {/* Note */}
        {score > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="e.g., get the brisket tacos"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Adding...' : `Add to ${group?.name || 'Group'}`}
        </button>
      </div>
    );
  }

  // Search screen
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Add a Place</h1>

      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search for a place..."
        autoFocus
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 mb-4"
      />

      {searching && (
        <p className="text-sm text-gray-400">Searching...</p>
      )}

      <div className="space-y-2">
        {results.map((result) => {
          const color = PIN_COLORS[result.primaryType] || PIN_COLORS.other;
          return (
            <button
              key={result.googlePlaceId}
              onClick={() => setSelected(result)}
              className="w-full text-left rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {result.address}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: color }}
                >
                  {result.primaryType}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {!searching && query && results.length === 0 && (
        <p className="text-sm text-gray-400 mt-2">No results found</p>
      )}
    </div>
  );
}
