import { ReactNode, createContext, useContext, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'

type Product = {
  id: string
  slug: string
  name: string
  price: string
  meta: string
  caption: string
  variant: 'tee' | 'hoodie' | 'tote'
}

type EventCard = {
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

type CartItem = {
  slug: string
  quantity: number
  size: string
}

type CartContextValue = {
  cartItems: CartItem[]
  itemCount: number
  subtotal: number
  deliveryFee: number
  total: number
  addItem: (item: CartItem) => void
  updateQuantity: (slug: string, size: string, quantity: number) => void
  removeItem: (slug: string, size: string) => void
}

const products: Product[] = [
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
]

const events: EventCard[] = [
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
]

const orderSteps = [
  ['Order confirmed', '09 Oct 2026 - 10:24'],
  ['Packed with care', '10 Oct 2026 - 08:40'],
  ['On the way', '11 Oct 2026 - 14:10'],
  ['Delivered', 'Expected 13 Oct 2026'],
]

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Events', to: '/events' },
  { label: 'Get involved', to: '/get-involved' },
  { label: 'Account', to: '/account/orders' },
]

const sizeOptionsByProduct: Record<Product['slug'], string[]> = {
  'community-tee': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'everyday-hoodie': ['S', 'M', 'L', 'XL', 'XXL'],
  'together-tote': ['One size'],
}

const defaultSizeByProduct: Record<Product['slug'], string> = {
  'community-tee': 'M',
  'everyday-hoodie': 'M',
  'together-tote': 'One size',
}

const CartContext = createContext<CartContextValue | null>(null)

function App() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const subtotal = cartItems.reduce((sum, item) => {
    const product = products.find((entry) => entry.slug === item.slug)
    return sum + (product ? parsePrice(product.price) * item.quantity : 0)
  }, 0)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const deliveryFee = cartItems.length > 0 ? 60 : 0
  const total = subtotal + deliveryFee

  function addItem(nextItem: CartItem) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.slug === nextItem.slug && item.size === nextItem.size)

      if (!existingItem) {
        return [...currentItems, nextItem]
      }

      return currentItems.map((item) => {
        if (item.slug === nextItem.slug && item.size === nextItem.size) {
          return { ...item, quantity: item.quantity + nextItem.quantity }
        }

        return item
      })
    })
  }

  function updateQuantity(slug: string, size: string, quantity: number) {
    if (quantity < 1) {
      removeItem(slug, size)
      return
    }

    setCartItems((currentItems) => currentItems.map((item) => {
      if (item.slug === slug && item.size === size) {
        return { ...item, quantity }
      }

      return item
    }))
  }

  function removeItem(slug: string, size: string) {
    setCartItems((currentItems) => currentItems.filter((item) => !(item.slug === slug && item.size === size)))
  }

  const cartContextValue: CartContextValue = {
    cartItems,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    addItem,
    updateQuantity,
    removeItem,
  }

  return (
    <CartContext.Provider value={cartContextValue}>
      <Routes>
        <Route element={<SiteFrame />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="shop/:slug" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account" element={<Navigate to="/account/orders" replace />} />
          <Route path="account/register" element={<RegisterPage />} />
          <Route path="account/verify" element={<VerifyPage />} />
          <Route path="account/orders" element={<OrdersPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:slug" element={<EventDetailPage />} />
          <Route path="get-involved" element={<GetInvolvedPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CartContext.Provider>
  )
}

function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('Cart context is unavailable.')
  }

  return context
}

function SiteFrame() {
  const { itemCount } = useCart()

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="site-brand" to="/">Lepara Ale Fele Moya</Link>
        <nav className="site-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `site-nav-link${isActive ? ' is-active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
          <Link className="site-nav-link bag-link" to="/cart">Bag ({itemCount})</Link>
        </nav>
      </header>
      <main className="page-body">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div>Lepara Ale Fele Moya</div>
        <div className="footer-links">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Contact</span>
        </div>
        <div>Concept mockup - All records and events are sample data</div>
      </footer>
    </div>
  )
}

