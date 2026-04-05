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

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth')
    .eq('user_id', userId);

  if (!subscriptions || subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys_p256dh,
              auth: sub.keys_auth,
            },
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        // 410 Gone or 404 = subscription expired, clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        throw err;
      }
    })
  );

  return results;
}
