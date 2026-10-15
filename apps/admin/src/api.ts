import { getJsonOrMock } from '../../../shared/api-client'

export type AdminMetric = {
  label: string
  value: string
}

export type AdminTableRow = string[]

export type AdminBootstrapResponse = {
  metrics: AdminMetric[]
  products: AdminTableRow[]
  orders: AdminTableRow[]
}

export const adminApiRoutes = {
  bootstrap: '/admin/bootstrap',
  products: '/admin/products',
  orders: '/admin/orders',
  donations: '/admin/donations',
  volunteers: '/admin/volunteers',
  events: '/admin/events',
} as const

const mockAdminBootstrap: AdminBootstrapResponse = {
  metrics: [
    { label: 'Active products', value: '3' },
    { label: 'Sample orders', value: '3' },
    { label: 'Donation to review', value: '1' },
    { label: 'Volunteer to review', value: '1' },
  ],
  products: [
    ['Community tee / TEE-01', 'R250', 'White / Cotton / XS-XXL', '48', 'Active', 'Edit'],
    ['Everyday hoodie / HOD-01', 'R550', 'Black / Cotton blend / S-XXL', '24', 'Active', 'Edit'],
    ['Together tote / TOT-01', 'R180', 'Natural / Canvas / One size', '36', 'Active', 'Edit'],
  ],
  orders: [
    ['#LAFM-1008', 'Naledi Mokoena', '09 Oct 2026', '1 / R310', 'Paid', 'On the way', 'Manage'],
    ['#LAFM-1007', 'Sipho Dlamini', '08 Oct 2026', '1 / R610', 'Paid', 'Processing', 'Manage'],
    ['#LAFM-0994', 'Naledi Mokoena', '20 Sep 2026', '1 / R240', 'Paid', 'Delivered', 'View'],
  ],
}

export const adminApi = {
  routes: adminApiRoutes,
  getBootstrap: () => getJsonOrMock(adminApiRoutes.bootstrap, mockAdminBootstrap),
}