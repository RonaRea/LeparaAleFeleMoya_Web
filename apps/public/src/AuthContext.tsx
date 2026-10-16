import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, ApiRequestOptions, apiRequest } from '../../../shared/api-client'

export type Customer = {
  customerId: number
  firstName: string
  lastName: string
  email: string
  mobile: string
}

type CustomerSession = {
  accessToken: string
  customer: Customer
}

export type CustomerProfile = Customer & {
  twoFactorEnabled: boolean
  pendingEmail: string | null
  lastLoginAt: string | null
  createdAt: string
}

type ProfileChanges = Pick<Customer, 'firstName' | 'lastName' | 'email' | 'mobile'>

type AuthContextValue = {
  customer: Customer | null
  accessToken: string | null
  isLoading: boolean
  pendingEmail: string | null
  verificationMode: 'email' | 'login' | null
  authError: string | null
  register: (details: RegisterDetails) => Promise<void>
  signIn: (email: string, password: string) => Promise<boolean>
  verifyCode: (code: string) => Promise<void>
  resendCode: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (changes: Partial<ProfileChanges>) => Promise<CustomerProfile>
  verifyNewEmail: (code: string) => Promise<CustomerProfile>
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>
  request: <T>(route: string, options?: Omit<ApiRequestOptions, 'accessToken'>) => Promise<T>
}

type RegisterDetails = {
  firstName: string
  lastName: string
  email: string
  mobile: string
  password: string
  confirmPassword: string
  acceptTerms: true
}

type AuthReply = {
  accessToken: string
  customer: Customer
}

type LoginReply = AuthReply | { pendingToken: string; message?: string }

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const refreshPromise = useRef<Promise<string> | null>(null)

  const applySession = useCallback((reply: AuthReply) => {
    setSession({ accessToken: reply.accessToken, customer: reply.customer })
    setPendingEmail(null)
    setPendingToken(null)
    setAuthError(null)
  }, [])

  const refreshSession = useCallback(async () => {
    if (!refreshPromise.current) {
      refreshPromise.current = apiRequest<AuthReply>('/auth/refresh', { method: 'POST' })
        .then((reply) => {
          applySession(reply)
          return reply.accessToken
        })
        .finally(() => {
          refreshPromise.current = null
        })
    }
    return refreshPromise.current
  }, [applySession])

  useEffect(() => {
    let active = true

    refreshSession()
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          return
        }
        if (active) {
          setAuthError(error instanceof Error ? error.message : 'Unable to restore your account session.')
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [refreshSession])

  const request = useCallback(async <T,>(
    route: string,
    options: Omit<ApiRequestOptions, 'accessToken'> = {},
  ) => {
    if (!session?.accessToken) {
      throw new ApiError('Please sign in to continue.', 401)
    }

    try {
      return await apiRequest<T>(route, { ...options, accessToken: session.accessToken })
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error
      }
      try {
        const accessToken = await refreshSession()
        return await apiRequest<T>(route, { ...options, accessToken })
      } catch (refreshError) {
        if (refreshError instanceof ApiError && refreshError.status === 401) {
          setSession(null)
        }
        throw refreshError
      }
    }
  }, [refreshSession, session?.accessToken])

  const register = useCallback(async (details: RegisterDetails) => {
    const reply = await apiRequest<{ email: string }>('/auth/register', {
      method: 'POST',
      body: details,
    })
    setPendingEmail(reply.email)
    setPendingToken(null)
    setAuthError(null)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const reply = await apiRequest<LoginReply>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    if ('accessToken' in reply) {
      applySession(reply)
      return false
    }
    setPendingToken(reply.pendingToken)
    setPendingEmail(email)
    setAuthError(null)
    return true
  }, [applySession])

  const verifyCode = useCallback(async (code: string) => {
    if (pendingToken) {
      applySession(await apiRequest<AuthReply>('/auth/login/verify', {
        method: 'POST',
        body: { pendingToken, code },
      }))
      return
    }

    if (!pendingEmail) {
      throw new ApiError('Start by creating an account or signing in again.', 400)
    }

    applySession(await apiRequest<AuthReply>('/auth/verify-email', {
      method: 'POST',
      body: { email: pendingEmail, code },
    }))
  }, [applySession, pendingEmail, pendingToken])

  const resendCode = useCallback(async () => {
    if (pendingToken) {
      await apiRequest('/auth/resend-code', {
        method: 'POST',
        body: { pendingToken },
      })
      return
    }
    if (!pendingEmail) {
      throw new ApiError('Start by creating an account or signing in again.', 400)
    }
    await apiRequest('/auth/resend-code', {
      method: 'POST',
      body: { email: pendingEmail },
    })
  }, [pendingEmail, pendingToken])

  const signOut = useCallback(async () => {
    try {
      if (session?.accessToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          accessToken: session.accessToken,
        })
      }
    } finally {
      setSession(null)
      setPendingEmail(null)
      setPendingToken(null)
    }
  }, [session?.accessToken])

  const updateCustomer = useCallback((profile: CustomerProfile) => {
    setSession((current) => current
      ? { ...current, customer: { ...current.customer, ...profile } }
      : current)
  }, [])

  const updateProfile = useCallback(async (changes: Partial<ProfileChanges>) => {
    const profile = await request<CustomerProfile>('/me', {
      method: 'PATCH',
      body: changes,
    })
    updateCustomer(profile)
    return profile
  }, [request, updateCustomer])

  const verifyNewEmail = useCallback(async (code: string) => {
    const profile = await request<CustomerProfile>('/me/email/verify', {
      method: 'POST',
      body: { code },
    })
    updateCustomer(profile)
    return profile
  }, [request, updateCustomer])

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => {
    const reply = await request<AuthReply>('/me/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword, confirmPassword },
    })
    applySession(reply)
  }, [applySession, request])

  const value = useMemo<AuthContextValue>(() => ({
    customer: session?.customer ?? null,
    accessToken: session?.accessToken ?? null,
    isLoading,
    pendingEmail,
    verificationMode: pendingToken ? 'login' : pendingEmail ? 'email' : null,
    authError,
    register,
    signIn,
    verifyCode,
    resendCode,
    signOut,
    updateProfile,
    verifyNewEmail,
    changePassword,
    request,
  }), [
    authError,
    isLoading,
    pendingEmail,
    pendingToken,
    register,
    request,
    resendCode,
    session,
    signIn,
    signOut,
    updateProfile,
    verifyNewEmail,
    changePassword,
    verifyCode,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('Authentication context is unavailable.')
  }
  return context
}
