import { getJsonOrMock } from '../../../shared/api-client'

export type Product = {
  id: string
  slug: string
  name: string
  price: string
  meta: string
  caption: string
  variant: 'tee' | 'hoodie' | 'tote'
}

export type EventCard = {
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

export type OrderStep = [string, string]

export type PublicBootstrapResponse = {
  products: Product[]
  events: EventCard[]
  orderSteps: OrderStep[]
  sizeOptionsByProduct: Record<Product['slug'], string[]>
  defaultSizeByProduct: Record<Product['slug'], string>
}

export const publicApiRoutes = {
  bootstrap: '/public/bootstrap',
  products: '/public/products',
  events: '/public/events',
  accountOrders: '/public/account/orders',
  checkout: '/public/checkout',
} as const

const mockPublicBootstrap: PublicBootstrapResponse = {
  products: [
    {
      id: 'TEE-01',
      slug: 'community-tee',
      name: 'Community tee',
      price: 'R250',
      meta: 'White / Cotton / XS-XXL',
      caption: 'A clean, comfortable staple designed for everyday wear.',
      variant: 'tee',
    },
    {
      id: 'HOD-01',
      slug: 'everyday-hoodie',
      name: 'Everyday hoodie',
      price: 'R550',
      meta: 'Black / Cotton blend / S-XXL',
      caption: 'A practical layer with a softer feel for cooler days.',
      variant: 'hoodie',
    },
    {
      id: 'TOT-01',
      slug: 'together-tote',
      name: 'Together tote',
      price: 'R180',
      meta: 'Natural / Canvas / One size',
      caption: 'Reusable, durable and simple enough to carry every day.',
      variant: 'tote',
    },
  ],
  events: [
    {
      slug: 'community-clothing-drive',
      title: 'Community clothing drive',
      status: 'Upcoming',
      date: 'Saturday, 24 October 2026',
      time: '10:00-14:00 SAST',
      location: 'Orlando Community Hall',
      summary: 'Donate clean clothing and blankets, or volunteer to sort and prepare bundles for the community.',
      details: [
        'Donate clean clothing, blankets and reusable bags. Tell us what you plan to bring so we can prepare.',
        'Volunteer for clothing sorting, welcome desk or bundle packing. Select a task and describe your availability.',
        'Wear comfortable clothes. The team will share drop-off instructions after reviewing your submission.',
      ],
      variant: 'clothing-drive',
    },
    {
      slug: 'spring-community-day',
      title: 'Spring community day',
      status: 'Completed',
      date: 'Saturday, 26 September 2026',
      time: '09:00-13:00',
      location: 'Mofolo Community Garden, Soweto',
      summary: 'A sample recap of a shared morning caring for a community garden and bringing neighbors together.',
      details: [
        'Garden beds were cleared and replanted with the help of local volunteers.',
        'Extra seedlings and compost donations were distributed across nearby households.',
        'Completed events remain visible as a record of community participation.',
      ],
      variant: 'garden-day',
    },
  ],
  orderSteps: [
    ['Order confirmed', '09 Oct 2026 - 10:24'],
    ['Packed with care', '10 Oct 2026 - 08:40'],
    ['On the way', '11 Oct 2026 - 14:10'],
    ['Delivered', 'Expected 13 Oct 2026'],
  ],
  sizeOptionsByProduct: {
    'community-tee': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'everyday-hoodie': ['S', 'M', 'L', 'XL', 'XXL'],
    'together-tote': ['One size'],
  },
  defaultSizeByProduct: {
    'community-tee': 'M',
    'everyday-hoodie': 'M',
    'together-tote': 'One size',
  },
}

export const publicApi = {
  routes: publicApiRoutes,
  getBootstrap: () => getJsonOrMock(publicApiRoutes.bootstrap, mockPublicBootstrap),
}