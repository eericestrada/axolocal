import webpush from 'web-push';
import { getServiceRoleClient } from '@/lib/supabase/service-role';

webpush.setVapidDetails(
  'mailto:notifications@axolocal.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to all subscriptions for a given user.
 * Cleans up expired/invalid subscriptions automatically.
 */
export async function sendPushToUser(userId, payload) {
  const supabase = getServiceRoleClient();

  const { data: rows } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId);

  if (!rows || rows.length === 0) return;

  const results = await Promise.allSettled(
    rows.map(async (row) => {
      const sub = row.subscription;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        // 410 Gone or 404 = subscription expired, clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', row.id);
        }
        throw err;
      }
    })
  );

  return results;
}
