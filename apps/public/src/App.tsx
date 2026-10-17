import { FormEvent, InputHTMLAttributes, ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiErrorMessage, apiRequest } from '../../../shared/api-client'
import { CustomerProfile, useAuth } from './AuthContext'
import { EventCard, Product, ProductVariant, PublicBootstrapResponse, publicApi, publicApiRoutes } from './api'

type CartItem = {
  productId: number
  variantId: number
  slug: string
  quantity: number
  size: string
}

type CartQuote = {
  subtotalCents: number
  deliveryFeeCents: number
  totalCents: number
  canPlaceOrder: boolean
  paymentMethods: { value: 'EFT' | 'Cash on delivery'; label: string; note: string }[]
}

type CartContextValue = {
  cartItems: CartItem[]
  itemCount: number
  subtotal: number
  deliveryFee: number
  total: number
  quote: CartQuote | null
  quoteError: string | null
  addItem: (item: CartItem) => void
  updateQuantity: (slug: string, size: string, quantity: number) => void
  removeItem: (slug: string, size: string) => void
  clearCart: () => void
}

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Events', to: '/events' },
  { label: 'Get involved', to: '/get-involved' },
  { label: 'Account', to: '/account/orders' },
]

const CartContext = createContext<CartContextValue | null>(null)
const SiteDataContext = createContext<PublicBootstrapResponse | null>(null)

