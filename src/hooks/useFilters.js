'use client';

import { useReducer, useEffect } from 'react';

const STORAGE_KEY = 'axolocal-filters';

const initialState = {
  selectedType: null,
  selectedTags: [],
  showUnvisited: true,
  tagFilterExpanded: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TYPE':
      return {
        ...state,
        selectedType: state.selectedType === action.payload ? null : action.payload,
      };
    case 'TOGGLE_TAG': {
      const tagId = action.payload;
      const has = state.selectedTags.includes(tagId);
      return {
        ...state,
        selectedTags: has
          ? state.selectedTags.filter((t) => t !== tagId)
          : [...state.selectedTags, tagId],
      };
    }
    case 'TOGGLE_VISITED':
      return { ...state, showUnvisited: !state.showUnvisited };
    case 'TOGGLE_TAG_FILTER':
      return { ...state, tagFilterExpanded: !state.tagFilterExpanded };
    case 'CLEAR_ALL':
      return { ...initialState };
    case 'RESTORE':
      return { ...initialState, ...action.payload };
    default:
      return state;
  }
}

/**
 * Filter places based on current filter state.
 * Returns filtered array with `tagMatch` property attached.
 */
export function filterPlaces(places, filters) {
  let result = places;

  // Layer 1: type filter
  if (filters.selectedType) {
    result = result.filter((p) => p.primary_type === filters.selectedType);
  }

  // Layer 2: visited filter
  if (!filters.showUnvisited) {
    result = result.filter((p) => p.stage >= 2);
  }

  // Layer 3: tag filter
  if (filters.selectedTags.length > 0) {
    result = result
      .map((place) => {
        let hasMatch = false;
        let allUnknown = true;

        for (const tagId of filters.selectedTags) {
          const summary = place.tagSummary[tagId];
          if (!summary || summary.total === 0) {
            // No votes for this tag — still unknown
            continue;
          }
          allUnknown = false;
          if (summary.yes > summary.no) {
            hasMatch = true;
            break;
          }
        }

        if (hasMatch) return { ...place, tagMatch: 'match' };
        if (allUnknown) return { ...place, tagMatch: 'unknown' };
        return { ...place, tagMatch: 'hidden' };
      })
      .filter((p) => p.tagMatch !== 'hidden');
  }

  return result;
}

export function useFilters() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        dispatch({ type: 'RESTORE', payload: JSON.parse(stored) });
      }
    } catch {
      // sessionStorage not available
    }
  }, []);

  // Persist to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage not available
    }
  }, [state]);

  return { filters: state, dispatch };
}
