import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: follows } = await supabase
    .from('follows')
    .select('followed_id, profiles!follows_followed_id_fkey(display_name)')
    .eq('follower_id', user.id);

  return NextResponse.json({ follows: follows || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { followed_id, action } = await request.json();
  if (!followed_id) {
    return NextResponse.json({ error: 'followed_id is required' }, { status: 400 });
  }

  if (action === 'unfollow') {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', followed_id);
  } else {
    const { error } = await supabase.from('follows').insert({
      follower_id: user.id,
      followed_id: followed_id,
    });
    if (error && error.code !== '23505') {
      // 23505 = unique violation (already following) — ignore
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
