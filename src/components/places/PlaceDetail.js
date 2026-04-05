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

export default function PlaceDetail({ placeId }) {
  const [place, setPlace] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [tagVotes, setTagVotes] = useState([]);
  const [useCaseTags, setUseCaseTags] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id);

    const [placeRes, ratingsRes, checkInsRes, tagVotesRes, tagsRes] =
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
      ]);

    setPlace(placeRes.data);
    setRatings(ratingsRes.data || []);
    setCheckIns(checkInsRes.data || []);
    setTagVotes(tagVotesRes.data || []);
    setUseCaseTags(tagsRes.data || []);
    setNameInput(placeRes.data?.name || '');
    setNicknameInput(placeRes.data?.nickname || '');
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
    hasTagYes ? 3 : ratings.length > 0 || checkIns.length > 0 ? 2 : 1;
  const stageText =
    stage === 1
      ? 'Not yet visited'
      : stage === 2
        ? `Visited by ${new Set(checkIns.map((c) => c.user_id)).size || ratings.length} member(s)`
        : 'Fully characterized';

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

  async function handleDeleteRating() {
    if (!confirm('Delete your rating?')) return;
    await supabase
      .from('ratings')
      .delete()
      .eq('place_id', placeId)
      .eq('user_id', userId);
    fetchData();
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
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
          <span className="text-xs text-gray-400">{stageText}</span>
        </div>
      </div>

      {/* Map snippet */}
      <div className="h-40 w-full">
        <MapProvider>
          <Map
            defaultCenter={{ lat: place.latitude, lng: place.longitude }}
            defaultZoom={15}
            disableDefaultUI
            mapId="81fa7c449cfa673e1ee5e17e"
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
            {showAttributeForm ? 'Hide' : 'Edit My Answers'}
          </button>
        </div>
        {showAttributeForm && (
          <AttributeForm
            placeId={placeId}
            userId={userId}
            primaryType={place.primary_type}
            onSave={() => {
              setShowAttributeForm(false);
              fetchData();
            }}
          />
        )}
      </div>

      {/* Ratings */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">
            Ratings ({ratings.length})
          </h2>
          <button
            onClick={() => setShowRatingForm(!showRatingForm)}
            className="text-xs text-green-600 font-medium"
          >
            {myRating ? 'Edit My Rating' : 'Rate This Place'}
          </button>
        </div>

        {showRatingForm && (
          <div className="mb-3">
            <RatingForm
              placeId={placeId}
              userId={userId}
              existingRating={myRating}
              onSave={() => {
                setShowRatingForm(false);
                fetchData();
              }}
            />
          </div>
        )}

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

      {/* Sticky action bar */}
      <div className="fixed bottom-12 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex gap-2 safe-bottom">
        <button
          onClick={handleCheckIn}
          disabled={checkingIn}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {checkingIn ? 'Checking in...' : 'Check In'}
        </button>
        <button
          onClick={() => setShowRatingForm(true)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          {myRating ? 'Edit Rating' : 'Rate'}
        </button>
      </div>
    </div>
  );
}
