/**
 * Supabase client placeholder.
 * TODO: Install @supabase/supabase-js and configure with project URL + anon key.
 * TODO: Use for: auth, database (units, progress, leaderboard), storage (study materials).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY ?? '';
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;