function HomePage() {
  return (
    <div className="page-stack">
      <section className="hero-grid section-block">
        <div className="hero-copy">
          <p className="eyebrow">Wear a little kindness. Carry a shared purpose.</p>
          <h1>Wear purpose. Share possibility.</h1>
          <p className="lead-copy">Lepara Ale Fele Moya brings people together through clothing, community events and practical support.</p>
          <div className="button-row">
            <Link className="button button-dark" to="/shop">Shop the purpose</Link>
            <Link className="button" to="/get-involved">Get involved</Link>
          </div>
          <div className="micro-copy">Simple pieces. Shared support.</div>
        </div>
        <MediaPanel variant="community-room" label="Community partners" />
      </section>

      <section className="info-strip">
        <span>Clothing with purpose</span>
        <span>Community-led events</span>
        <span>Your support makes a difference</span>
      </section>

      <section className="mission-grid section-block">
        <div>
          <p className="eyebrow">Shared support</p>
          <h2>Small choices. Collective care.</h2>
        </div>
        <div>
          <p className="body-copy">Our vision is a community where practical support is shared with dignity.</p>
          <p className="body-copy">Use this concept website to explore how clothing, events and donations could work together in one calm public-facing experience.</p>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <p className="eyebrow">Everyday collection</p>
            <h2>Good things to wear.</h2>
          </div>
          <Link className="button small-button" to="/shop">Explore the shop</Link>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="feature-callout section-block split-highlight">
        <MediaPanel variant="clothing-drive" label="Upcoming community event" />
        <div className="feature-copy">
          <p className="eyebrow">Community support</p>
          <h2>Community clothing drive</h2>
          <p className="body-copy">Help sort clothing, prepare bundles or donate practical goods. Every action here connects back to the shared purpose shown throughout the site.</p>
          <p className="body-copy compact-meta">10:00-14:00 Orlando Community Hall</p>
          <div className="button-row">
            <Link className="button button-dark" to="/events/community-clothing-drive">Explore the event</Link>
            <Link className="button" to="/get-involved">Volunteer</Link>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div>
          <p className="eyebrow inverse">Shared impact</p>
          <h2>There is more than one way to give.</h2>
          <p className="body-copy inverse-copy">Explore donations or volunteer roles, then choose how you want to add your support.</p>
        </div>
        <Link className="button button-light" to="/get-involved">Decide how to volunteer</Link>
      </section>
    </div>
  )
}

function ShopPage() {
  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Clothing / Everyday collection</p>
        <div className="section-head stack-on-mobile">
          <div>
            <h1>Wear your support.</h1>
            <p className="lead-copy">Everyday essentials connected to a shared purpose. Explore the sample collection.</p>
          </div>
          <div className="sort-copy">Sort: Featured</div>
        </div>
        <div className="filter-row">
          <span className="pill pill-dark">All products (3)</span>
          <span className="pill">T-shirts</span>
          <span className="pill">Hoodies</span>
          <span className="pill">Accessories</span>
        </div>
      </section>

      <section className="product-grid section-block no-top-border">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </section>

      <section className="two-column-copy section-block">
        <div>
          <h2>Made for everyday care.</h2>
          <p className="body-copy">Simple silhouettes, practical materials and pieces you can reach for again and again.</p>
        </div>
        <div>
          <h2>A purchase with purpose.</h2>
          <p className="body-copy">Purchases are one way to support our community-focused mission. Explore other ways to get involved.</p>
          <Link className="button small-button" to="/">Discover our purpose</Link>
        </div>
      </section>
    </div>
  )
}

