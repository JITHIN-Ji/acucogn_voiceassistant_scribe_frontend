import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Frontend will still work without these; backend handles storage server-side.
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. Supabase client not initialized.');
}

export const supabaseClient = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

export default supabaseClient;
