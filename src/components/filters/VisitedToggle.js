'use client';

export default function VisitedToggle({ showUnvisited, onToggle }) {
  return (
    <label className="flex items-center gap-2 px-3 py-1 cursor-pointer">
      <span className="text-xs text-gray-600">Show unvisited</span>
      <button
        role="switch"
        aria-checked={showUnvisited}
        onClick={onToggle}
        className={`relative w-8 h-4 rounded-full transition-colors ${
          showUnvisited ? 'bg-green-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            showUnvisited ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}