function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const product = products.find((item) => item.slug === slug)
  const fallbackSize = product ? defaultSizeByProduct[product.slug] : 'One size'
  const [selectedSize, setSelectedSize] = useState(fallbackSize)
  const [quantity, setQuantity] = useState(1)

  if (!product) {
    return <Navigate to="/shop" replace />
  }

  const resolvedProduct = product
  const availableSizes = sizeOptionsByProduct[resolvedProduct.slug]

  function handleAddToBag() {
    addItem({ slug: resolvedProduct.slug, size: selectedSize, quantity })
    navigate('/cart')
  }

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Shop / T-shirts / {product.id}</p>
        <h1>{resolvedProduct.name}</h1>
        <div className="product-detail-grid">
          <MediaPanel variant={resolvedProduct.variant} label={resolvedProduct.name} tall />
          <div className="detail-panel">
            <span className="pill">Everyday collection</span>
            <div className="price-copy">{resolvedProduct.price}</div>
            <p className="body-copy">{resolvedProduct.caption} This heavyweight cotton tee is designed for everyday wear, with an easy unisex fit.</p>
            <p className="compact-meta">Colour: White · 100% cotton</p>

            <div className="size-row">
              <span className="field-label">Select size</span>
              <span className="linkish">Size guide</span>
            </div>
            <div className="size-grid">
              {availableSizes.map((size) => (
                <button key={size} className={`size-chip${selectedSize === size ? ' is-selected' : ''}`} onClick={() => setSelectedSize(size)} type="button">
                  {size}
                </button>
              ))}
            </div>

            <div className="quantity-box">
              <span className="field-label">Quantity</span>
              <div className="quantity-controls">
                <button onClick={() => setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1))} type="button">-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity((currentQuantity) => currentQuantity + 1)} type="button">+</button>
              </div>
            </div>

            <p className="compact-meta">In stock - Sample stock available in all sizes</p>
            <button className="button button-dark full-width" onClick={handleAddToBag} type="button">Add to bag - {formatPrice(parsePrice(resolvedProduct.price) * quantity)}</button>
            <p className="body-copy small-copy">Create a verified account to checkout and track your order.</p>

            <div className="divider" />
            <h3>Details &amp; care</h3>
            <p className="body-copy small-copy">Relaxed fit. Ribbed crew neck. Machine wash cold with similar colours; line dry.</p>
            <p className="body-copy small-copy">Delivery: R60 · Estimated 3-5 working days. Returns: within 14 days, unworn.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function CheckoutPage() {
  const { cartItems, subtotal, deliveryFee, total, updateQuantity, removeItem } = useCart()

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Bag + Delivery + Payment</p>
        <h1>A little purpose, on its way.</h1>
        <p className="lead-copy">Checkout preview - Signed in as Naledi Mokoena - Account verified</p>
        {cartItems.length === 0 ? <EmptyBagState /> : null}
        <div className="checkout-grid">
          <div className="checkout-form">
            {cartItems.map((item) => (
              <OrderItemCompact key={`${item.slug}-${item.size}`} item={item} onQuantityChange={updateQuantity} onRemove={removeItem} />
            ))}
            <div className="form-section">
              <h2>01 / Delivery details</h2>
              <div className="field-grid two-up">
                <FormField label="First name *" defaultValue="Naledi" />
                <FormField label="Last name *" defaultValue="Mokoena" />
              </div>
              <FormField label="Street address *" defaultValue="18 Mofolo Street" />
              <div className="field-grid two-up">
                <FormField label="City *" defaultValue="Soweto" />
                <FormField label="Postal code *" defaultValue="1801" />
              </div>
              <FormField label="Phone number *" defaultValue="+27 71 234 5678" />
            </div>
            <div className="form-section">
              <h2>02 / Payment</h2>
              <FieldShell label="Payment method">
                <select defaultValue="debit-credit-card">
                  <option value="debit-credit-card">Debit / credit card</option>
                </select>
              </FieldShell>
              <FormField label="Card number *" defaultValue="4242 4242 4242 4242" />
              <div className="field-grid two-up">
                <FormField label="Expiry *" defaultValue="10 / 28" />
                <FormField label="Security code *" defaultValue="***" />
              </div>
              <label className="checkbox-row">
                <input type="checkbox" defaultChecked />
                <span>I agree to the terms and the illustrative delivery and return policy.</span>
              </label>
            </div>
          </div>

          <aside className="summary-panel">
            <div className="summary-card">
              <h2>Order summary</h2>
              {cartItems.length > 0 ? cartItems.map((item) => (
                <OrderItemCompact key={`summary-${item.slug}-${item.size}`} item={item} summary />
              )) : <p className="body-copy small-copy">No items added yet.</p>}
              <div className="summary-line"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="summary-line"><span>Delivery</span><span>{formatPrice(deliveryFee)}</span></div>
              <div className="summary-line total-line"><span>Total</span><span>{formatPrice(total)}</span></div>
              <p className="body-copy small-copy">Prices in ZAR. Demo checkout, no payment is collected.</p>
            </div>
            <span className="pill">Verified account</span>
            <button className="button button-dark full-width" disabled={cartItems.length === 0} type="button">Place order - {formatPrice(total)}</button>
            <p className="body-copy small-copy">Order confirmation and tracking will appear in My orders. This mockup does not collect payment.</p>
            <Link className="button full-width" to="/shop">Continue shopping</Link>
          </aside>
        </div>
      </section>
    </div>
  )
}

