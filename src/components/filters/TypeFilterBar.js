'use client';

import { PRIMARY_TYPES, PIN_COLORS } from '@/utils/constants';

export default function TypeFilterBar({ selectedType, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          selectedType === null
            ? 'bg-gray-800 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        All
      </button>
      {PRIMARY_TYPES.map(({ slug, label }) => {
        const active = selectedType === slug;
        return (
          <button
            key={slug}
            onClick={() => onSelect(slug)}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={
              active
                ? { backgroundColor: PIN_COLORS[slug], color: '#fff' }
                : { backgroundColor: '#f3f4f6', color: '#374151' }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
