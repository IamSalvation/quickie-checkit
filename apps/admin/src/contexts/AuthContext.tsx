import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Account, Operator } from '../types/db'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  operator: Operator | null
  account: Account | null
  refresh: () => Promise<void>
  signUp: (
    email: string,
    password: string,
    fullName: string,
    accountName: string,
    preset: string
  ) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [operator, setOperator] = useState<Operator | null>(null)
  const [account, setAccount] = useState<Account | null>(null)

  const userIdRef = useRef<string | null>(null)

  const loadOperatorAndAccount = useCallback(async (currentUser: User) => {
    // Single query with join - mirrors ClockIt's pattern.
    // Avoids the RLS chicken-and-egg between operators and accounts.
    const { data, error } = await supabase
      .from('operators')
      .select('*, accounts(*)')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (error) {
      console.warn('Error loading operator:', error.message)
      setOperator(null)
      setAccount(null)
      return
    }

    if (!data) {
      console.warn('User has no operators row. Signing out.')
      await supabase.auth.signOut()
      setOperator(null)
      setAccount(null)
      return
    }

    const { accounts: acct, ...op } = data as unknown as Operator & {
      accounts: Account | Account[] | null
    }

    setOperator(op as Operator)
    const acctData = Array.isArray(acct) ? acct[0] : acct
    setAccount(acctData ?? null)
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        const nextUser = newSession?.user ?? null

        if (!nextUser) {
          userIdRef.current = null
          setSession(null)
          setUser(null)
          setOperator(null)
          setAccount(null)
          setLoading(false)
          return
        }

        const isNewLogin =
          event === 'SIGNED_IN' || event === 'INITIAL_SESSION'

        if (isNewLogin && nextUser.id !== userIdRef.current) {
          userIdRef.current = nextUser.id
          setLoading(true)
          setSession(newSession)
          setUser(nextUser)

          // Defer to avoid Supabase auth callback deadlock
          setTimeout(() => {
            loadOperatorAndAccount(nextUser).finally(() => setLoading(false))
          }, 0)
        } else {
          setSession(newSession)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadOperatorAndAccount])

  const refresh = useCallback(async () => {
    if (user) await loadOperatorAndAccount(user)
  }, [user, loadOperatorAndAccount])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      accountName: string,
      preset: string
    ): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            account_name: accountName,
            preset,
          },
        },
      })
      return { error: error?.message ?? null }
    },
    []
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error: error?.message ?? null }
    },
    []
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    userIdRef.current = null
    setOperator(null)
    setAccount(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        operator,
        account,
        refresh,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}