function CartPage() {
  const { cartItems, subtotal, deliveryFee, total, updateQuantity, removeItem } = useCart()

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Bag / Review your items</p>
        <h1>Your bag.</h1>
        <p className="lead-copy">Adjust quantities, remove items, then continue to checkout when you're ready.</p>
        <div className="checkout-grid">
          <div className="checkout-form">
            {cartItems.length > 0 ? cartItems.map((item) => (
              <OrderItemCompact key={`cart-${item.slug}-${item.size}`} item={item} onQuantityChange={updateQuantity} onRemove={removeItem} />
            )) : <EmptyBagState />}
          </div>
          <aside className="summary-panel">
            <div className="summary-card">
              <h2>Bag summary</h2>
              <div className="summary-line"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="summary-line"><span>Delivery</span><span>{formatPrice(deliveryFee)}</span></div>
              <div className="summary-line total-line"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>
            <Link className={`button button-dark full-width${cartItems.length === 0 ? ' is-disabled' : ''}`} to={cartItems.length === 0 ? '/shop' : '/checkout'}>
              {cartItems.length === 0 ? 'Browse the shop' : `Continue to checkout - ${formatPrice(total)}`}
            </Link>
            <Link className="button full-width" to="/shop">Keep shopping</Link>
          </aside>
        </div>
      </section>
    </div>
  )
}

