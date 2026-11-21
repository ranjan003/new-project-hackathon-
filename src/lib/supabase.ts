import { createClient } from '@supabase/supabase-js'

// Public values for the "new hack" project. They are safe in the browser (row-level security protects the data),
// so the store works even when the host has no environment variables set. VITE_ variables override them.
const DEFAULT_URL = 'https://ommccsylnvterlfpqpau.supabase.co'
const DEFAULT_KEY = 'sb_publishable_ZQtrqqEN04jvJglLt8lWrw_YmQfRp0F'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || DEFAULT_KEY

export const supabaseConfigured = Boolean(url && key)

export const supabase = createClient(url || 'https://missing.supabase.co', key || 'missing', {
  auth: { persistSession: false },
})
