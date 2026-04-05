'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useGroup } from '@/hooks/useGroup';
import { usePlaces } from '@/hooks/usePlaces';
import { useBundles } from '@/hooks/useBundles';
import { useFilters, filterPlaces } from '@/hooks/useFilters';
import { useLocation } from '@/hooks/useLocation';
import MapView from '@/components/map/MapView';
import PlaceList from '@/components/places/PlaceList';
import TypeFilterBar from '@/components/filters/TypeFilterBar';
import FunctionTagChips from '@/components/filters/FunctionTagChips';
import VisitedToggle from '@/components/filters/VisitedToggle';

export default function MapPage() {
  const router = useRouter();
  const supabase = createClient();
  const { group, userId, userRole, loading: groupLoading } = useGroup();
  const { places, loading: placesLoading, refetch } = usePlaces(group?.id);
  const { bundles } = useBundles(group?.id);
  const { filters, dispatch } = useFilters();
  const location = useLocation();
  const [useCaseTags, setUseCaseTags] = useState([]);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'

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
      {/* Header bar */}
      <div className="z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        {/* Top row: view toggle + discover button */}
        <div className="flex items-center justify-between px-3 pt-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 text-xs font-medium ${
                viewMode === 'map'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs font-medium ${
                viewMode === 'list'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              List
            </button>
          </div>

          {/* Place count */}
          <span className="text-xs text-gray-400">
            {filteredPlaces.length} place{filteredPlaces.length !== 1 ? 's' : ''}
          </span>

          {/* Discover button (admin only) */}
          {userRole === 'admin' && (
            <button
              onClick={() => router.push('/discover')}
              className="flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Discover
            </button>
          )}
        </div>

        {/* Filter bar */}
        <TypeFilterBar
          selectedType={filters.selectedType}
          onSelect={(type) => dispatch({ type: 'SET_TYPE', payload: type })}
          bundles={bundles}
        />
        <div className="flex items-center gap-2 pb-1">
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

      {/* Content */}
      <div className="flex-1 min-h-0">
        {viewMode === 'map' ? (
          <MapView
            places={filteredPlaces}
            useCaseTags={useCaseTags}
            userLocation={location}
            groupId={group.id}
            userId={userId}
            bundles={bundles}
            onPlaceSelect={handlePlaceSelect}
            onCheckIn={handleCheckIn}
            onVisitedChange={refetch}
          />
        ) : (
          <PlaceList
            places={filteredPlaces}
            bundles={bundles}
            onSelect={handlePlaceSelect}
          />
        )}
      </div>
    </div>
  );
}
