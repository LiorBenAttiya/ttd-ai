import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// ── Dev bypass: if no Supabase key, skip auth entirely ────────
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const DEV_BYPASS = !ANON_KEY || ANON_KEY.length < 10

let supabase: any = null
if (!DEV_BYPASS) {
  import('@supabase/supabase-js').then(({ createClient }) => {
    supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL ?? 'https://dcpsyquctubgjniuwhvw.supabase.co',
      ANON_KEY,
      { auth: { persistSession: true, autoRefreshToken: true } }
    )
  })
}

interface AuthCtx {
  user: { email: string } | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<{ email: string } | null>(
    DEV_BYPASS ? { email: 'lior@lbatech.com' } : null
  )
  const [loading, setLoading] = useState(!DEV_BYPASS)

  useEffect(() => {
    if (DEV_BYPASS) return  // skip auth check in dev

    // Dynamic import to avoid crash when key is missing
    import('@supabase/supabase-js').then(({ createClient }) => {
      const client = createClient(
        import.meta.env.VITE_SUPABASE_URL ?? 'https://dcpsyquctubgjniuwhvw.supabase.co',
        ANON_KEY,
        { auth: { persistSession: true, autoRefreshToken: true } }
      )
      supabase = client

      client.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ? { email: session.user.email ?? '' } : null)
        setLoading(false)
      })

      const { data: { subscription } } = client.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ? { email: session.user.email ?? '' } : null)
        setLoading(false)
      })

      return () => subscription.unsubscribe()
    })
  }, [])

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    if (DEV_BYPASS) {
      setUser({ email }); return { error: null }
    }
    if (!supabase) return { error: 'Supabase not initialised' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut() {
    if (!DEV_BYPASS && supabase) await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
