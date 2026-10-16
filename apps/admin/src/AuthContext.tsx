import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, ApiRequestOptions, apiRequest } from '../../../shared/api-client'

export type AdminProfile = {
  adminId: number
  username: string
  fullName: string
  email: string
  role: string
  mustChangePassword: boolean
}

type AdminAuthReply = {
  accessToken: string
  admin: AdminProfile
  backupCodes?: string[]
}

type AdminAuthContextValue = {
  admin: AdminProfile | null
  accessToken: string | null
  isLoading: boolean
  pendingToken: string | null
  nextStep: 'two_factor_setup' | 'two_factor_verify' | null
  setupDetails: { qrCodeDataUrl: string; manualEntryKey: string } | null
  backupCodes: string[]
  error: string | null
  login: (username: string, password: string) => Promise<void>
  verifyCode: (code: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>
  signOut: () => Promise<void>
  request: <T>(route: string, options?: Omit<ApiRequestOptions, 'accessToken'>) => Promise<T>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ accessToken: string; admin: AdminProfile } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [nextStep, setNextStep] = useState<'two_factor_setup' | 'two_factor_verify' | null>(null)
  const [setupDetails, setSetupDetails] = useState<AdminAuthContextValue['setupDetails']>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const refreshPromise = useRef<Promise<string> | null>(null)

  const applySession = useCallback((reply: AdminAuthReply) => {
    setSession({ accessToken: reply.accessToken, admin: reply.admin })
    setBackupCodes(reply.backupCodes ?? [])
    setPendingToken(null)
    setNextStep(null)
    setSetupDetails(null)
    setError(null)
  }, [])

  const refreshSession = useCallback(async () => {
    if (!refreshPromise.current) {
      refreshPromise.current = apiRequest<AdminAuthReply>('/admin/auth/refresh', { method: 'POST' })
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
      .catch((refreshError: unknown) => {
        if (refreshError instanceof ApiError && refreshError.status === 401) return
        if (active) setError(refreshError instanceof Error ? refreshError.message : 'Unable to restore the admin session.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [refreshSession])

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiRequest<{ nextStep: 'two_factor_setup' | 'two_factor_verify'; pendingToken: string }>(
      '/admin/auth/login',
      { method: 'POST', body: { username, password } },
    )
    let setup: AdminAuthContextValue['setupDetails'] = null
    if (result.nextStep === 'two_factor_setup') {
      setup = await apiRequest<{ qrCodeDataUrl: string; manualEntryKey: string }>(
        '/admin/auth/2fa/setup',
        { method: 'POST', body: { pendingToken: result.pendingToken } },
      )
    }
    setPendingToken(result.pendingToken)
    setNextStep(result.nextStep)
    setSetupDetails(setup)
    setError(null)
  }, [])

  const verifyCode = useCallback(async (code: string) => {
    if (!pendingToken || !nextStep) {
      throw new ApiError('Start signing in again to continue.', 400)
    }
    const endpoint = nextStep === 'two_factor_setup' ? '/admin/auth/2fa/confirm' : '/admin/auth/2fa/verify'
    applySession(await apiRequest<AdminAuthReply>(endpoint, {
      method: 'POST',
      body: { pendingToken, code },
    }))
  }, [applySession, nextStep, pendingToken])

  const request = useCallback(async <T,>(
    route: string,
    options: Omit<ApiRequestOptions, 'accessToken'> = {},
  ) => {
    if (!session?.accessToken) throw new ApiError('Sign in to the admin dashboard first.', 401)
    try {
      return await apiRequest<T>(route, { ...options, accessToken: session.accessToken })
    } catch (requestError) {
      if (!(requestError instanceof ApiError) || requestError.status !== 401) throw requestError
      try {
        const accessToken = await refreshSession()
        return await apiRequest<T>(route, { ...options, accessToken })
      } catch (refreshError) {
        if (refreshError instanceof ApiError && refreshError.status === 401) setSession(null)
        throw refreshError
      }
    }
  }, [refreshSession, session?.accessToken])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    await request('/admin/me/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword, confirmPassword },
    })
    await refreshSession()
  }, [refreshSession, request])

  const signOut = useCallback(async () => {
    try {
      await apiRequest('/admin/auth/logout', {
        method: 'POST',
        accessToken: session?.accessToken,
      })
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Unable to sign out.')
      throw logoutError
    } finally {
      setSession(null)
      setPendingToken(null)
      setNextStep(null)
      setSetupDetails(null)
      setBackupCodes([])
    }
  }, [session?.accessToken])

  const value = useMemo<AdminAuthContextValue>(() => ({
    admin: session?.admin ?? null,
    accessToken: session?.accessToken ?? null,
    isLoading,
    pendingToken,
    nextStep,
    setupDetails,
    backupCodes,
    error,
    login,
    verifyCode,
    changePassword,
    signOut,
    request,
  }), [backupCodes, changePassword, error, isLoading, login, nextStep, pendingToken, request, session, setupDetails, signOut, verifyCode])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('Admin authentication context is unavailable.')
  return context
}
