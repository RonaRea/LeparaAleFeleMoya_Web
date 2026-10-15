export async function getJsonOrMock<T>(route: string, mockData: T): Promise<T> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

  if (!apiBaseUrl) {
    return mockData
  }

  const response = await fetch(`${apiBaseUrl}${route}`)

  if (!response.ok) {
    throw new Error(`Request failed for ${route} with status ${response.status}`)
  }

  return response.json() as Promise<T>
}