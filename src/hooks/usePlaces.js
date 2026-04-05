'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

function computeStage(place, ratingsMap, checkInsMap, tagVotesMap) {
  const placeRatings = ratingsMap.get(place.id) || [];
  const placeCheckIns = checkInsMap.get(place.id) || [];
  const placeTags = tagVotesMap.get(place.id) || [];
  const hasTagYes = placeTags.some((v) => v.vote === true);

  if (hasTagYes) return 3;
  if (placeRatings.length > 0 || placeCheckIns.length > 0) return 2;
  return 1;
}

function buildTagSummary(tagVotes) {
  const summary = {};
  for (const vote of tagVotes) {
    if (!summary[vote.tag_id]) {
      summary[vote.tag_id] = { yes: 0, no: 0, total: 0, votes: [] };
    }
    summary[vote.tag_id].total++;
    if (vote.vote) summary[vote.tag_id].yes++;
    else summary[vote.tag_id].no++;
    summary[vote.tag_id].votes.push(vote);
  }
  return summary;
}

function groupBy(items, key) {
  const map = new Map();
  for (const item of items) {
    const k = item[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

export function usePlaces(groupId) {
  const [state, setState] = useState({
    places: [],
    loading: true,
    error: null,
  });
  const supabase = createClient();

  const fetchPlaces = useCallback(async () => {
    if (!groupId) {
      setState({ places: [], loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    // Step 1: fetch all places and user's hidden places
    const [placesRes, hiddenRes] = await Promise.all([
      supabase.from('places').select('*').eq('group_id', groupId).range(0, 4999),
      supabase.from('hidden_places').select('place_id'),
    ]);

    if (placesRes.error) {
      setState({ places: [], loading: false, error: placesRes.error.message });
      return;
    }

    const hiddenIds = new Set((hiddenRes.data || []).map((h) => h.place_id));
    const places = (placesRes.data || []).filter((p) => !hiddenIds.has(p.id));

    if (places.length === 0) {
      setState({ places: [], loading: false, error: null });
      return;
    }

    const placeIds = places.map((p) => p.id);

    // Step 2: fetch related data in parallel
    const [ratingsRes, checkInsRes, tagVotesRes] = await Promise.all([
      supabase
        .from('ratings')
        .select('place_id, user_id, score, note')
        .in('place_id', placeIds)
        .range(0, 4999),
      supabase
        .from('check_ins')
        .select('place_id, user_id')
        .in('place_id', placeIds)
        .range(0, 4999),
      supabase
        .from('place_tag_votes')
        .select('place_id, tag_id, user_id, vote')
        .in('place_id', placeIds)
        .range(0, 4999),
    ]);

    const ratingsMap = groupBy(ratingsRes.data || [], 'place_id');
    const checkInsMap = groupBy(checkInsRes.data || [], 'place_id');
    const tagVotesMap = groupBy(tagVotesRes.data || [], 'place_id');

    // Step 3: enrich places
    const enriched = places.map((place) => {
      const ratings = ratingsMap.get(place.id) || [];
      const checkIns = checkInsMap.get(place.id) || [];
      const tagVotes = tagVotesMap.get(place.id) || [];

      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
          : null;

      return {
        ...place,
        avgRating,
        ratingCount: ratings.length,
        checkInCount: checkIns.length,
        tagSummary: buildTagSummary(tagVotes),
        stage: computeStage(place, ratingsMap, checkInsMap, tagVotesMap),
        ratings,
      };
    });

    setState({ places: enriched, loading: false, error: null });
  }, [groupId, supabase]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  return { ...state, refetch: fetchPlaces };
}
