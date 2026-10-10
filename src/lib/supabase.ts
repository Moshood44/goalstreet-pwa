import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mjpxtnbnlbvedurolcyh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcHh0bmJubGJ2ZWR1cm9sY3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MzQ3NTMsImV4cCI6MjEwNzIxMDc1M30.Uog9JO38H02-2fdvLZ-ArQ3J6S1-z1sYmzZg9HXrkkI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