function RegisterPage() {
  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Account / Step 1 of 2</p>
        <h1>Join the community.</h1>
        <p className="lead-copy">Create your account, then verify your email with a one-time code.</p>
        <div className="step-chip-row">
          <span className="pill">01 Create account</span>
          <span className="pill">02 Verify email</span>
        </div>

        <div className="register-grid">
          <div className="register-form">
            <div className="field-grid two-up">
              <FormField label="First name *" defaultValue="Naledi" />
              <FormField label="Last name *" defaultValue="Mokoena" />
            </div>
            <FormField label="Email address *" defaultValue="naledi.mokoena@example.com" />
            <FormField label="Mobile number *" defaultValue="+27 71 234 5678" />
            <FormField label="Password *" defaultValue="********" helper="At least 8 characters, including a number." />
            <FormField label="Confirm password *" defaultValue="********" />
            <label className="checkbox-row">
              <input type="checkbox" defaultChecked />
              <span>I agree to the Terms and Privacy Policy.</span>
            </label>
            <Link className="button button-dark full-width" to="/account/verify">Create account &amp; send code</Link>
            <p className="body-copy centered-copy">Already part of the community? <Link className="inline-link" to="/account/orders">Sign in</Link></p>
          </div>
          <div className="support-panel">
            <MediaPanel variant="community-room" label="Community image" tall />
            <h2>Your purpose, in one place.</h2>
            <p className="body-copy">Shop the collection, follow your orders and find your next opportunity to give. A verification code helps keep your account secure.</p>
            <p className="body-copy small-copy">Illustrative account details; no live account is created.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function VerifyPage() {
  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Account / Step 2 of 2</p>
        <h1>One more step. Then you're in.</h1>
        <p className="lead-copy">Two-step account setup - Enter the verification code sent to your email.</p>
        <div className="register-grid verify-layout">
          <div>
            <div className="step-chip-row">
              <span className="pill pill-dark">Account details saved</span>
              <span className="pill">02 Verify email</span>
            </div>
            <h2>Check your inbox</h2>
            <p className="body-copy">We sent a 6-digit code to n*****@example.com. Your account stays unverified until you confirm this code.</p>
            <span className="field-label">Email verification code *</span>
            <div className="otp-row">
              {['4', '8', '2', '6', '1', '9'].map((digit) => (
                <input key={digit} className="otp-input" defaultValue={digit} aria-label="Verification code digit" />
              ))}
            </div>
            <p className="body-copy small-copy">Code entered - Ready to verify - Expires in 09:42</p>
            <Link className="button button-dark full-width" to="/account/orders">Verify &amp; continue</Link>
            <div className="verify-row">
              <span>Didn't receive it?</span>
              <button className="text-button">Resend code</button>
            </div>
            <p className="body-copy small-copy">Check your spam folder or resend a new code. Resending replaces your previous code.</p>
            <div className="divider" />
            <button className="text-button">Change email address</button>
          </div>
          <div className="safe-panel">
            <div className="icon-badge">Shield</div>
            <h2>A safer start.</h2>
            <p className="body-copy">Once verified, you can place orders and follow their progress from your account.</p>
            <div className="summary-stack">
              <p>01 / Create your account - complete</p>
              <p>02 / Verify your email - in progress</p>
            </div>
            <p className="body-copy small-copy">Demo code only. No message is sent from this mockup.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function EventsPage() {
  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Community / Events</p>
        <h1>Come together. Do something good.</h1>
        <p className="lead-copy">Find your next opportunity to contribute, and see moments from completed events. All event details are illustrative.</p>
        <div className="filter-row">
          <span className="pill pill-dark">All events (2)</span>
          <span className="pill">Upcoming (1)</span>
          <span className="pill">Completed (1)</span>
        </div>
        <div className="event-grid">
          {events.map((event) => (
            <article key={event.slug} className="event-card">
              <MediaPanel variant={event.variant} label={event.title} />
              <div className="event-card-copy">
                <span className={`pill${event.status === 'Upcoming' ? ' pill-dark' : ''}`}>{event.status}</span>
                <h2>{event.title}</h2>
                <p className="compact-meta">{event.time} - {event.location}</p>
                <p className="body-copy">{event.summary}</p>
                <Link className={`button small-button${event.status === 'Upcoming' ? ' button-dark' : ''}`} to={`/events/${event.slug}`}>
                  {event.status === 'Upcoming' ? 'View event & get involved' : 'Read the event recap'}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block two-column-banner">
        <h2>Can't attend? You can still contribute.</h2>
        <div className="banner-action">
          <Link className="button" to="/get-involved">Make a donation</Link>
        </div>
      </section>
    </div>
  )
}

function EventDetailPage() {
  const { slug } = useParams()
  const event = events.find((item) => item.slug === slug)

  if (!event) {
    return <Navigate to="/events" replace />
  }

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Events / Upcoming / Sample event</p>
        <h1>{event.title}</h1>
        <div className="event-detail-grid">
          <div>
            <MediaPanel variant={event.variant} label={event.title} />
            <h2>Practical care. Shared with dignity.</h2>
            <p className="body-copy">Join us for a morning of sorting clothing, preparing bundles and welcoming neighbors. Bring clean, wearable clothing or blankets. You can also give your time; no previous volunteering experience is needed.</p>
            <div className="divider" />
            <h3>How you can help</h3>
            <div className="detail-list">
              {event.details.map((detail) => (
                <p key={detail} className="body-copy small-copy">{detail}</p>
              ))}
            </div>
          </div>
          <aside className="event-info-card">
            <h2>Event information</h2>
            <span className="pill pill-dark">Upcoming</span>
            <p className="event-info-line strong-line">{event.date}</p>
            <p className="event-info-line">{event.time}</p>
            <div className="divider" />
            <p className="event-info-line strong-line">{event.location}</p>
            <p className="body-copy small-copy">Soweto, Johannesburg - Sample location</p>
            <Link className="button button-dark full-width" to="/get-involved">Volunteer for this event</Link>
            <Link className="button full-width" to="/get-involved">Donate to this event</Link>
            <p className="body-copy small-copy">Requests are reviewed by the team before confirmation.</p>
          </aside>
        </div>
      </section>
    </div>
  )
}

function GetInvolvedPage() {
  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Get involved / Choose your contribution</p>
        <h1>Give in your own way.</h1>
        <p className="lead-copy">Two ways to contribute. Choose a donation or volunteer request, tell us which event or task it supports, and describe what you can offer.</p>
        <div className="dual-form-grid">
          <ContributionForm
            title="01 / Donation request"
            badge="Donation option - Goods and funds"
            actionLabel="Submit donation request"
            consent="I consent to being contacted about my donation."
            descriptionLabel="Describe your donation *"
            descriptionValue="I can donate 12 clean blankets for the clothing drive. I can drop them off on 23 October after 15:00."
            helper="Include item and quantity, or an amount for a financial donation."
            amountLabel="Estimated value / amount (ZAR)"
            amountValue="R1,200 (estimated goods value)"
            extraField={
              <FieldShell label="Donation type *">
                <select defaultValue="goods">
                  <option value="goods">Goods - clothing / blankets</option>
                </select>
              </FieldShell>
            }
          />
          <ContributionForm
            title="02 / Volunteer request"
            badge="Volunteer option - Time or skills"
            actionLabel="Submit volunteer request"
            consent="I consent to being contacted about volunteering."
            descriptionLabel="Describe your contribution *"
            descriptionValue="I can sort clothes by size and prepare bundles. I am available for the full 10:00-14:00 shift and can help with setup."
            helper="Tell us your skills, availability and any accessibility needs."
            amountLabel="Availability *"
            amountValue="24 Oct 2026 - 10:00-14:00"
            extraField={
              <FieldShell label="Task you want to help with *">
                <select defaultValue="sorting">
                  <option value="sorting">Clothing sorting</option>
                </select>
              </FieldShell>
            }
          />
        </div>
        <p className="body-copy small-copy">Required fields marked *. These are two alternative form states shown together for review. All details are sample submissions.</p>
      </section>
    </div>
  )
}

function OrdersPage() {
  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Account / My orders</p>
        <h1>Hello, Naledi.</h1>
        <p className="lead-copy">Your purchases, all in one place. Sample account - Email verified.</p>
        <div className="filter-row">
          <span className="pill pill-dark">My orders</span>
          <span className="pill">Profile</span>
          <span className="pill">Security</span>
          <span className="pill">Sign out</span>
        </div>

        <div className="orders-grid">
          <aside className="order-list-card">
            <h2>Your orders</h2>
            <div className="mini-order">
              <span className="pill pill-dark">#LAFM-1008 - On the way</span>
              <p className="body-copy small-copy">09 Oct 2026 - 1 item - R310</p>
              <p className="body-copy small-copy">Community tee / White / M</p>
              <button className="text-button">Viewing tracking</button>
            </div>
            <div className="divider" />
            <div className="mini-order muted-order">
              <span className="pill">#LAFM-0994 - Delivered</span>
              <p className="body-copy small-copy">20 Sep 2026 - 1 item - R240</p>
              <p className="body-copy small-copy">Together tote / Natural</p>
              <button className="text-button">View order</button>
            </div>
            <Link className="button full-width" to="/shop">Explore the collection</Link>
          </aside>

          <div className="tracking-card">
            <div className="tracking-head">
              <div>
                <h2>Order #LAFM-1008</h2>
                <span className="pill pill-dark">On the way</span>
                <h3>Expected 13 October</h3>
                <p className="body-copy small-copy">Demo courier - Tracking ID LAFM1008</p>
              </div>
              <button className="button small-button">Track with courier</button>
            </div>
            <div className="timeline">
              {orderSteps.map(([title, meta], index) => (
                <div key={title} className={`timeline-row${index === orderSteps.length - 1 ? ' is-faded' : ''}`}>
                  <span className="timeline-dot" />
                  <div>
                    <div className="timeline-title">{title}</div>
                    <div className="timeline-meta">{meta}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="tracking-meta-grid">
              <div>
                <h4>Delivery address</h4>
                <p className="body-copy small-copy">Naledi Mokoena · 18 Mofolo Street, Soweto, 1801</p>
              </div>
              <div>
                <h4>Payment</h4>
                <p className="body-copy small-copy">Paid - Card ending 4242 · Total R310 (incl. R60 delivery)</p>
              </div>
            </div>
            <div className="purchased-item-row">
              <MediaPanel variant="tee" label="Community tee" compact />
              <div>
                <h4>Community tee</h4>
                <p className="body-copy small-copy">White / M / Quantity 1 - R250</p>
                <button className="text-button">Need help? Contact order support</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link className="product-card" to={`/shop/${product.slug}`}>
      <MediaPanel variant={product.variant} label={product.name} />
      <div className="product-meta-row">
        <h3>{product.name}</h3>
        <span>{product.price}</span>
      </div>
      <p className="body-copy small-copy">{product.meta}</p>
    </Link>
  )
}

function MediaPanel({ variant, label, tall = false, compact = false }: { variant: string; label: string; tall?: boolean; compact?: boolean }) {
  return (
    <div className={`media-panel ${variant}${tall ? ' media-tall' : ''}${compact ? ' media-compact' : ''}`} aria-label={label}>
      <div className="media-sheen" />
      <span className="media-label">{label}</span>
    </div>
  )
}

function OrderItemCompact({
  item,
  summary = false,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem
  summary?: boolean
  onQuantityChange?: (slug: string, size: string, quantity: number) => void
  onRemove?: (slug: string, size: string) => void
}) {
  const product = products.find((entry) => entry.slug === item.slug)

  if (!product) {
    return null
  }

  return (
    <div className={`order-item${summary ? ' summary-item' : ''}`}>
      <MediaPanel variant={product.variant} label={product.name} compact />
      <div>
        <h3>{product.name} - {product.price}</h3>
        <p className="body-copy small-copy">{item.size} - Quantity: {item.quantity}</p>
        {!summary ? (
          <div className="inline-actions">
            <button className="text-button" onClick={() => onQuantityChange?.(item.slug, item.size, item.quantity + 1)} type="button">Add one more</button>
            <button className="text-button" onClick={() => onQuantityChange?.(item.slug, item.size, item.quantity - 1)} type="button">Reduce by one</button>
            <button className="text-button" onClick={() => onRemove?.(item.slug, item.size)} type="button">Remove</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function EmptyBagState() {
  return (
    <div className="empty-state-card">
      <h2>Your bag is empty.</h2>
      <p className="body-copy">Add items from the shop to review them here before checkout.</p>
      <Link className="button small-button" to="/shop">Go to the shop</Link>
    </div>
  )
}

function parsePrice(price: string) {
  return Number(price.replace(/[^0-9.]/g, ''))
}

function formatPrice(amount: number) {
  return `R${amount.toFixed(0)}`
}

function ContributionForm({
  title,
  badge,
  actionLabel,
  consent,
  descriptionLabel,
  descriptionValue,
  helper,
  amountLabel,
  amountValue,
  extraField,
}: {
  title: string
  badge: string
  actionLabel: string
  consent: string
  descriptionLabel: string
  descriptionValue: string
  helper: string
  amountLabel: string
  amountValue: string
  extraField: ReactNode
}) {
  return (
    <div className="contribution-card">
      <h2>{title}</h2>
      <span className="pill pill-dark">{badge}</span>
      <div className="field-grid two-up top-gap">
        <FormField label="Full name *" defaultValue={title.startsWith('01') ? 'Naledi Mokoena' : 'Sipho Dlamini'} />
        <FormField label="Email *" defaultValue={title.startsWith('01') ? 'naledi.mokoena@example.com' : 'sipho.dlamini@example.com'} />
      </div>
      <FormField label="Phone *" defaultValue={title.startsWith('01') ? '+27 71 234 5678' : '+27 72 345 6789'} />
      <FieldShell label="Event or task supported *">
        <select defaultValue="community-clothing-drive">
          <option value="community-clothing-drive">Community clothing drive - 24 Oct 2026</option>
        </select>
      </FieldShell>
      {extraField}
      <FieldShell label={descriptionLabel} helper={helper}>
        <textarea rows={4} defaultValue={descriptionValue} />
      </FieldShell>
      <FormField label={amountLabel} defaultValue={amountValue} />
      <label className="checkbox-row">
        <input type="checkbox" defaultChecked />
        <span>{consent}</span>
      </label>
      <button className="button button-dark full-width">{actionLabel}</button>
      <p className="body-copy small-copy">We'll review your request and confirm next steps.</p>
    </div>
  )
}

function FormField({ label, defaultValue, helper }: { label: string; defaultValue: string; helper?: string }) {
  return (
    <FieldShell label={label} helper={helper}>
      <input defaultValue={defaultValue} />
    </FieldShell>
  )
}

function FieldShell({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return (
    <label className="field-shell">
      <span className="field-label">{label}</span>
      {children}
      {helper ? <span className="field-helper">{helper}</span> : null}
    </label>
  )
}

export default App