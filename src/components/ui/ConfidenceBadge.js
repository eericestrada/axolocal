'use client';

export default function ConfidenceBadge({ yesCount, totalCount, label }) {
  if (!totalCount || totalCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
        {label} <span>?</span>
      </span>
    );
  }

  const pct = Math.round((yesCount / totalCount) * 100);
  let colorClass;
  if (pct >= 75) {
    colorClass = 'bg-green-100 text-green-800';
  } else if (pct >= 50) {
    colorClass = 'bg-yellow-100 text-yellow-800';
  } else {
    colorClass = 'bg-red-100 text-red-800';
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
      <span className="opacity-70">
        {yesCount}/{totalCount}
      </span>
    </span>
  );
}
