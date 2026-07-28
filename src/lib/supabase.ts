import { createClient } from '@supabase/supabase-js';

import { browserAuthStorage } from '../features/auth/auth-storage';
import { environment } from './environment';

export const supabase = createClient(
  environment.supabaseUrl,
  environment.supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: browserAuthStorage,
      storageKey: 'publisher-tracker-auth',
    },
  },
);
