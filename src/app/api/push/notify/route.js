import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service-role';
import { sendPushToUser } from '@/lib/web-push';

export async function POST(request) {
  // Authenticate the caller
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { actor_id, action_type, place_name, place_id } = await request.json();
  if (!actor_id || !action_type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const adminSupabase = getServiceRoleClient();

  // Get actor's display name
  const { data: actor } = await adminSupabase
    .from('profiles')
    .select('display_name')
    .eq('id', actor_id)
    .single();

  const actorName = actor?.display_name || 'Someone';

  // Find all users who follow this actor
  const { data: followers } = await adminSupabase
    .from('follows')
    .select('follower_id')
    .eq('followed_id', actor_id);

  if (!followers || followers.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // Build notification based on action type
  let body;
  switch (action_type) {
    case 'check_in':
      body = `${actorName} checked in at ${place_name}`;
      break;
    case 'rating':
      body = `${actorName} rated ${place_name}`;
      break;
    case 'add_place':
    case 'place_added':
      body = `${actorName} added ${place_name}`;
      break;
    default:
      body = `${actorName} updated ${place_name}`;
  }

  const payload = {
    title: 'Axolocal',
    body,
    url: place_id ? `/places/${place_id}` : '/activity',
  };

  // Deduplicate: skip if same actor+action+place in last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recent } = await adminSupabase
    .from('activity')
    .select('id')
    .eq('user_id', actor_id)
    .eq('action_type', action_type)
    .eq('place_id', place_id)
    .gte('created_at', fiveMinAgo)
    .limit(2);

  // If there are 2+ recent entries (the current one + an older one), skip notification
  if (recent && recent.length > 1) {
    return NextResponse.json({ ok: true, notified: 0, reason: 'deduplicated' });
  }

  // Send to each follower
  const results = await Promise.allSettled(
    followers.map((f) => sendPushToUser(f.follower_id, payload))
  );

  const notified = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ ok: true, notified });
}
