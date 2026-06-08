import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  ?? 'https://dcpsyquctubgjniuwhvw.supabase.co'
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseKey) {
  console.warn('TTD AI: VITE_SUPABASE_ANON_KEY not set — auth will not work')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
})

export type SupabaseUser = Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']
