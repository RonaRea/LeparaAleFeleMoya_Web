import { apiRequest } from '../../../shared/api-client'

export type ProductVariant = {
  variantId: number
  size: string
  availability: string
}

export type Product = {
  id: string
  productId: number
  slug: string
  name: string
  price: string
  priceCents: number
  meta: string
  caption: string
  variant: 'tee' | 'hoodie' | 'tote' | 'product'
  categoryName: string
  imageUrl: string | null
  sizes: string[]
  variants?: ProductVariant[]
  inStock: boolean
}

export type EventCard = {
  eventId: number
  slug: string
  title: string
  status: string
  date: string
  time: string
  location: string
  summary: string
  details: string[]
  variant: 'clothing-drive' | 'garden-day'
}

export type PublicBootstrapResponse = {
  products: Product[]
  events: EventCard[]
}

type ApiProduct = {
  productId: number
  name: string
  categoryName: string
  colour: string | null
  material: string | null
  price: string
  priceCents: number
  subtitle: string
  imageUrl: string | null
  sizes: string[]
  inStock: boolean
  description?: string | null
  variants?: ProductVariant[]
}

type ApiInitiative = {
  initiativeId: number
  title: string
  typeName: string
  summary: string
  description: string
  location: string | null
  dateLabel: string
  timeLabel: string | null
  phase: string
}

export const publicApiRoutes = {
  products: '/products',
  initiatives: '/initiatives',
  product: (productId: number) => `/products/${productId}`,
  account: '/me',
  accountProfile: '/me',
  accountPassword: '/me/password',
  accountEmailVerification: '/me/email/verify',
  accountOrders: '/me/orders',
  cartQuote: '/cart/quote',
  checkout: '/orders',
  register: '/auth/register',
  verifyEmail: '/auth/verify-email',
  login: '/auth/login',
} as const

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function productVariant(categoryName: string): Product['variant'] {
  const category = categoryName.toLowerCase()
  if (category.includes('shirt') || category.includes('tee')) return 'tee'
  if (category.includes('hoodie')) return 'hoodie'
  if (category.includes('accessor') || category.includes('tote')) return 'tote'
  return 'product'
}

function mapProduct(product: ApiProduct): Product {
  return {
    id: String(product.productId),
    productId: product.productId,
    slug: slugify(product.name),
    name: product.name,
    price: product.price,
    priceCents: product.priceCents,
    meta: product.subtitle,
    caption: product.description ?? product.subtitle,
    variant: productVariant(product.categoryName),
    categoryName: product.categoryName,
    imageUrl: product.imageUrl,
    sizes: product.sizes,
    variants: product.variants,
    inStock: product.inStock,
  }
}

function mapInitiative(event: ApiInitiative): EventCard {
  const variant = event.typeName.toLowerCase().includes('garden') ? 'garden-day' : 'clothing-drive'
  return {
    eventId: event.initiativeId,
    slug: String(event.initiativeId),
    title: event.title,
    status: event.phase,
    date: event.dateLabel,
    time: event.timeLabel ?? 'Time to be confirmed',
    location: event.location ?? 'Location to be confirmed',
    summary: event.summary,
    details: [event.description],
    variant,
  }
}

export const publicApi = {
  routes: publicApiRoutes,
  async getBootstrap(): Promise<PublicBootstrapResponse> {
    const [products, events] = await Promise.all([
      apiRequest<ApiProduct[]>('/products'),
      apiRequest<ApiInitiative[]>('/initiatives'),
    ])
    return {
      products: products.map(mapProduct),
      events: events.map(mapInitiative),
    }
  },
  async getProduct(productId: number) {
    return mapProduct(await apiRequest<ApiProduct>(publicApiRoutes.product(productId)))
  },
}
