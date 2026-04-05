'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useGroup } from '@/hooks/useGroup';
import { usePlaces } from '@/hooks/usePlaces';
import { useFilters, filterPlaces } from '@/hooks/useFilters';
import { useLocation } from '@/hooks/useLocation';
import MapView from '@/components/map/MapView';
import TypeFilterBar from '@/components/filters/TypeFilterBar';
import FunctionTagChips from '@/components/filters/FunctionTagChips';
import VisitedToggle from '@/components/filters/VisitedToggle';

export default function MapPage() {
  const router = useRouter();
  const supabase = createClient();
  const { group, userId, loading: groupLoading } = useGroup();
  const { places, loading: placesLoading, refetch } = usePlaces(group?.id);
  const { filters, dispatch } = useFilters();
  const location = useLocation();
  const [useCaseTags, setUseCaseTags] = useState([]);

  useEffect(() => {
    supabase
      .from('use_case_tags')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setUseCaseTags(data || []));
  }, [supabase]);

  // Listen for places-updated event from MapView discover flow
  useEffect(() => {
    function handleUpdate() {
      refetch();
    }
    window.addEventListener('places-updated', handleUpdate);
    return () => window.removeEventListener('places-updated', handleUpdate);
  }, [refetch]);

  const filteredPlaces = filterPlaces(places, filters);

  function handlePlaceSelect(id) {
    router.push(`/places/${id}`);
  }

  async function handleCheckIn(place) {
    await supabase.from('check_ins').insert({
      place_id: place.id,
      user_id: userId,
    });
    await supabase.from('activity').insert({
      group_id: group.id,
      user_id: userId,
      place_id: place.id,
      action_type: 'check_in',
    });
    refetch();
  }

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-center">
        <div>
          <p className="text-gray-500 mb-2">No group yet</p>
          <button
            onClick={() => router.push('/group')}
            className="text-green-600 font-medium text-sm"
          >
            Create or join a group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Filter bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm">
        <TypeFilterBar
          selectedType={filters.selectedType}
          onSelect={(type) => dispatch({ type: 'SET_TYPE', payload: type })}
        />
        <div className="flex items-center gap-2">
          <FunctionTagChips
            useCaseTags={useCaseTags}
            selectedTags={filters.selectedTags}
            onToggle={(id) => dispatch({ type: 'TOGGLE_TAG', payload: id })}
            expanded={filters.tagFilterExpanded}
            onToggleExpand={() => dispatch({ type: 'TOGGLE_TAG_FILTER' })}
          />
          <VisitedToggle
            showUnvisited={filters.showUnvisited}
            onToggle={() => dispatch({ type: 'TOGGLE_VISITED' })}
          />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapView
          places={filteredPlaces}
          useCaseTags={useCaseTags}
          userLocation={location}
          groupId={group.id}
          onPlaceSelect={handlePlaceSelect}
          onCheckIn={handleCheckIn}
        />
      </div>
    </div>
  );
}
