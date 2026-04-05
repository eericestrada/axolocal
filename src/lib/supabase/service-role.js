import { createClient } from '@supabase/supabase-js';

// Service-role client bypasses RLS — use only in server-side code
// for operations that need to read across users (e.g., sending notifications)
let client;

export function getServiceRoleClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return client;
}
