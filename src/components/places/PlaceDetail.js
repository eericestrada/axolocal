'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Map } from '@vis.gl/react-google-maps';
import MapProvider from '@/components/map/MapProvider';
import StarRating from '@/components/ui/StarRating';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';
import RatingForm from './RatingForm';
import TagVoter from './TagVoter';
import AttributeForm from './AttributeForm';
import { PIN_COLORS } from '@/utils/constants';
import { useRouter } from 'next/navigation';

export default function PlaceDetail({ placeId }) {
  const router = useRouter();
  const [place, setPlace] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [tagVotes, setTagVotes] = useState([]);
  const [useCaseTags, setUseCaseTags] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAttributeForm, setShowAttributeForm] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [visited, setVisited] = useState(false);
  const [togglingVisited, setTogglingVisited] = useState(false);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id);

    const [placeRes, ratingsRes, checkInsRes, tagVotesRes, tagsRes, visitedRes] =
      await Promise.all([
        supabase.from('places').select('*').eq('id', placeId).single(),
        supabase
          .from('ratings')
          .select('*, profiles(display_name)')
          .eq('place_id', placeId),
        supabase
          .from('check_ins')
          .select('*, profiles(display_name)')
          .eq('place_id', placeId)
          .order('checked_in_at', { ascending: false }),
        supabase
          .from('place_tag_votes')
          .select('*')
          .eq('place_id', placeId),
        supabase
          .from('use_case_tags')
          .select('*')
          .order('sort_order'),
        user ? supabase
          .from('visited_places')
          .select('id')
          .eq('place_id', placeId)
          .eq('user_id', user.id)
          .maybeSingle() : { data: null },
      ]);

    setPlace(placeRes.data);
    setRatings(ratingsRes.data || []);
    setCheckIns(checkInsRes.data || []);
    setTagVotes(tagVotesRes.data || []);
    setUseCaseTags(tagsRes.data || []);
    setVisited(!!visitedRes.data);
    setNameInput(placeRes.data?.name || '');
    setNicknameInput(placeRes.data?.nickname || '');

    // Get user's role in this place's group
    if (user && placeRes.data?.group_id) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', placeRes.data.group_id)
        .eq('user_id', user.id)
        .single();
      setUserRole(membership?.role || null);
    }

    setLoading(false);
  }, [placeId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!place) {
    return <p className="p-4 text-red-600">Place not found.</p>;
  }

  const color = PIN_COLORS[place.primary_type] || PIN_COLORS.other;
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length
      : null;
  const myRating = ratings.find((r) => r.user_id === userId);

  // Build tag summary
  const tagSummary = {};
  for (const vote of tagVotes) {
    if (!tagSummary[vote.tag_id]) {
      tagSummary[vote.tag_id] = { yes: 0, no: 0, total: 0, votes: [] };
    }
    tagSummary[vote.tag_id].total++;
    if (vote.vote) tagSummary[vote.tag_id].yes++;
    else tagSummary[vote.tag_id].no++;
    tagSummary[vote.tag_id].votes.push(vote);
  }

  // Check-in frequency per user
  const checkInsByUser = {};
  for (const ci of checkIns) {
    const name = ci.profiles?.display_name || 'Unknown';
    checkInsByUser[name] = (checkInsByUser[name] || 0) + 1;
  }

  // Stage
  const hasTagYes = tagVotes.some((v) => v.vote === true);
  const stage =
    hasTagYes ? 3 : ratings.length > 0 || checkIns.length > 0 || visited ? 2 : 1;

  async function handleCheckIn() {
    setCheckingIn(true);
    await supabase.from('check_ins').insert({
      place_id: placeId,
      user_id: userId,
    });
    await supabase.from('activity').insert({
      group_id: place.group_id,
      user_id: userId,
      place_id: placeId,
      action_type: 'check_in',
    });
    setCheckingIn(false);
    fetchData();
  }

  async function handleSaveName() {
    await supabase
      .from('places')
      .update({
        name: nameInput.trim(),
        nickname: nicknameInput.trim() || null,
      })
      .eq('id', placeId);
    setEditingName(false);
    fetchData();
  }

  async function handleHidePlace() {
    if (!confirm('Hide this place? It will disappear from your map and lists. You can ask an admin to unhide it later.')) return;
    await supabase.from('hidden_places').insert({
      user_id: userId,
      place_id: placeId,
    });
    router.push('/map');
  }

  async function handleDeletePlace() {
    if (!confirm('Delete this place for the entire group? This removes all ratings, check-ins, and tag votes permanently.')) return;
    await supabase.from('places').delete().eq('id', placeId);
    router.push('/map');
  }

  async function handleDeleteRating() {
    if (!confirm('Delete your rating?')) return;
    await supabase
      .from('ratings')
      .delete()
      .eq('place_id', placeId)
      .eq('user_id', userId);
    fetchData();
  }

  async function handleToggleVisited() {
    setTogglingVisited(true);
    if (visited) {
      await supabase
        .from('visited_places')
        .delete()
        .eq('place_id', placeId)
        .eq('user_id', userId);
    } else {
      await supabase.from('visited_places').insert({
        place_id: placeId,
        user_id: userId,
      });
    }
    setVisited(!visited);
    setTogglingVisited(false);
  }

  return (
    <div className="pb-20">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 px-4 pt-4 pb-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="px-4 pb-4 border-b border-gray-100">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {editingName ? (
              <div className="space-y-2">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  placeholder="Place name"
                />
                <input
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  placeholder="Nickname (optional)"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveName}
                    className="text-xs text-green-600 font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="text-xs text-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1
                  className="text-xl font-bold cursor-pointer"
                  onClick={() => setEditingName(true)}
                >
                  {place.nickname || place.name}
                </h1>
                {place.nickname && (
                  <p className="text-sm text-gray-500">{place.name}</p>
                )}
              </>
            )}
            <p className="text-sm text-gray-500 mt-0.5">{place.address}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {place.primary_type}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {avgRating != null && (
            <div className="flex items-center gap-1">
              <StarRating value={avgRating} readOnly size="sm" />
              <span className="text-sm text-gray-600">
                {avgRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Map snippet */}
      <div className="h-40 w-full">
        <MapProvider>
          <Map
            defaultCenter={{ lat: place.latitude, lng: place.longitude }}
            defaultZoom={15}
            disableDefaultUI
            mapId="81fa7c449cfa673e6246dc01"
            className="w-full h-full"
          />
        </MapProvider>
      </div>

      {/* Tags */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-medium mb-2">Tags</h2>
        <TagVoter
          placeId={placeId}
          userId={userId}
          tagSummary={tagSummary}
          useCaseTags={useCaseTags}
          placeType={place.primary_type}
          onVote={fetchData}
        />
      </div>

      {/* Attributes */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Attributes</h2>
          <button
            onClick={() => setShowAttributeForm(!showAttributeForm)}
            className="text-xs text-green-600 font-medium"
          >
            {showAttributeForm ? 'Collapse' : 'Edit My Answers'}
          </button>
        </div>
        {showAttributeForm && (
          <AttributeForm
            placeId={placeId}
            userId={userId}
            primaryType={place.primary_type}
            onSave={fetchData}
          />
        )}
      </div>

      {/* My Rating */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-medium mb-2">My Rating</h2>
        <RatingForm
          placeId={placeId}
          userId={userId}
          existingRating={myRating}
          onSave={fetchData}
        />
      </div>

      {/* Group Ratings */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-medium mb-2">
          Group Ratings ({ratings.length})
        </h2>
        <div className="space-y-2">
          {ratings.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-700">
                {r.profiles?.display_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium truncate">
                    {r.profiles?.display_name}
                  </span>
                  <StarRating value={r.score} readOnly size="sm" />
                </div>
                {r.note && (
                  <p className="text-xs text-gray-500 truncate">{r.note}</p>
                )}
              </div>
              {r.user_id === userId && (
                <button
                  onClick={handleDeleteRating}
                  className="text-xs text-red-500"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          {ratings.length === 0 && (
            <p className="text-xs text-gray-400">No ratings yet</p>
          )}
        </div>
      </div>

      {/* Check-ins */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-medium mb-2">
          Check-ins ({checkIns.length})
        </h2>
        {Object.entries(checkInsByUser).length > 0 ? (
          <div className="space-y-1">
            {Object.entries(checkInsByUser).map(([name, count]) => (
              <p key={name} className="text-sm text-gray-600">
                {name} — {count} time{count !== 1 ? 's' : ''}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No check-ins yet</p>
        )}
      </div>

      {/* Place actions */}
      <div className="p-4 flex gap-4">
        <button
          onClick={handleHidePlace}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Hide from my view
        </button>
        {userRole === 'admin' && (
          <button
            onClick={handleDeletePlace}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Delete for entire group
          </button>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-12 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex gap-2 safe-bottom">
        <button
          onClick={handleToggleVisited}
          disabled={togglingVisited}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            visited
              ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
              : 'border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {visited ? 'Been Here' : 'Been Here?'}
        </button>
        <button
          onClick={handleCheckIn}
          disabled={checkingIn}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {checkingIn ? 'Checking in...' : 'Check In'}
        </button>
      </div>
    </div>
  );
}
