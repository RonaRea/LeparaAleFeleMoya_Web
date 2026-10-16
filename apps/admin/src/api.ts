type AdminRequester = <T>(route: string) => Promise<T>

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
  categoryName: string
  price: string
  subtitle: string
  totalStock: number
  isActive: boolean
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
  products: '/admin/products?page=1&pageSize=50',
  orders: '/admin/orders?page=1&pageSize=50',
  donations: '/admin/donations',
  volunteers: '/admin/volunteer-applications',
  events: '/admin/initiatives',
} as const

export const adminApi = {
  routes: adminApiRoutes,
  getDashboard: (request: AdminRequester) => request<AdminDashboardResponse>(adminApiRoutes.dashboard),
  getProducts: async (request: AdminRequester) => {
    const reply = await request<AdminProduct[] | { items: AdminProduct[] }>(adminApiRoutes.products)
    return Array.isArray(reply) ? reply : reply.items
  },
  getOrders: async (request: AdminRequester) => {
    const reply = await request<AdminOrder[] | { items: AdminOrder[] }>(adminApiRoutes.orders)
    return Array.isArray(reply) ? reply : reply.items
  },
}
