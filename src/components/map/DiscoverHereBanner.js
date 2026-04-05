'use client';

export default function DiscoverHereBanner({ visible, onDiscover, loading }) {
  if (!visible) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
      <button
        onClick={onDiscover}
        disabled={loading}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-green-600"
            >
              <path
                fillRule="evenodd"
                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                clipRule="evenodd"
              />
            </svg>
            No parks here — discover nearby?
          </>
        )}
      </button>
    </div>
  );
}
