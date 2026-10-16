import { API_ORIGIN, API_PATH, DEFAULT_API_BASE_URL } from './api-config'

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const relativeApiBaseUrl = configuredApiBaseUrl?.startsWith('/') && !configuredApiBaseUrl.startsWith('//')

export const API_BASE_URL = (
  configuredApiBaseUrl
    ? relativeApiBaseUrl && !import.meta.env.DEV
      ? `${API_ORIGIN}${configuredApiBaseUrl}`
      : configuredApiBaseUrl
    : import.meta.env.DEV
      ? API_PATH
      : DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

export type ApiErrorField = {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly fields: ApiErrorField[]
  readonly requestId?: string

  constructor(
    message: string,
    status: number,
    options: { code?: string; fields?: ApiErrorField[]; requestId?: string } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = options.code
    this.fields = options.fields ?? []
    this.requestId = options.requestId
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  if (error instanceof ApiError && error.fields.length > 0) {
    return `${error.message} ${error.fields.map(({ field, message }) => `${field}: ${message}`).join(' ')}`
  }
  return error.message
}

type ApiEnvelope<T> = {
  success: true
  data: T
}

type ApiFailure = {
  success: false
  error?: {
    code?: string
    message?: string
    fields?: ApiErrorField[]
    requestId?: string
  }
}

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  accessToken?: string | null
  headers?: HeadersInit
}

export async function apiRequest<T>(
  route: string,
  { method = 'GET', body, accessToken, headers }: ApiRequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers)

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  const requestBody = body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body)
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${route}`, {
    method,
    headers: requestHeaders,
    body: requestBody,
    credentials: 'include',
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await response.json()) as ApiEnvelope<T> | ApiFailure

  if (!response.ok || !payload.success) {
    const failure = payload as ApiFailure
    throw new ApiError(
      failure.error?.message || `The API request failed (${response.status}).`,
      response.status,
      {
        code: failure.error?.code,
        fields: failure.error?.fields,
        requestId: failure.error?.requestId ?? response.headers.get('X-Request-Id') ?? undefined,
      },
    )
  }

  return payload.data
}
