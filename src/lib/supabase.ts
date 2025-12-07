import { createClient } from '@supabase/supabase-js';

// Robust way to get env vars without crashing if import.meta.env is undefined
// Casting to any to avoid TypeScript strict property checks on the empty object fallback
const env = (import.meta.env || {}) as any;

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. The app may not function correctly. Check your .env file or Netlify settings.');
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);
