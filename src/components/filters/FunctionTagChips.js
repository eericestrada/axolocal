'use client';

export default function FunctionTagChips({
  useCaseTags,
  selectedTags,
  onToggle,
  expanded,
  onToggleExpand,
}) {
  return (
    <div className="px-3">
      <button
        onClick={onToggleExpand}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          expanded || selectedTags.length > 0
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Filter{selectedTags.length > 0 ? ` (${selectedTags.length})` : ''}
      </button>

      {expanded && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2 pb-1">
          {useCaseTags.map((tag) => {
            const active = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => onToggle(tag.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
