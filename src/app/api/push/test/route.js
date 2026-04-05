import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/web-push';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = {
    title: 'Axolocal',
    body: 'Push notifications are working! 🎉',
    url: '/activity',
  };

  try {
    const results = await sendPushToUser(user.id, payload);
    return NextResponse.json({ ok: true, results: results?.length || 0 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
