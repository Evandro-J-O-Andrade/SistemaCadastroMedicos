import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let authChangeVersion = 0

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // A sessão inicial do armazenamento local não substitui a verificação remota.
      if (!mounted || event === 'INITIAL_SESSION') return
      authChangeVersion += 1
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const initialVersion = authChangeVersion
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!mounted || authChangeVersion !== initialVersion) return
        setUser(error ? null : (data.user ?? null))
        setLoading(false)
      })
      .catch(() => {
        if (!mounted || authChangeVersion !== initialVersion) return
        setUser(null)
        setLoading(false)
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
