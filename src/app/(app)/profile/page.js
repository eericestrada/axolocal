'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useGroup } from '@/hooks/useGroup';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import StarRating from '@/components/ui/StarRating';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const { group, userId, loading: groupLoading } = useGroup();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSupported, isSubscribed, permission, loading: pushLoading, subscribe, unsubscribe } = usePushSubscription();

  useEffect(() => {
    if (!userId) return;

    async function load() {
      const [profileRes, ratingsRes, checkInsRes, visitedRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase
          .from('ratings')
          .select('*, places(name, nickname)')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('check_ins')
          .select('place_id')
          .eq('user_id', userId),
        supabase
          .from('visited_places')
          .select('place_id, places(name, nickname)')
          .eq('user_id', userId),
      ]);

      setProfile(profileRes.data);
      setRatings(ratingsRes.data || []);
      setVisitedPlaces(visitedRes.data || []);

      // Compute stats
      const checkIns = checkInsRes.data || [];
      const uniquePlaces = new Set(checkIns.map((c) => c.place_id));
      const ratingsList = ratingsRes.data || [];
      const avgRating = ratingsList.length > 0
        ? ratingsList.reduce((sum, r) => sum + r.score, 0) / ratingsList.length
        : null;

      setStats({
        totalCheckIns: checkIns.length,
        uniquePlacesVisited: uniquePlaces.size,
        totalRatings: ratingsList.length,
        avgRating,
        beenHereCount: (visitedRes.data || []).length,
      });

      setLoading(false);
    }
    load();
  }, [userId, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (groupLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-lg font-bold text-green-700">
            {profile?.display_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-lg font-bold">{profile?.display_name || 'User'}</h1>
            {group && (
              <p className="text-xs text-gray-500">{group.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
          <div className="bg-white px-3 py-3 text-center">
            <p className="text-lg font-bold text-gray-900">{stats.beenHereCount + stats.uniquePlacesVisited}</p>
            <p className="text-xs text-gray-500">Places visited</p>
          </div>
          <div className="bg-white px-3 py-3 text-center">
            <p className="text-lg font-bold text-gray-900">{stats.totalRatings}</p>
            <p className="text-xs text-gray-500">Ratings</p>
          </div>
          <div className="bg-white px-3 py-3 text-center">
            <p className="text-lg font-bold text-gray-900">{stats.totalCheckIns}</p>
            <p className="text-xs text-gray-500">Check-ins</p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {isSupported && (
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-900">Push Notifications</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isSubscribed
                  ? 'You\'ll be notified when people you follow are active'
                  : 'Get notified when friends check in, rate, or add places'}
              </p>
              {permission === 'denied' && (
                <p className="text-xs text-red-500 mt-0.5">
                  Notifications are blocked. Enable them in your browser settings.
                </p>
              )}
            </div>
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading || permission === 'denied'}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
                isSubscribed ? 'bg-green-600' : 'bg-gray-300'
              } ${(pushLoading || permission === 'denied') ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isSubscribed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* My Ratings */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-medium text-gray-900">My Ratings</h2>
      </div>
      {ratings.length === 0 ? (
        <p className="px-4 pb-3 text-xs text-gray-400">No ratings yet</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {ratings.map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/places/${r.place_id}`)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {r.places?.nickname || r.places?.name || 'Unknown'}
                </p>
                {r.note && (
                  <p className="text-xs text-gray-500 truncate">{r.note}</p>
                )}
              </div>
              <StarRating value={r.score} readOnly size="sm" />
            </button>
          ))}
        </div>
      )}

      {/* Been Here places */}
      {visitedPlaces.length > 0 && (
        <>
          <div className="px-4 pt-4 pb-2 border-t border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Been Here</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {visitedPlaces.map((v) => (
              <button
                key={v.place_id}
                onClick={() => router.push(`/places/${v.place_id}`)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
              >
                <span className="text-green-600 text-sm">✓</span>
                <p className="text-sm truncate">
                  {v.places?.nickname || v.places?.name || 'Unknown'}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Sign out */}
      <div className="px-4 py-6 mt-auto border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
