import type { ApiRequestOptions } from '../../../shared/api-client'

export type AdminRequester = <T>(
  route: string,
  options?: Omit<ApiRequestOptions, 'accessToken'>,
) => Promise<T>

export type AdminDashboardResponse = {
  today: string
  assistanceRequests: { waitingForDecision: number; submitted: number; underReview: number; approvedToFulfil: number }
  volunteerApplications: { waiting: number }
  donationPledges: { waiting: number; toReceive: number }
  enquiries: { new: number }
  stock: {
    lowItemCount: number
    lowItems: { stockItemId: number; itemName: string; unit: string; quantityOnHand: number; reorderLevel: number }[]
  }
  orders: { awaitingPayment: number; toPack: number; toShip: number; onTheWay: number }
  initiatives: { upcoming: number }
  donationsThisMonth: { count: number; monetaryTotal: { cents: number; label: string } }
}

export type AdminProduct = {
  productId: number
  name: string
  categoryId: number
  categoryName: string
  colour: string | null
  material: string | null
  priceCents: number
  price: string
  subtitle: string
  description: string | null
  imageUrl: string | null
  sizes: string[]
  inStock: boolean
  totalStock: number
  isActive: boolean
  variants: AdminProductVariant[]
}

export type AdminProductVariant = {
  variantId: number
  size: string
  sku: string
  quantityOnHand: number
}

export type AdminProductCategory = {
  categoryId: number
  name: string
  sortOrder: number
  productCount: number
  activeProductCount: number
}

export type AdminInitiative = {
  initiativeId: number
  title: string
  typeId: number
  typeName: string
  summary: string | null
  description: string
  location: string | null
  startDate: string
  endDate: string
  startTime: string | null
  endTime: string | null
  imageUrl: string | null
  donationNeeds: string | null
  volunteersRequired: boolean
  status: 'Draft' | 'Published' | 'Closed'
  taskCount: number
  applicationCount: number
}

export type AdminInitiativeType = {
  typeId: number
  name: string
  description: string | null
  initiativeCount: number
}

export type AdminOrder = {
  orderId: number
  orderNumber: string
  statusLabel: string
  paymentMethodLabel: string
  paymentStatus: string
  customer: { name: string; email: string }
  itemCount: number
  total: string
  placedAt: string
}

export const adminApiRoutes = {
  dashboard: '/admin/dashboard',
  products: '/admin/products?page=1&pageSize=100&status=all',
  productCollection: '/admin/products',
  productCategories: '/admin/product-categories',
  orders: '/admin/orders?page=1&pageSize=50',
  donations: '/admin/donations',
  volunteers: '/admin/volunteer-applications',
  events: '/admin/initiatives?page=1&pageSize=100&status=all',
  initiativeTypes: '/admin/initiative-types',
} as const

export const adminApi = {
  routes: adminApiRoutes,
  getDashboard: (request: AdminRequester) => request<AdminDashboardResponse>(adminApiRoutes.dashboard),
  getProducts: async (request: AdminRequester) => {
    const reply = await request<AdminProduct[] | { items: AdminProduct[] }>(adminApiRoutes.products)
    return Array.isArray(reply) ? reply : reply.items
  },
  getProduct: (request: AdminRequester, id: number) => request<AdminProduct>(`/admin/products/${id}`),
  getProductCategories: (request: AdminRequester) => request<AdminProductCategory[]>(adminApiRoutes.productCategories),
  createProduct: (request: AdminRequester, body: Record<string, unknown>) =>
    request<AdminProduct>(adminApiRoutes.productCollection, { method: 'POST', body }),
  updateProduct: (request: AdminRequester, id: number, body: Record<string, unknown>) =>
    request<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body }),
  uploadProductImage: (request: AdminRequester, id: number, image: File) => {
    const body = new FormData()
    body.append('image', image)
    return request<AdminProduct>(`/admin/products/${id}/image`, { method: 'POST', body })
  },
  createProductVariant: (request: AdminRequester, id: number, body: Record<string, unknown>) =>
    request<AdminProductVariant>(`/admin/products/${id}/variants`, { method: 'POST', body }),
  updateProductVariant: (request: AdminRequester, id: number, variantId: number, body: Record<string, unknown>) =>
    request<AdminProductVariant>(`/admin/products/${id}/variants/${variantId}`, { method: 'PATCH', body }),
  getOrders: async (request: AdminRequester) => {
    const reply = await request<AdminOrder[] | { items: AdminOrder[] }>(adminApiRoutes.orders)
    return Array.isArray(reply) ? reply : reply.items
  },
  getInitiatives: async (request: AdminRequester) => {
    const reply = await request<AdminInitiative[] | { items: AdminInitiative[] }>(adminApiRoutes.events)
    return Array.isArray(reply) ? reply : reply.items
  },
  getInitiative: (request: AdminRequester, id: number) => request<AdminInitiative>(`/admin/initiatives/${id}`),
  getInitiativeTypes: (request: AdminRequester) => request<AdminInitiativeType[]>(adminApiRoutes.initiativeTypes),
  createInitiative: (request: AdminRequester, body: Record<string, unknown>) =>
    request<AdminInitiative>('/admin/initiatives', { method: 'POST', body }),
  updateInitiative: (request: AdminRequester, id: number, body: Record<string, unknown>) =>
    request<AdminInitiative>(`/admin/initiatives/${id}`, { method: 'PATCH', body }),
  updateInitiativeStatus: (request: AdminRequester, id: number, status: AdminInitiative['status']) =>
    request<AdminInitiative>(`/admin/initiatives/${id}/status`, { method: 'PATCH', body: { status } }),
  uploadInitiativeImage: (request: AdminRequester, id: number, image: File) => {
    const body = new FormData()
    body.append('image', image)
    return request<AdminInitiative>(`/admin/initiatives/${id}/image`, { method: 'POST', body })
  },
}
