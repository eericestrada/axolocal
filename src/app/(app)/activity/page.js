'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useGroup } from '@/hooks/useGroup';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function actionIcon(type) {
  switch (type) {
    case 'check_in':
      return '\u{1F4CD}';
    case 'rating':
      return '\u2B50';
    case 'add_place':
      return '\u2795';
    case 'seed':
      return '\u{1F50D}';
    default:
      return '\u{1F4CC}';
  }
}

function actionText(item) {
  const name = item.profiles?.display_name || 'Someone';
  const place = item.places?.nickname || item.places?.name || 'a place';

  switch (item.action_type) {
    case 'check_in':
      return { who: name, did: 'checked in at', where: place };
    case 'rating': {
      const score = item.metadata?.score;
      return { who: name, did: score ? `rated ${score}/5 at` : 'rated', where: place };
    }
    case 'add_place':
      return { who: name, did: 'added', where: place };
    case 'seed':
      return { who: name, did: 'discovered places near', where: place };
    default:
      return { who: name, did: 'interacted with', where: place };
  }
}

export default function ActivityPage() {
  const router = useRouter();
  const supabase = createClient();
  const { group, loading: groupLoading } = useGroup();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!group?.id) return;

    async function load() {
      const { data } = await supabase
        .from('activity')
        .select('*, profiles(display_name), places(name, nickname)')
        .eq('group_id', group.id)
        .order('created_at', { ascending: false })
        .range(0, 49);

      setItems(data || []);
      setLoading(false);
    }
    load();
  }, [group?.id, supabase]);

  if (groupLoading || loading) {
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
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold">Activity</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-gray-400 text-sm">No activity yet. Start exploring!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const { who, did, where } = actionText(item);
              return (
                <button
                  key={item.id}
                  onClick={() => item.place_id && router.push(`/places/${item.place_id}`)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                >
                  <span className="text-lg mt-0.5">{actionIcon(item.action_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{who}</span>{' '}
                      <span className="text-gray-500">{did}</span>{' '}
                      <span className="font-medium">{where}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {timeAgo(item.created_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