function App() {
  const [siteData, setSiteData] = useState<PublicBootstrapResponse | null>(null)
  const [siteDataError, setSiteDataError] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [quote, setQuote] = useState<CartQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const { authError } = useAuth()

  useEffect(() => {
    let ignore = false

    publicApi.getBootstrap()
      .then((response) => {
        if (!ignore) {
          setSiteData(response)
        }
      })
      .catch((error: Error) => {
        if (!ignore) {
          setSiteDataError(error.message)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false
    setQuoteError(null)
    setQuote(null)

    if (cartItems.length === 0) {
      setQuote(null)
      return () => {
        ignore = true
      }
    }

    apiRequest<CartQuote>('/cart/quote', {
      method: 'POST',
      body: { items: cartItems.map(({ variantId, quantity }) => ({ variantId, quantity })) },
    })
      .then((result) => {
        if (!ignore) setQuote(result)
      })
      .catch((error: Error) => {
        if (!ignore) {
          setQuote(null)
          setQuoteError(error.message)
        }
      })

    return () => {
      ignore = true
    }
  }, [cartItems])

  const subtotal = (quote?.subtotalCents ?? 0) / 100
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const deliveryFee = (quote?.deliveryFeeCents ?? 0) / 100
  const total = (quote?.totalCents ?? 0) / 100

  function addItem(nextItem: CartItem) {
    setCartItems((currentItems) => {
      const matchesSameVariant = (item: CartItem) => item.variantId === nextItem.variantId
      const matchesSameProductSize = (item: CartItem) =>
        item.productId === nextItem.productId &&
        item.size.trim().toLocaleLowerCase() === nextItem.size.trim().toLocaleLowerCase()
      const matchingItems = currentItems.filter((item) => matchesSameVariant(item) || matchesSameProductSize(item))

      if (matchingItems.length === 0) {
        return [...currentItems, nextItem]
      }

      const firstMatchIndex = currentItems.findIndex((item) => matchesSameVariant(item) || matchesSameProductSize(item))
      const mergedItem = {
        ...matchingItems[0],
        quantity: Math.min(10, matchingItems.reduce((sum, item) => sum + item.quantity, nextItem.quantity)),
      }

      return currentItems.flatMap((item, index) => {
        if (index === firstMatchIndex) return [mergedItem]
        return matchesSameVariant(item) || matchesSameProductSize(item) ? [] : [item]
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
        return { ...item, quantity: Math.min(10, quantity) }
      }

      return item
    }))
  }

  function removeItem(slug: string, size: string) {
    setCartItems((currentItems) => currentItems.filter((item) => !(item.slug === slug && item.size === size)))
  }

  function clearCart() {
    setCartItems([])
  }

  const cartContextValue: CartContextValue = {
    cartItems,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    quote,
    quoteError,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }

  if (!siteData && !siteDataError) {
    return <DataState title="Loading website data..." description="Connecting to the Lepara API." />
  }

  if (!siteData) {
    return <DataState title="Unable to load website data." description={`The product and event API could not be reached. ${siteDataError}`} />
  }

  return (
    <SiteDataContext.Provider value={siteData}>
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
            <Route path="account/login" element={<LoginPage />} />
            <Route path="account/verify" element={<VerifyPage />} />
            <Route path="account/orders" element={<OrdersPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:slug" element={<EventDetailPage />} />
            <Route path="get-involved" element={<GetInvolvedPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartContext.Provider>
    </SiteDataContext.Provider>
  )
}

function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('Cart context is unavailable.')
  }

  return context
}

function useSiteData() {
  const context = useContext(SiteDataContext)

  if (!context) {
    throw new Error('Site data is unavailable.')
  }

  return context
}

function DataState({ title, description }: { title: string; description: string }) {
  return (
    <div className="site-shell">
      <main className="page-body">
        <section className="section-block compact-section">
          <h1>{title}</h1>
          <p className="lead-copy">{description}</p>
        </section>
      </main>
    </div>
  )
}

function SiteFrame() {
  const { itemCount } = useCart()
  const { customer, authError, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const wasAuthenticated = useRef(Boolean(customer))

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (wasAuthenticated.current && !customer) {
      navigate('/account/login', { replace: true })
    }
    wasAuthenticated.current = Boolean(customer)
  }, [customer, navigate])

  async function handleSignOut() {
    setSignOutError(null)
    try {
      await signOut()
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out.')
    } finally {
      navigate('/account/login', { replace: true })
    }
  }

  return (
    <div className="site-shell">
      <header className={`site-header${menuOpen ? ' menu-open' : ''}`}>
        <Link className="site-brand" to="/">Lepara Ale Fele Moya</Link>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {menuOpen
              ? <path d="m6 6 12 12M18 6 6 18" />
              : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <nav className="site-nav" id="primary-navigation" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink key={item.to} onClick={() => setMenuOpen(false)} to={item.to === '/account/orders' && !customer ? '/account/login' : item.to} end={item.to === '/'} className={({ isActive }) => `site-nav-link${isActive ? ' is-active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
          <Link className="site-nav-link bag-link" onClick={() => setMenuOpen(false)} to="/cart">Bag ({itemCount})</Link>
          {customer ? <button className="text-button" onClick={() => { setMenuOpen(false); void handleSignOut() }} type="button">Sign out</button> : null}
        </nav>
      </header>
      {authError || signOutError ? <p className="api-error" role="alert">{signOutError ?? authError}</p> : null}
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
        <div>Products, events, orders and account details use the Lepara API.</div>
      </footer>
    </div>
  )
}

function HomePage() {
  const { products, events } = useSiteData()
  const upcomingEvent = events.find((event) => event.status === 'Upcoming')

  return (
    <div className="page-stack">
      <section className="hero-grid section-block home-hero">
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
        <MediaPanel
          variant="community-room"
          label="Community volunteers sharing support"
          imageUrl="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&h=1100&fit=crop&auto=format&q=85"
          loading="eager"
        />
      </section>

      <section className="info-strip home-info-strip">
        <span>Clothing with purpose</span>
        <span>Community-led events</span>
        <span>Your support makes a difference</span>
      </section>

      <section className="mission-grid section-block home-mission">
        <div>
          <p className="eyebrow">Shared support</p>
          <h2>Small choices. Collective care.</h2>
        </div>
        <div>
          <p className="body-copy">Our vision is a community where practical support is shared with dignity.</p>
          <p className="body-copy">Clothing, community events and everyday acts of care come together to make support practical and welcoming.</p>
        </div>
      </section>

      <section className="section-block home-products">
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

      <section className="feature-callout section-block split-highlight home-event">
        <MediaPanel
          variant={upcomingEvent?.variant ?? 'clothing-drive'}
          label="Volunteers preparing donations at a community event"
          imageUrl="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200&h=900&fit=crop&auto=format&q=85"
        />
        <div className="feature-copy">
          <p className="eyebrow">Community support</p>
          <h2>{upcomingEvent?.title ?? 'Community events'}</h2>
          <p className="body-copy">{upcomingEvent?.summary ?? 'Help build community through practical support and shared action.'}</p>
          <p className="body-copy compact-meta">{upcomingEvent ? `${upcomingEvent.time} · ${upcomingEvent.location}` : 'Find an opportunity to get involved.'}</p>
          <div className="button-row">
            {upcomingEvent ? <Link className="button button-dark" to={`/events/${upcomingEvent.slug}`}>Explore the event</Link> : null}
            <Link className="button" to="/get-involved">Volunteer</Link>
          </div>
        </div>
      </section>

      <section className="cta-band home-cta">
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
  const { products } = useSiteData()

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Clothing / Everyday collection</p>
        <div className="section-head stack-on-mobile">
          <div>
            <h1>Wear your support.</h1>
            <p className="lead-copy">Everyday essentials connected to a shared purpose. Browse products currently available in the shop.</p>
          </div>
          <div className="sort-copy">Sort: Featured</div>
        </div>
        <div className="filter-row">
          <span className="pill pill-dark">All products ({products.length})</span>
          {[...new Set(products.map((product) => product.categoryName))].map((category) => <span className="pill" key={category}>{category}</span>)}
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
  const { products } = useSiteData()
  const { slug } = useParams()
  const { addItem } = useCart()
  const product = products.find((item) => item.slug === slug || String(item.productId) === slug)
  const [productDetail, setProductDetail] = useState<Product | null>(null)
  const [productError, setProductError] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addedToBagKey, setAddedToBagKey] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    setProductDetail(null)
    setProductError(null)
    setSelectedVariant(null)

    if (product) {
      publicApi.getProduct(product.productId)
        .then((result) => {
          if (!ignore) {
            setProductDetail(result)
            setSelectedVariant(result.variants?.find((variant) => variant.availability !== 'Sold out') ?? null)
          }
        })
        .catch((error: Error) => {
          if (!ignore) setProductError(error.message)
        })
    }
    return () => {
      ignore = true
    }
  }, [product?.productId])

  if (!product) {
    return <Navigate to="/shop" replace />
  }
  const resolvedProduct = product
  const currentAddKey = selectedVariant ? `${resolvedProduct.productId}:${selectedVariant.variantId}:${quantity}` : null
  const addedToBag = currentAddKey !== null && addedToBagKey === currentAddKey

  if (productError) {
    return <DataState title="Unable to load this product." description={productError} />
  }
  if (!productDetail) {
    return <DataState title="Loading product details..." description="Checking sizes and availability with the shop API." />
  }

  function handleAddToBag() {
    if (!selectedVariant || !currentAddKey || addedToBag) return
    addItem({
      productId: resolvedProduct.productId,
      variantId: selectedVariant.variantId,
      slug: resolvedProduct.slug,
      size: selectedVariant.size,
      quantity,
    })
    setAddedToBagKey(currentAddKey)
  }

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Shop / {productDetail.categoryName} / {productDetail.id}</p>
        <h1>{productDetail.name}</h1>
        <div className="product-detail-grid">
          <MediaPanel variant={productDetail.variant} label={productDetail.name} imageUrl={productDetail.imageUrl} tall />
          <div className="detail-panel">
            <span className="pill">{productDetail.categoryName}</span>
            <div className="price-copy">{productDetail.price}</div>
            <p className="body-copy">{productDetail.caption}</p>
            <p className="compact-meta">{productDetail.meta}</p>

            <div className="size-row">
              <span className="field-label">Select size</span>
              <span className="linkish">{selectedVariant?.availability ?? 'Sold out'}</span>
            </div>
            <div className="size-grid">
              {(productDetail.variants ?? []).map((variant) => (
                <button
                  key={variant.variantId}
                  className={`size-chip${selectedVariant?.variantId === variant.variantId ? ' is-selected' : ''}`}
                  onClick={() => setSelectedVariant(variant)}
                  disabled={variant.availability === 'Sold out'}
                  type="button"
                >
                  {variant.size}
                </button>
              ))}
            </div>

            <div className="quantity-box">
              <span className="field-label">Quantity</span>
              <div className="quantity-controls">
                <button onClick={() => setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1))} type="button">-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity((currentQuantity) => Math.min(10, currentQuantity + 1))} type="button">+</button>
              </div>
            </div>

            <button className="button button-dark full-width" onClick={handleAddToBag} disabled={!selectedVariant || !productDetail.inStock || addedToBag} type="button">
              {addedToBag ? 'Added to bag' : `Add to bag - ${formatPrice((productDetail.priceCents / 100) * quantity)}`}
            </button>
            <p className="body-copy small-copy">Sign in or create an account at checkout to place an order.</p>

            <div className="divider" />
            <h3>Product details</h3>
            <p className="body-copy small-copy">{productDetail.meta}</p>
            {productDetail.imageUrl ? <a className="inline-link" href={productDetail.imageUrl} target="_blank" rel="noreferrer">View product image</a> : null}
          </div>
        </div>
      </section>
    </div>
  )
}

function CheckoutPage() {
  const { cartItems, subtotal, deliveryFee, total, quote, quoteError, updateQuantity, removeItem, clearCart } = useCart()
  const { customer, request } = useAuth()
  const [order, setOrder] = useState<{ orderNumber: string; statusLabel: string; total: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'EFT' | 'Cash on delivery'>('EFT')
  const lastSubmission = useRef<{ body: string; key: string } | null>(null)

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!customer || !quote?.canPlaceOrder) {
      setError(customer ? 'Please review your bag and try again.' : 'Sign in before placing your order.')
      return
    }

    const values = new FormData(event.currentTarget)
    const body = {
      items: cartItems.map(({ variantId, quantity }) => ({ variantId, quantity })),
      recipientName: String(values.get('recipientName') ?? '').trim(),
      streetAddress: String(values.get('streetAddress') ?? '').trim(),
      city: String(values.get('city') ?? '').trim(),
      postalCode: String(values.get('postalCode') ?? '').trim(),
      phone: String(values.get('phone') ?? '').trim(),
      paymentMethod,
      acceptTerms: values.get('acceptTerms') === 'on',
    }

    const serializedBody = JSON.stringify(body)
    if (!lastSubmission.current || lastSubmission.current.body !== serializedBody) {
      lastSubmission.current = { body: serializedBody, key: crypto.randomUUID() }
    }
    setIsSubmitting(true)
    try {
      const result = await request<{ orderNumber: string; statusLabel: string; total: string }>('/orders', {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': lastSubmission.current.key },
      })
      setOrder(result)
      lastSubmission.current = null
      clearCart()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.fields.length > 0) {
        setError(apiErrorMessage(requestError, 'Unable to place your order.'))
      } else {
        setError(apiErrorMessage(requestError, 'Unable to place your order.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Bag + Delivery + Payment</p>
        <h1>A little purpose, on its way.</h1>
        <p className="lead-copy">{customer ? `Signed in as ${customer.firstName} ${customer.lastName}.` : 'Sign in with your verified account to place an order.'}</p>
        {order ? (
          <div className="empty-state-card" role="status">
            <h2>Order {order.orderNumber} placed.</h2>
            <p className="body-copy">{order.statusLabel} · {order.total}</p>
            <p className="body-copy">Your order has been saved. View its current status in your account.</p>
            <Link className="button button-dark" to="/account/orders">View my orders</Link>
          </div>
        ) : null}
        {!customer && !order ? <div className="empty-state-card"><p className="body-copy">A verified account is required to place and track orders.</p><Link className="button button-dark" to="/account/login">Sign in</Link><Link className="button" to="/account/register">Create account</Link></div> : null}
        {cartItems.length === 0 && !order ? <EmptyBagState /> : null}
        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={placeOrder}>
            {cartItems.map((item) => (
              <OrderItemCompact key={`${item.slug}-${item.size}`} item={item} onQuantityChange={updateQuantity} onRemove={removeItem} />
            ))}
            <div className="form-section">
              <h2>01 / Delivery details</h2>
              <div className="field-grid two-up">
                <FormField name="recipientName" label="Recipient full name *" defaultValue={customer ? `${customer.firstName} ${customer.lastName}` : ''} autoComplete="name" required />
              </div>
              <FormField name="streetAddress" label="Street address *" defaultValue="" autoComplete="street-address" required minLength={3} maxLength={120} />
              <div className="field-grid two-up">
                <FormField name="city" label="City *" defaultValue="" autoComplete="address-level2" required minLength={2} maxLength={60} />
                <FormField name="postalCode" label="Postal code *" defaultValue="" autoComplete="postal-code" required pattern="\d{4}" inputMode="numeric" />
              </div>
              <FormField name="phone" label="Phone number *" defaultValue={customer?.mobile ?? ''} autoComplete="tel" type="tel" required />
            </div>
            <div className="form-section">
              <h2>02 / Payment</h2>
              <FieldShell label="Payment method">
                <select name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'EFT' | 'Cash on delivery')} required>
                  {(quote?.paymentMethods ?? []).map((method) => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </FieldShell>
              <label className="checkbox-row">
                <input type="checkbox" name="acceptTerms" required />
                <span>I agree to the terms and delivery policy.</span>
              </label>
            </div>
            {error || quoteError ? <p className="api-error" role="alert">{error ?? quoteError}</p> : null}
            {quote && !quote.canPlaceOrder ? <p className="api-error" role="alert">One or more items cannot be ordered in the selected quantity.</p> : null}
            <button className="button button-dark full-width" disabled={!customer || cartItems.length === 0 || !quote?.canPlaceOrder || isSubmitting || Boolean(quoteError)} type="submit">
              {isSubmitting ? 'Placing order...' : `Place order - ${formatPrice(total)}`}
            </button>
          </form>

          <aside className="summary-panel">
            <div className="summary-card">
              <h2>Order summary</h2>
              {cartItems.length > 0 ? cartItems.map((item) => (
                <OrderItemCompact key={`summary-${item.slug}-${item.size}`} item={item} summary />
              )) : <p className="body-copy small-copy">No items added yet.</p>}
              <div className="summary-line"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="summary-line"><span>Delivery</span><span>{formatPrice(deliveryFee)}</span></div>
              <div className="summary-line total-line"><span>Total</span><span>{formatPrice(total)}</span></div>
              <p className="body-copy small-copy">Prices and delivery are calculated by the shop API. Payment method: {paymentMethod}.</p>
            </div>
            {customer ? <span className="pill">Signed in as {customer.email}</span> : null}
            <p className="body-copy small-copy">Order confirmation and tracking are available from My orders.</p>
            <Link className="button full-width" to="/shop">Continue shopping</Link>
          </aside>
        </div>
      </section>
    </div>
  )
}

function CartPage() {
  const { cartItems, subtotal, deliveryFee, total, quote, quoteError, updateQuantity, removeItem } = useCart()

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
              {quoteError ? <p className="api-error" role="alert">{quoteError}</p> : null}
            </div>
            <Link className={`button button-dark full-width${cartItems.length === 0 || !quote?.canPlaceOrder ? ' is-disabled' : ''}`} to={cartItems.length === 0 || !quote?.canPlaceOrder ? '/shop' : '/checkout'}>
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
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const values = new FormData(event.currentTarget)
    setIsSubmitting(true)
    try {
      if (values.get('acceptTerms') !== 'on') {
        setError('Please accept the terms and privacy policy to create an account.')
        return
      }
      await register({
        firstName: String(values.get('firstName') ?? '').trim(),
        lastName: String(values.get('lastName') ?? '').trim(),
        email: String(values.get('email') ?? '').trim(),
        mobile: String(values.get('mobile') ?? '').trim(),
        password: String(values.get('password') ?? ''),
        confirmPassword: String(values.get('confirmPassword') ?? ''),
        acceptTerms: true,
      })
      navigate('/account/verify')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to create your account.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Account / Step 1 of 2</p>
        <h1>Join the community.</h1>
        <p className="lead-copy">Create your account, then verify your email with a one-time code.</p>
        <form className="register-grid" onSubmit={handleSubmit}>
          <div className="register-form">
            <div className="field-grid two-up">
              <FormField name="firstName" label="First name *" autoComplete="given-name" required minLength={2} maxLength={60} />
              <FormField name="lastName" label="Last name *" autoComplete="family-name" required minLength={2} maxLength={60} />
            </div>
            <FormField name="email" label="Email address *" type="email" autoComplete="email" autoCapitalize="none" required maxLength={254} />
            <FormField name="mobile" label="Mobile number *" type="tel" autoComplete="tel" required />
            <FormField name="password" label="Password *" type="password" autoComplete="new-password" required minLength={8} maxLength={64} pattern="(?=.*[A-Za-z])(?=.*\d).{8,64}" helper="At least 8 characters, including a letter and a number." />
            <FormField name="confirmPassword" label="Confirm password *" type="password" autoComplete="new-password" required />
            <label className="checkbox-row">
              <input type="checkbox" name="acceptTerms" required />
              <span>I agree to the Terms and Privacy Policy.</span>
            </label>
            {error ? <p className="api-error" role="alert">{error}</p> : null}
            <button className="button button-dark full-width" disabled={isSubmitting} type="submit">{isSubmitting ? 'Creating account...' : 'Create account & send code'}</button>
            <p className="body-copy centered-copy">Already part of the community? <Link className="inline-link" to="/account/login">Sign in</Link></p>
          </div>
          <div className="support-panel">
            <MediaPanel variant="community-room" label="Community image" tall />
            <h2>Your purpose, in one place.</h2>
            <p className="body-copy">Shop the collection, follow your orders and find your next opportunity to give.</p>
          </div>
        </form>
      </section>
    </div>
  )
}

function LoginPage() {
  const { signIn, customer } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const values = new FormData(event.currentTarget)
    setIsSubmitting(true)
    try {
      const needsCode = await signIn(String(values.get('email') ?? '').trim(), String(values.get('password') ?? ''))
      navigate(needsCode ? '/account/verify' : '/account/orders')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to sign in.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (customer) return <Navigate to="/account/orders" replace />

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Account / Sign in</p>
        <h1>Welcome back.</h1>
        <p className="lead-copy">Sign in to place orders and see your account activity.</p>
        <form className="register-form" onSubmit={handleSubmit}>
          <FormField name="email" label="Email address *" type="email" autoComplete="email" autoCapitalize="none" required maxLength={254} />
          <FormField name="password" label="Password *" type="password" autoComplete="current-password" required />
          {error ? <p className="api-error" role="alert">{error}</p> : null}
          <button className="button button-dark full-width" disabled={isSubmitting} type="submit">{isSubmitting ? 'Signing in...' : 'Sign in'}</button>
          <p className="body-copy centered-copy">New here? <Link className="inline-link" to="/account/register">Create an account</Link></p>
        </form>
      </section>
    </div>
  )
}

function VerifyPage() {
  const { pendingEmail, verificationMode, verifyCode, resendCode } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!verificationMode) return <Navigate to="/account/register" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const values = new FormData(event.currentTarget)
    try {
      await verifyCode(String(values.get('code') ?? '').trim())
      navigate('/account/orders')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to verify the code.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    setError(null)
    setMessage(null)
    try {
      await resendCode()
      setMessage('A new verification code has been sent.')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to resend the code.'))
    }
  }

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Account / Verify</p>
        <h1>One more step. Then you're in.</h1>
        <p className="lead-copy">{verificationMode === 'email' ? `Enter the six-digit code sent to ${pendingEmail}.` : 'Enter the six-digit code from your authenticator app.'}</p>
        <form className="register-form" onSubmit={handleSubmit}>
          <FormField name="code" label="Verification code *" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
          {error ? <p className="api-error" role="alert">{error}</p> : null}
          {message ? <p role="status">{message}</p> : null}
          <button className="button button-dark full-width" disabled={isSubmitting} type="submit">{isSubmitting ? 'Verifying...' : 'Verify and continue'}</button>
          <button className="text-button" onClick={() => void handleResend()} type="button">Resend code</button>
        </form>
      </section>
    </div>
  )
}

function EventsPage() {
  const { events } = useSiteData()

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Community / Events</p>
        <h1>Come together. Do something good.</h1>
        <p className="lead-copy">Find an upcoming community event or read about past activities.</p>
        <div className="filter-row">
          <span className="pill pill-dark">All events ({events.length})</span>
          <span className="pill">Upcoming ({events.filter((event) => event.status === 'Upcoming').length})</span>
          <span className="pill">Completed ({events.filter((event) => event.status === 'Completed').length})</span>
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
  const { events } = useSiteData()
  const { slug } = useParams()
  const event = events.find((item) => item.slug === slug)

  if (!event) {
    return <Navigate to="/events" replace />
  }

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Events / {event.status}</p>
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
            <p className="body-copy small-copy">{event.location}</p>
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
  const { events } = useSiteData()
  const [donationCategories, setDonationCategories] = useState<{ value: string; label: string }[]>([])
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const upcomingEvents = events.filter((event) => event.status === 'Upcoming')

  useEffect(() => {
    let ignore = false
    apiRequest<{ donationCategories: { value: string; label: string }[] }>('/form-options')
      .then((options) => {
        if (!ignore) setDonationCategories(options.donationCategories)
      })
      .catch((error: Error) => {
        if (!ignore) setOptionsError(error.message)
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Get involved / Choose your contribution</p>
        <h1>Give in your own way.</h1>
        <p className="lead-copy">Submit a donation pledge or volunteer application. The API returns a reference number for each request.</p>
        {optionsError ? <p className="api-error" role="alert">Unable to load contribution choices: {optionsError}</p> : null}
        <div className="dual-form-grid">
          <DonationForm events={upcomingEvents} categories={donationCategories} />
          <VolunteerForm events={upcomingEvents} />
        </div>
      </section>
    </div>
  )
}

type ContributionReply = {
  referenceNumber: string
  message: string
}

function DonationForm({ events, categories }: { events: EventCard[]; categories: { value: string; label: string }[] }) {
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState<ContributionReply | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setReply(null)
    const form = event.currentTarget
    const values = new FormData(form)
    setIsSubmitting(true)
    try {
      if (values.get('consent') !== 'on') throw new Error('Please consent to being contacted about your donation.')
      const initiativeId = String(values.get('initiativeId') ?? '')
      const estimatedValue = String(values.get('estimatedValue') ?? '').trim()
      const body = {
        fullName: String(values.get('fullName') ?? '').trim(),
        email: String(values.get('email') ?? '').trim(),
        phone: String(values.get('phone') ?? '').trim(),
        ...(initiativeId ? { initiativeId: Number(initiativeId) } : {}),
        category: String(values.get('category') ?? ''),
        description: String(values.get('description') ?? '').trim(),
        ...(estimatedValue ? { estimatedValue } : {}),
        consent: true,
      }
      setReply(await apiRequest<ContributionReply>('/donation-pledges', { method: 'POST', body }))
      form.reset()
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to submit your donation pledge.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="contribution-card" onSubmit={handleSubmit}>
      <h2>Donation pledge</h2>
      <div className="field-grid two-up">
        <FormField name="fullName" label="Full name *" required minLength={2} maxLength={100} autoComplete="name" />
        <FormField name="email" label="Email *" type="email" required maxLength={150} autoComplete="email" />
      </div>
      <FormField name="phone" label="Phone *" type="tel" required autoComplete="tel" />
      <FieldShell label="Event (optional)">
        <select name="initiativeId" defaultValue="">
          <option value="">General donation</option>
          {events.map((event) => <option key={event.eventId} value={event.eventId}>{event.title}</option>)}
        </select>
      </FieldShell>
      <FieldShell label="Donation type *">
        <select name="category" defaultValue="" required>
          <option value="" disabled>Select a donation type</option>
          {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
        </select>
      </FieldShell>
      <FieldShell label="Describe your donation *">
        <textarea name="description" rows={4} minLength={10} maxLength={1000} required />
      </FieldShell>
      <FormField name="estimatedValue" label="Estimated value in rands (optional)" type="number" min={0} max={1000000} step="0.01" inputMode="decimal" />
      <label className="checkbox-row"><input type="checkbox" name="consent" required /><span>I consent to being contacted about my donation.</span></label>
      {error ? <p className="api-error" role="alert">{error}</p> : null}
      {reply ? <p role="status">{reply.message} Reference: {reply.referenceNumber}</p> : null}
      <button className="button button-dark full-width" disabled={isSubmitting || categories.length === 0} type="submit">{isSubmitting ? 'Submitting...' : 'Submit donation pledge'}</button>
    </form>
  )
}

function VolunteerForm({ events }: { events: EventCard[] }) {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [tasks, setTasks] = useState<{ taskId: number; name: string }[]>([])
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState<ContributionReply | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let ignore = false
    setTasks([])
    setTasksError(null)
    if (!selectedEventId) return
    apiRequest<{ taskId: number; name: string }[]>(`/initiatives/${selectedEventId}/tasks`)
      .then((result) => {
        if (!ignore) setTasks(result)
      })
      .catch((requestError: Error) => {
        if (!ignore) setTasksError(requestError.message)
      })
    return () => {
      ignore = true
    }
  }, [selectedEventId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setReply(null)
    const form = event.currentTarget
    const values = new FormData(form)
    setIsSubmitting(true)
    try {
      if (values.get('consent') !== 'on') throw new Error('Please consent to being contacted about volunteering.')
      const taskId = String(values.get('taskId') ?? '')
      const email = String(values.get('email') ?? '').trim()
      const body = {
        initiativeId: Number(values.get('initiativeId')),
        ...(taskId ? { taskId: Number(taskId) } : {}),
        fullName: String(values.get('fullName') ?? '').trim(),
        phone: String(values.get('phone') ?? '').trim(),
        ...(email ? { email } : {}),
        contribution: String(values.get('contribution') ?? '').trim(),
        availability: String(values.get('availability') ?? '').trim(),
        consent: true,
      }
      setReply(await apiRequest<ContributionReply>('/volunteer-applications', { method: 'POST', body }))
      form.reset()
      setSelectedEventId('')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to submit your volunteer application.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="contribution-card" onSubmit={handleSubmit}>
      <h2>Volunteer application</h2>
      <FieldShell label="Event *">
        <select name="initiativeId" value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} required>
          <option value="">Choose an upcoming event</option>
          {events.map((event) => <option key={event.eventId} value={event.eventId}>{event.title}</option>)}
        </select>
      </FieldShell>
      <FieldShell label="Task (optional)">
        <select name="taskId" defaultValue="" disabled={!selectedEventId || tasks.length === 0}>
          <option value="">General volunteering</option>
          {tasks.map((task) => <option key={task.taskId} value={task.taskId}>{task.name}</option>)}
        </select>
      </FieldShell>
      {tasksError ? <p className="api-error" role="alert">{tasksError}</p> : null}
      <div className="field-grid two-up">
        <FormField name="fullName" label="Full name *" required minLength={2} maxLength={100} autoComplete="name" />
        <FormField name="phone" label="Phone *" type="tel" required autoComplete="tel" />
      </div>
      <FormField name="email" label="Email (optional)" type="email" maxLength={150} autoComplete="email" />
      <FieldShell label="Describe how you can help *">
        <textarea name="contribution" rows={4} minLength={10} maxLength={1000} required />
      </FieldShell>
      <FormField name="availability" label="Availability *" required minLength={3} maxLength={200} />
      <label className="checkbox-row"><input type="checkbox" name="consent" required /><span>I consent to being contacted about volunteering.</span></label>
      {error ? <p className="api-error" role="alert">{error}</p> : null}
      {reply ? <p role="status">{reply.message} Reference: {reply.referenceNumber}</p> : null}
      <button className="button button-dark full-width" disabled={isSubmitting || events.length === 0} type="submit">{isSubmitting ? 'Submitting...' : 'Submit volunteer application'}</button>
    </form>
  )
}

function OrdersPage() {
  const { customer, request } = useAuth()
  const [orders, setOrders] = useState<CustomerOrderSummary[] | null>(null)
  const [ordersForCustomer, setOrdersForCustomer] = useState<number | null>(null)
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'security'>('orders')

  useEffect(() => {
    let ignore = false
    setError(null)
    if (!customer) {
      setOrdersForCustomer(null)
      setOrders(null)
      setSelectedOrderNumber(null)
      setSelectedOrder(null)
      return
    }

    request<CustomerOrderSummary[]>(`${publicApiRoutes.accountOrders}?page=1&pageSize=20`)
      .then((result) => {
        if (!ignore) {
          setOrders(result)
          setSelectedOrder(null)
          setOrdersForCustomer(customer.customerId)
          setSelectedOrderNumber(result[0]?.orderNumber ?? null)
        }
      })
      .catch((requestError: Error) => {
        if (!ignore) setError(requestError.message)
      })
    return () => {
      ignore = true
    }
  }, [customer, request])

  const visibleOrders = ordersForCustomer === customer?.customerId ? orders : null
  const visibleSelectedOrder = ordersForCustomer === customer?.customerId && selectedOrder?.orderNumber === selectedOrderNumber
    ? selectedOrder
    : null

  useEffect(() => {
    let ignore = false
    setSelectedOrder(null)
    if (!selectedOrderNumber) return
    request<CustomerOrder>(`${publicApiRoutes.accountOrders}/${encodeURIComponent(selectedOrderNumber)}`)
      .then((result) => {
        if (!ignore) setSelectedOrder(result)
      })
      .catch((requestError: Error) => {
        if (!ignore) setError(requestError.message)
      })
    return () => {
      ignore = true
    }
  }, [request, selectedOrderNumber])

  if (!customer) {
    return (
      <div className="page-stack">
        <section className="section-block compact-section">
          <h1>Sign in to view your orders.</h1>
          <p className="lead-copy">Your orders are available to your account after signing in.</p>
          <Link className="button button-dark" to="/account/login">Sign in</Link>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="section-block compact-section">
        <p className="eyebrow">Account / My orders</p>
        <h1>Hello, {customer.firstName}.</h1>
        <p className="lead-copy">Your profile, security settings and purchases in one place.</p>
        <div className="account-tabs" role="tablist" aria-label="Account settings">
          {(['orders', 'profile', 'security'] as const).map((tab) => (
            <button
              key={tab}
              id={`account-tab-${tab}`}
              className={`account-tab${activeTab === tab ? ' is-active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`account-panel-${tab}`}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'orders' ? 'Orders' : tab === 'profile' ? 'Profile' : 'Security'}
            </button>
          ))}
        </div>
        {activeTab === 'orders' ? (
          <div id="account-panel-orders" role="tabpanel" aria-labelledby="account-tab-orders">
            <p className="lead-copy account-panel-intro">Your purchases and order statuses from the Lepara API.</p>
            {error ? <p className="api-error" role="alert">{error}</p> : null}
            {visibleOrders === null && !error ? <p>Loading your orders...</p> : null}
            {visibleOrders?.length === 0 ? <div className="empty-state-card"><h2>No orders yet.</h2><p className="body-copy">Your placed orders will appear here.</p><Link className="button button-dark" to="/shop">Explore the shop</Link></div> : null}
            <div className="orders-grid">
              <aside className="order-list-card">
                <h2>Your orders</h2>
                {visibleOrders?.map((order) => (
                  <button className="mini-order order-select" key={order.orderNumber} onClick={() => setSelectedOrderNumber(order.orderNumber)} type="button">
                    <span className={`pill${selectedOrderNumber === order.orderNumber ? ' pill-dark' : ''}`}>{order.orderNumber} · {order.statusLabel}</span>
                    <span className="body-copy small-copy">{new Date(order.placedAt).toLocaleDateString()} · {order.itemCount} items · {order.total}</span>
                    {order.firstItem ? <span className="body-copy small-copy">{order.firstItem.name} / {order.firstItem.size}</span> : null}
                  </button>
                ))}
              </aside>
              {visibleSelectedOrder ? (
                <article className="tracking-card" key={visibleSelectedOrder.orderNumber}>
                  <div className="tracking-head">
                    <div>
                      <h2>Order {visibleSelectedOrder.orderNumber}</h2>
                      <span className="pill pill-dark">{visibleSelectedOrder.statusLabel}</span>
                      <p className="body-copy small-copy">{new Date(visibleSelectedOrder.placedAt).toLocaleString()} · {visibleSelectedOrder.total}</p>
                      <p className="body-copy small-copy">Payment: {visibleSelectedOrder.paymentMethodLabel} · {visibleSelectedOrder.paymentStatus}</p>
                    </div>
                  </div>
                  <div className="timeline">
                    {visibleSelectedOrder.tracking.map((step) => (
                      <div key={step.status} className={`timeline-row${step.done ? '' : ' is-faded'}`}>
                        <span className="timeline-dot" />
                        <div><div className="timeline-title">{step.title}</div><div className="timeline-meta">{step.at ? new Date(step.at).toLocaleString() : 'Not completed'}</div></div>
                      </div>
                    ))}
                  </div>
                  <div className="tracking-meta-grid">
                    <div>
                      <h4>Delivery address</h4>
                      <p className="body-copy small-copy">{visibleSelectedOrder.deliveryAddress.recipientName} · {visibleSelectedOrder.deliveryAddress.streetAddress}, {visibleSelectedOrder.deliveryAddress.city}, {visibleSelectedOrder.deliveryAddress.postalCode}</p>
                    </div>
                    <div>
                      <h4>Items</h4>
                      {visibleSelectedOrder.items.map((item) => <p key={item.variantId} className="body-copy small-copy">{item.name} / {item.size} · {item.quantity} × {item.unitPrice}</p>)}
                    </div>
                  </div>
                </article>
              ) : visibleOrders && visibleOrders.length > 0 && !error ? <p>Loading order details...</p> : null}
            </div>
          </div>
        ) : activeTab === 'profile' ? (
          <div id="account-panel-profile" role="tabpanel" aria-labelledby="account-tab-profile">
            <ProfileTab />
          </div>
        ) : (
          <div id="account-panel-security" role="tabpanel" aria-labelledby="account-tab-security">
            <SecurityTab />
          </div>
        )}
      </section>
    </div>
  )
}

function ProfileTab() {
  const { request, updateProfile, verifyNewEmail } = useAuth()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [draft, setDraft] = useState({ firstName: '', lastName: '', email: '', mobile: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    request<CustomerProfile>(publicApiRoutes.accountProfile)
      .then((result) => {
        if (!ignore) {
          setProfile(result)
          setDraft({
            firstName: result.firstName,
            lastName: result.lastName,
            email: result.email,
            mobile: result.mobile,
          })
        }
      })
      .catch((requestError: Error) => {
        if (!ignore) setError(apiErrorMessage(requestError, 'Unable to load your profile.'))
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [request])

  function updateDraft(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setError(null)
    setMessage(null)
    const changes: Partial<typeof draft> = {}
    if (draft.firstName.trim() !== profile.firstName) changes.firstName = draft.firstName.trim()
    if (draft.lastName.trim() !== profile.lastName) changes.lastName = draft.lastName.trim()
    if (draft.email.trim().toLowerCase() !== profile.email.toLowerCase()) changes.email = draft.email.trim()
    if (draft.mobile.trim() !== profile.mobile) changes.mobile = draft.mobile.trim()

    if (Object.keys(changes).length === 0) {
      setMessage('Your profile is already up to date.')
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateProfile(changes)
      setProfile(updated)
      setDraft((current) => ({
        ...current,
        firstName: updated.firstName,
        lastName: updated.lastName,
        mobile: updated.mobile,
      }))
      setMessage(updated.pendingEmail
        ? `A verification code was sent to ${updated.pendingEmail}. Verify it below to update your email.`
        : 'Your profile has been updated.')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to update your profile.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function submitEmailVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      const updated = await verifyNewEmail(verificationCode)
      setProfile(updated)
      setDraft((current) => ({ ...current, email: updated.email }))
      setVerificationCode('')
      setMessage('Your email address has been verified and updated.')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to verify your email address.'))
    }
  }

  return (
    <div className="account-settings-grid">
      <section className="account-settings-card">
        <p className="eyebrow">Profile details</p>
        <h2>Your information</h2>
        {isLoading ? <p className="body-copy">Loading your profile...</p> : null}
        {profile ? (
          <form className="account-settings-form" onSubmit={saveProfile}>
            <div className="field-grid two-up">
              <FormField name="firstName" label="First name *" value={draft.firstName} onChange={(event) => updateDraft('firstName', event.target.value)} autoComplete="given-name" minLength={2} maxLength={60} required />
              <FormField name="lastName" label="Last name *" value={draft.lastName} onChange={(event) => updateDraft('lastName', event.target.value)} autoComplete="family-name" minLength={2} maxLength={60} required />
            </div>
            <FormField name="email" label="Email address *" type="email" value={draft.email} onChange={(event) => updateDraft('email', event.target.value)} autoComplete="email" autoCapitalize="none" maxLength={254} required />
            <FormField name="mobile" label="Mobile number *" type="tel" value={draft.mobile} onChange={(event) => updateDraft('mobile', event.target.value)} autoComplete="tel" maxLength={20} required />
            {profile.pendingEmail ? <p className="body-copy small-copy">Email change pending: {profile.pendingEmail}</p> : null}
            {error ? <p className="api-error" role="alert">{error}</p> : null}
            {message ? <p className="form-success" role="status">{message}</p> : null}
            <button className="button button-dark" disabled={isSaving} type="submit">{isSaving ? 'Saving profile...' : 'Save profile'}</button>
          </form>
        ) : null}
      </section>
      {profile?.pendingEmail ? (
        <section className="account-settings-card">
          <p className="eyebrow">Email verification</p>
          <h2>Confirm your new email</h2>
          <p className="body-copy">Enter the six-digit code sent to {profile.pendingEmail}.</p>
          <form className="account-settings-form" onSubmit={submitEmailVerification}>
            <FormField name="emailCode" label="Verification code *" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
            <button className="button" disabled={verificationCode.length !== 6} type="submit">Verify new email</button>
          </form>
        </section>
      ) : null}
      {profile ? (
        <section className="account-settings-card account-profile-meta">
          <p><strong>Account created</strong><span>{new Date(profile.createdAt).toLocaleDateString()}</span></p>
          <p><strong>Last sign-in</strong><span>{profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Not available'}</span></p>
        </section>
      ) : null}
    </div>
  )
}

function SecurityTab() {
  const { changePassword } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const form = event.currentTarget
    const values = new FormData(form)
    const currentPassword = String(values.get('currentPassword') ?? '')
    const newPassword = String(values.get('newPassword') ?? '')
    const confirmPassword = String(values.get('confirmPassword') ?? '')
    if (newPassword !== confirmPassword) {
      setError('The new password and confirmation do not match.')
      return
    }

    setIsSaving(true)
    try {
      await changePassword(currentPassword, newPassword, confirmPassword)
      form.reset()
      setMessage('Your password has been changed. Your current session remains active.')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to change your password.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="account-settings-card account-security-card">
      <p className="eyebrow">Security</p>
      <h2>Update your password</h2>
      <p className="body-copy">Enter your current password, then choose a new one. Other signed-in devices will be signed out.</p>
      <form className="account-settings-form" onSubmit={submitPasswordChange}>
        <FormField name="currentPassword" label="Current password *" type="password" autoComplete="current-password" maxLength={128} required />
        <FormField name="newPassword" label="New password *" type="password" autoComplete="new-password" minLength={8} maxLength={64} pattern="(?=.*[A-Za-z])(?=.*\d).{8,64}" helper="At least 8 characters, including a letter and a number." required />
        <FormField name="confirmPassword" label="Confirm new password *" type="password" autoComplete="new-password" minLength={8} maxLength={64} required />
        {error ? <p className="api-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}
        <button className="button button-dark" disabled={isSaving} type="submit">{isSaving ? 'Updating password...' : 'Update password'}</button>
      </form>
    </section>
  )
}

type CustomerOrderSummary = {
  orderNumber: string
  statusLabel: string
  total: string
  placedAt: string
  itemCount: number
  firstItem: { name: string; size: string; imageUrl: string | null } | null
}

type CustomerOrder = {
  orderNumber: string
  statusLabel: string
  paymentStatus: string
  total: string
  placedAt: string
  paymentMethodLabel: string
  items: { variantId: number; name: string; size: string; quantity: number; unitPrice: string }[]
  deliveryAddress: { recipientName: string; streetAddress: string; city: string; postalCode: string }
  tracking: { title: string; status: string; done: boolean; at: string | null }[]
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link className="product-card" to={`/shop/${product.productId}`}>
      <MediaPanel variant={product.variant} label={product.name} imageUrl={product.imageUrl} />
      <div className="product-meta-row">
        <h3>{product.name}</h3>
        <span>{product.price}</span>
      </div>
      <p className="body-copy small-copy">{product.meta}</p>
    </Link>
  )
}

function MediaPanel({
  variant,
  label,
  imageUrl,
  tall = false,
  compact = false,
  loading = 'lazy',
}: {
  variant: string
  label: string
  imageUrl?: string | null
  tall?: boolean
  compact?: boolean
  loading?: 'eager' | 'lazy'
}) {
  return (
    <div className={`media-panel ${variant}${imageUrl ? ' media-has-image' : ''}${tall ? ' media-tall' : ''}${compact ? ' media-compact' : ''}`} aria-label={label}>
      {imageUrl ? <img className="media-image" src={imageUrl} alt={label} loading={loading} decoding="async" /> : <div className="media-sheen" />}
      {!imageUrl ? <span className="media-label">{label}</span> : null}
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
  const { products } = useSiteData()
  const product = products.find((entry) => entry.productId === item.productId)

  if (!product) {
    return null
  }

  return (
    <div className={`order-item${summary ? ' summary-item' : ''}`}>
      <MediaPanel variant={product.variant} label={product.name} imageUrl={product.imageUrl} compact />
      <div>
        <h3>{product.name} - {product.price}</h3>
        <p className="body-copy small-copy">{item.size} - Quantity: {item.quantity}</p>
        {!summary ? (
          <div className="cart-item-actions">
            <div className="quantity-stepper" aria-label={`Quantity: ${item.quantity}`}>
              <button
                className="stepper-button"
                onClick={() => onQuantityChange?.(item.slug, item.size, item.quantity - 1)}
                disabled={item.quantity <= 1}
                type="button"
                aria-label={`Decrease ${product.name} quantity`}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
              </button>
              <span className="stepper-value" aria-live="polite">{item.quantity}</span>
              <button
                className="stepper-button"
                onClick={() => onQuantityChange?.(item.slug, item.size, item.quantity + 1)}
                disabled={item.quantity >= 10}
                type="button"
                aria-label={`Increase ${product.name} quantity`}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 12.5 5-5 5 5" /></svg>
              </button>
            </div>
            <button className="remove-item-button" onClick={() => onRemove?.(item.slug, item.size)} type="button" aria-label={`Remove ${product.name} from bag`} title="Remove item">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5.5h13M8 5.5V3.8h4v1.7m3.2 0-.7 10.3H5.5L4.8 5.5M8 8.5v4.8m4-4.8v4.8" /></svg>
            </button>
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

function formatPrice(amount: number) {
  return `R${amount.toFixed(0)}`
}

function FormField({ label, helper, ...inputProps }: { label: string; helper?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} helper={helper}>
      <input {...inputProps} />
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