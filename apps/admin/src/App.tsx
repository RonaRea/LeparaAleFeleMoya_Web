import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AdminDashboardResponse, AdminInitiative, AdminInitiativeType, AdminOrder, AdminProduct, AdminProductCategory, AdminProductVariant, AdminRequester, adminApi } from './api'
import { useAdminAuth } from './AuthContext'

const navItems = [
  { label: 'Overview', path: '/overview' },
  { label: 'Products', path: '/products' },
  { label: 'Orders', path: '/orders' },
  { label: 'Donations', path: '/donations' },
  { label: 'Volunteers', path: '/volunteers' },
  { label: 'To-do Tasks', path: '/tasks' },
  { label: 'Events', path: '/events' },
]

function App() {
  const { admin, isLoading, request, signOut, backupCodes } = useAdminAuth()
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null)
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [dataForAdmin, setDataForAdmin] = useState<number | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    if (!admin) return
    setDataError(null)

    Promise.all([
      adminApi.getDashboard(request),
      adminApi.getProducts(request),
      adminApi.getOrders(request),
    ])
      .then(([dashboardResult, productsResult, ordersResult]) => {
        if (!ignore) {
          setDashboard(dashboardResult)
          setProducts(productsResult)
          setOrders(ordersResult)
          setDataForAdmin(admin.adminId)
          setDataError(null)
        }
      })
      .catch((error: Error) => {
        if (!ignore) setDataError(error.message)
      })

    return () => {
      ignore = true
    }
  }, [admin, request])

  if (isLoading) {
    return <StandaloneState title="Checking admin session..." description="Connecting to the Lepara API." />
  }
  if (!admin) {
    return <AdminLoginPage />
  }
  if (admin.mustChangePassword) {
    return <AdminPasswordChangePage />
  }
  if (dataForAdmin !== admin.adminId || !dashboard || !products || !orders) {
    return <StandaloneState title={dataError ? 'Unable to load admin data.' : 'Loading admin data...'} description={dataError ?? 'Fetching the dashboard, products, and orders from the API.'} />
  }

  const orderRows = orders.map((order) => [
    order.orderNumber,
    order.customer.name,
    new Date(order.placedAt).toLocaleDateString(),
    `${order.itemCount} / ${order.total}`,
    order.paymentStatus,
    order.statusLabel,
  ])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">Lepara Ale Fele Moya</div>
          <div className="sidebar-label">Administration</div>
          <nav className="nav-list">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <a className="sidebar-aux" href="#public">View public website</a>
          <div className="sidebar-status">Live API · {admin.role.replace('_', ' ')}</div>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div className="breadcrumbs">Workspace / Admin</div>
          <div className="user-chip">{admin.fullName} · <button className="text-button" type="button" onClick={() => { void signOut().catch((error: Error) => setSignOutError(error.message)) }}>Sign out</button></div>
        </header>

        <section className="workspace-page">
          {signOutError ? <p role="alert">{signOutError}</p> : null}
          {backupCodes.length > 0 ? <div className="card backup-codes"><h2>Save your backup codes</h2><p>These are shown once. Store them somewhere safe.</p><p>{backupCodes.join(' · ')}</p></div> : null}
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage dashboard={dashboard} orders={orders} />} />
            <Route path="/products" element={<ProductsPage request={request} initialProducts={products} />} />
            <Route path="/orders" element={<TablePage title="Every order, accounted for." description="Orders and payment statuses retrieved from the API." buttonLabel="Orders" columns={['Order', 'Customer', 'Placed', 'Items / Total', 'Payment', 'Fulfillment']} rows={orderRows} />} />
            <Route path="/donations" element={<SimplePage title="Coordinate every contribution." description="Review donation descriptions and their associated event or task." buttonLabel="Export records" />} />
            <Route path="/volunteers" element={<SimplePage title="Put willing hands to good work." description="Review offers of time, confirm availability and assign meaningful tasks." buttonLabel="Export volunteers" />} />
            <Route path="/tasks" element={<SimplePage title="Turn plans into shared action." description="Assign responsibilities, set due dates and keep event preparation moving." buttonLabel="+ Create task" />} />
            <Route path="/events" element={<EventsPage request={request} />} />
          </Routes>
        </section>
      </main>
    </div>
  )
}

type ProductDraft = {
  categoryId: string
  name: string
  price: string
  colour: string
  material: string
  description: string
  isActive: boolean
  variantSize: string
  variantSku: string
  variantStock: string
}

const emptyProductDraft: ProductDraft = {
  categoryId: '',
  name: '',
  price: '',
  colour: '',
  material: '',
  description: '',
  isActive: false,
  variantSize: '',
  variantSku: '',
  variantStock: '0',
}

function ProductsPage({ request, initialProducts }: { request: AdminRequester; initialProducts: AdminProduct[] }) {
  const [products, setProducts] = useState(initialProducts)
  const [categories, setCategories] = useState<AdminProductCategory[]>([])
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft)
  const [variantRows, setVariantRows] = useState<AdminProductVariant[]>([])
  const [image, setImage] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function refreshProducts() {
    setProducts(await adminApi.getProducts(request))
  }

  useEffect(() => {
    let ignore = false
    adminApi.getProductCategories(request)
      .then((result) => { if (!ignore) setCategories(result) })
      .catch((requestError: Error) => { if (!ignore) setError(requestError.message) })
    return () => { ignore = true }
  }, [request])

  function startCreate() {
    setEditingProduct(null)
    setEditorOpen(true)
    setDraft(emptyProductDraft)
    setVariantRows([])
    setImage(null)
    setError(null)
    setMessage(null)
  }

  async function startEdit(productId: number) {
    setError(null)
    setMessage(null)
    try {
      const product = await adminApi.getProduct(request, productId)
      setEditingProduct(product)
      setEditorOpen(true)
      setDraft({
        categoryId: String(product.categoryId),
        name: product.name,
        price: String(product.priceCents / 100),
        colour: product.colour ?? '',
        material: product.material ?? '',
        description: product.description ?? '',
        isActive: product.isActive,
        variantSize: '',
        variantSku: '',
        variantStock: '0',
      })
      setVariantRows(product.variants)
      setImage(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load product details.')
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSaving(true)
    const body = {
      categoryId: Number(draft.categoryId),
      name: draft.name.trim(),
      price: draft.price,
      colour: draft.colour.trim() || null,
      material: draft.material.trim() || null,
      description: draft.description.trim() || null,
      isActive: draft.isActive,
    }
    try {
      let saved: AdminProduct
      if (editingProduct) {
        saved = await adminApi.updateProduct(request, editingProduct.productId, body)
      } else {
        const variants = draft.variantSize
          ? [{ size: draft.variantSize, sku: draft.variantSku.trim(), quantityOnHand: Number(draft.variantStock) }]
          : []
        saved = await adminApi.createProduct(request, { ...body, variants })
      }
      setEditingProduct(saved)
      setEditorOpen(true)
      setVariantRows(saved.variants)
      if (image) saved = await adminApi.uploadProductImage(request, saved.productId, image)
      await refreshProducts()
      setEditingProduct(null)
      setEditorOpen(false)
      setMessage(`${saved.name} saved successfully.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save product.')
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleProduct(product: AdminProduct) {
    setError(null)
    setMessage(null)
    try {
      await adminApi.updateProduct(request, product.productId, { isActive: !product.isActive })
      await refreshProducts()
      setMessage(`${product.name} is now ${product.isActive ? 'hidden' : 'active'}.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update product visibility.')
    }
  }

  async function addVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingProduct) return
    const form = event.currentTarget
    setError(null)
    const values = new FormData(form)
    try {
      await adminApi.createProductVariant(request, editingProduct.productId, {
        size: String(values.get('size') ?? ''),
        sku: String(values.get('sku') ?? ''),
        quantityOnHand: Number(values.get('quantityOnHand') ?? 0),
      })
      const updated = await adminApi.getProduct(request, editingProduct.productId)
      setEditingProduct(updated)
      setVariantRows(updated.variants)
      await refreshProducts()
      form.reset()
      setMessage('Size and stock added.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to add size.')
    }
  }

  async function saveVariant(event: FormEvent<HTMLFormElement>, variant: AdminProductVariant) {
    event.preventDefault()
    if (!editingProduct) return
    const values = new FormData(event.currentTarget)
    setError(null)
    try {
      await adminApi.updateProductVariant(request, editingProduct.productId, variant.variantId, {
        sku: String(values.get('sku') ?? '').trim(),
        quantityOnHand: Number(values.get('quantityOnHand') ?? 0),
      })
      const updated = await adminApi.getProduct(request, editingProduct.productId)
      setEditingProduct(updated)
      setVariantRows(updated.variants)
      await refreshProducts()
      setMessage(`${variant.size} stock updated.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update stock.')
    }
  }

  return (
    <PageFrame title="The collection." description="Create, update, photograph and manage products and stock from the shop API." buttonLabel="Products">
      <div className="management-toolbar">
        <p className="muted-copy">{products.length} products in the catalogue. Products are archived by hiding them from the shop.</p>
        <button className="primary-button" type="button" onClick={startCreate}>+ Add product</button>
      </div>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      {editorOpen ? (
        <Card title={editingProduct ? `Edit ${editingProduct.name}` : 'Create a product'}>
          <form className="management-form" onSubmit={saveProduct}>
            <div className="form-grid">
              <label>Product name<input value={draft.name} minLength={2} maxLength={120} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
              <label>Category<select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })} required><option value="">Choose category</option>{categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}</select></label>
              <label>Price (R)<input type="number" min="0.01" max="100000" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required /></label>
              <label>Colour<input value={draft.colour} minLength={2} maxLength={40} onChange={(event) => setDraft({ ...draft, colour: event.target.value })} /></label>
              <label>Material<input value={draft.material} minLength={2} maxLength={60} onChange={(event) => setDraft({ ...draft, material: event.target.value })} /></label>
              <label>Product photo (JPEG, PNG, WebP; max 2 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>
              <label className="wide-field">Description<textarea value={draft.description} minLength={10} maxLength={2000} rows={4} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label className="check-field"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Show in shop</label>
            </div>
            {!editingProduct ? (
              <fieldset className="management-fieldset">
                <legend>Initial size (optional)</legend>
                <div className="form-grid">
                  <label>Size<select value={draft.variantSize} onChange={(event) => setDraft({ ...draft, variantSize: event.target.value })}><option value="">Add sizes later</option>{['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size'].map((size) => <option key={size}>{size}</option>)}</select></label>
                  {draft.variantSize ? <><label>SKU<input value={draft.variantSku} onChange={(event) => setDraft({ ...draft, variantSku: event.target.value })} minLength={2} maxLength={40} required /></label><label>Stock on hand<input type="number" value={draft.variantStock} onChange={(event) => setDraft({ ...draft, variantStock: event.target.value })} min={0} max={100000} required /></label></> : null}
                </div>
              </fieldset>
            ) : null}
            <div className="button-row"><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Saving...' : editingProduct ? 'Save changes' : 'Create product'}</button><button className="secondary-button" type="button" onClick={() => { setEditingProduct(null); setEditorOpen(false) }}>Cancel</button></div>
          </form>
          {editingProduct ? (
            <div className="variant-management">
              <h3>Sizes and stock</h3>
              {variantRows.length ? variantRows.map((variant) => (
                <form className="variant-edit-row" key={variant.variantId} onSubmit={(event) => void saveVariant(event, variant)}>
                  <strong>{variant.size}</strong>
                  <label>SKU<input name="sku" defaultValue={variant.sku} minLength={2} maxLength={40} required /></label>
                  <label>Stock<input name="quantityOnHand" type="number" defaultValue={variant.quantityOnHand} min={0} max={100000} required /></label>
                  <button className="secondary-button" type="submit">Save</button>
                </form>
              )) : <p className="muted-copy">No sizes yet. Add a variant below.</p>}
              <form className="variant-edit-row" onSubmit={(event) => void addVariant(event)}>
                <strong>New size</strong>
                <label>Size<select name="size" required defaultValue=""><option value="">Choose size</option>{['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size'].filter((size) => !variantRows.some((variant) => variant.size === size)).map((size) => <option key={size}>{size}</option>)}</select></label>
                <label>SKU<input name="sku" minLength={2} maxLength={40} required /></label>
                <label>Stock<input name="quantityOnHand" type="number" min={0} max={100000} defaultValue={0} required /></label>
                <button className="secondary-button" type="submit">Add size</button>
              </form>
            </div>
          ) : null}
        </Card>
      ) : null}
      <Card title="Products">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Price</th><th>Sizes</th><th>Stock</th><th>Visibility</th><th>Manage</th></tr></thead>
            <tbody>{products.map((product) => (
              <tr key={product.productId}>
                <td><strong>{product.name}</strong><div className="muted-copy">{product.categoryName} · {product.subtitle}</div></td>
                <td>{product.price}</td>
                <td>{product.sizes.join(', ') || 'No sizes'}</td>
                <td>{product.totalStock}</td>
                <td><span className={`tag${product.isActive ? '' : ' tag-muted'}`}>{product.isActive ? 'Active' : 'Hidden'}</span></td>
                <td><div className="row-controls"><button className="table-action" type="button" onClick={() => void startEdit(product.productId)}>Edit</button><button className="table-action" type="button" onClick={() => void toggleProduct(product)}>{product.isActive ? 'Hide' : 'Show'}</button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </PageFrame>
  )
}

type InitiativeDraft = {
  typeId: string
  title: string
  summary: string
  description: string
  location: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  donationNeeds: string
  volunteersRequired: boolean
}

const emptyInitiativeDraft: InitiativeDraft = {
  typeId: '',
  title: '',
  summary: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  donationNeeds: '',
  volunteersRequired: false,
}

function EventsPage({ request }: { request: AdminRequester }) {
  const [events, setEvents] = useState<AdminInitiative[]>([])
  const [types, setTypes] = useState<AdminInitiativeType[]>([])
  const [editing, setEditing] = useState<AdminInitiative | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<InitiativeDraft>(emptyInitiativeDraft)
  const [image, setImage] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  async function refreshEvents() {
    setEvents(await adminApi.getInitiatives(request))
  }

  useEffect(() => {
    let ignore = false
    Promise.all([adminApi.getInitiatives(request), adminApi.getInitiativeTypes(request)])
      .then(([eventResult, typeResult]) => {
        if (!ignore) {
          setEvents(eventResult)
          setTypes(typeResult)
          setError(null)
        }
      })
      .catch((requestError: Error) => { if (!ignore) setError(requestError.message) })
      .finally(() => { if (!ignore) setIsLoading(false) })
    return () => { ignore = true }
  }, [request])

  function startNew() {
    setEditing(null)
    setEditorOpen(true)
    setDraft(emptyInitiativeDraft)
    setImage(null)
    setError(null)
    setMessage(null)
  }

  async function startEdit(id: number) {
    setError(null)
    try {
      const event = await adminApi.getInitiative(request, id)
      setEditing(event)
      setEditorOpen(true)
      setDraft({
        typeId: String(event.typeId),
        title: event.title,
        summary: event.summary ?? '',
        description: event.description,
        location: event.location ?? '',
        startDate: event.startDate.slice(0, 10),
        endDate: event.endDate.slice(0, 10),
        startTime: event.startTime ?? '',
        endTime: event.endTime ?? '',
        donationNeeds: event.donationNeeds ?? '',
        volunteersRequired: event.volunteersRequired,
      })
      setImage(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load event details.')
    }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSaving(true)
    const body = {
      typeId: Number(draft.typeId),
      title: draft.title.trim(),
      summary: draft.summary.trim() || null,
      description: draft.description.trim(),
      location: draft.location.trim() || null,
      startDate: draft.startDate,
      endDate: draft.endDate,
      startTime: draft.startTime || null,
      endTime: draft.endTime || null,
      donationNeeds: draft.donationNeeds.trim() || null,
      volunteersRequired: draft.volunteersRequired,
    }
    try {
      let saved = editing
        ? await adminApi.updateInitiative(request, editing.initiativeId, body)
        : await adminApi.createInitiative(request, body)
      setEditing(saved)
      setEditorOpen(true)
      if (image) saved = await adminApi.uploadInitiativeImage(request, saved.initiativeId, image)
      await refreshEvents()
      setEditing(null)
      setEditorOpen(false)
      setMessage(`“${saved.title}” saved as ${saved.status}.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save event.')
    } finally {
      setIsSaving(false)
    }
  }

  async function changeStatus(event: AdminInitiative, status: AdminInitiative['status']) {
    setError(null)
    setMessage(null)
    try {
      await adminApi.updateInitiativeStatus(request, event.initiativeId, status)
      await refreshEvents()
      setMessage(`“${event.title}” is now ${status}.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to change event status.')
    }
  }

  return (
    <PageFrame title="Make space for community." description="Create events, upload photos, edit details and manage draft-to-published status." buttonLabel="Events">
      <div className="management-toolbar"><p className="muted-copy">{events.length} initiatives from the API.</p><button className="primary-button" type="button" onClick={startNew}>+ Create event</button></div>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      {editorOpen ? (
        <Card title={editing ? `Edit ${editing.title}` : 'Create an event'}>
          <form className="management-form" onSubmit={saveEvent}>
            <div className="form-grid">
              <label>Event title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} minLength={3} maxLength={200} required /></label>
              <label>Event type<select value={draft.typeId} onChange={(event) => setDraft({ ...draft, typeId: event.target.value })} required><option value="">Choose type</option>{types.map((type) => <option key={type.typeId} value={type.typeId}>{type.name}</option>)}</select></label>
              <label>Start date<input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} required /></label>
              <label>End date<input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} min={draft.startDate} required /></label>
              <label>Start time<input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label>
              <label>End time<input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></label>
              <label>Location<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} minLength={3} maxLength={200} /></label>
              <label>Donation needs<input value={draft.donationNeeds} onChange={(event) => setDraft({ ...draft, donationNeeds: event.target.value })} maxLength={255} /></label>
              <label className="wide-field">Short summary<textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} minLength={10} maxLength={200} rows={2} /></label>
              <label className="wide-field">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} minLength={20} maxLength={5000} rows={5} required /></label>
              <label>Event photo (JPEG, PNG, WebP; max 2 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>
              <label className="check-field"><input type="checkbox" checked={draft.volunteersRequired} onChange={(event) => setDraft({ ...draft, volunteersRequired: event.target.checked })} /> Volunteers needed</label>
            </div>
            <div className="button-row"><button className="primary-button" disabled={isSaving || editing?.status === 'Closed'} type="submit">{isSaving ? 'Saving...' : editing ? 'Save changes' : 'Create draft'}</button><button className="secondary-button" type="button" onClick={() => { setEditing(null); setEditorOpen(false) }}>Cancel</button></div>
            {editing?.status === 'Closed' ? <p className="muted-copy">Closed events are records and cannot be edited by the API.</p> : null}
          </form>
        </Card>
      ) : null}
      <Card title="Events and initiatives">
        {isLoading ? <p>Loading events...</p> : events.length === 0 ? <p>No events have been created yet.</p> : (
          <div className="data-table-wrap">
            <table className="data-table"><thead><tr><th>Event</th><th>Type</th><th>Dates</th><th>Status</th><th>Tasks / Volunteers</th><th>Manage</th></tr></thead>
              <tbody>{events.map((event) => (
                <tr key={event.initiativeId}>
                  <td><strong>{event.title}</strong><div className="muted-copy">{event.location ?? 'Location to be confirmed'}</div></td>
                  <td>{event.typeName}</td>
                  <td>{event.startDate.slice(0, 10)}{event.endDate.slice(0, 10) !== event.startDate.slice(0, 10) ? ` – ${event.endDate.slice(0, 10)}` : ''}</td>
                  <td><span className={`tag${event.status === 'Published' ? ' tag-dark' : ' tag-muted'}`}>{event.status}</span></td>
                  <td>{event.taskCount} tasks / {event.applicationCount} applications</td>
                  <td><div className="row-controls"><button className="table-action" type="button" onClick={() => void startEdit(event.initiativeId)} disabled={event.status === 'Closed'}>Edit</button>{event.status === 'Draft' ? <button className="table-action" type="button" onClick={() => void changeStatus(event, 'Published')}>Publish</button> : event.status === 'Published' ? <button className="table-action" type="button" onClick={() => void changeStatus(event, 'Closed')}>Close</button> : null}</div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </PageFrame>
  )
}

function AdminLoginPage() {
  const { login, verifyCode, pendingToken, nextStep, setupDetails, error: sessionError } = useAdminAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const values = new FormData(event.currentTarget)
    try {
      await login(String(values.get('username') ?? '').trim(), String(values.get('password') ?? ''))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const values = new FormData(event.currentTarget)
    try {
      await verifyCode(String(values.get('code') ?? '').trim())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify your authenticator code.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="eyebrow">Lepara Ale Fele Moya / administration</div>
        <h1>{pendingToken ? 'Verify your sign-in.' : 'Admin sign in.'}</h1>
        <p className="auth-intro">{pendingToken ? 'Use your authenticator app to continue.' : 'Sign in with your admin credentials. The dashboard requires two-factor authentication.'}</p>
        {!pendingToken ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <label>Username<input name="username" type="text" autoComplete="username" maxLength={50} required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" maxLength={128} required /></label>
            {error || sessionError ? <p className="auth-error" role="alert">{error ?? sessionError}</p> : null}
            <button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? 'Signing in...' : 'Continue'}</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerify}>
            {nextStep === 'two_factor_setup' && setupDetails ? (
              <div className="auth-setup">
                <p>Scan this QR code with your authenticator app, then enter its six-digit code.</p>
                <img src={setupDetails.qrCodeDataUrl} alt="Authenticator setup QR code" />
                <p>Manual key: <code>{setupDetails.manualEntryKey}</code></p>
              </div>
            ) : null}
            <label>Authenticator or backup code<input name="code" type="text" autoComplete="one-time-code" inputMode="numeric" maxLength={12} required /></label>
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
            <button className="primary-button" disabled={isSubmitting || (nextStep === 'two_factor_setup' && !setupDetails)} type="submit">
              {isSubmitting ? 'Verifying...' : nextStep === 'two_factor_setup' ? 'Confirm authenticator' : 'Verify and sign in'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

function AdminPasswordChangePage() {
  const { changePassword, signOut } = useAdminAuth()
  const [error, setError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const values = new FormData(event.currentTarget)
    try {
      await changePassword(
        String(values.get('currentPassword') ?? ''),
        String(values.get('newPassword') ?? ''),
        String(values.get('confirmPassword') ?? ''),
      )
      setComplete(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to change the password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (complete) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <h1>Password updated.</h1>
          <p className="auth-intro">Your admin password was changed. Sign in again to open the dashboard.</p>
          <button className="primary-button" onClick={() => { void signOut() }} type="button">Return to sign in</button>
        </section>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <h1>Choose a new password.</h1>
        <p className="auth-intro">Change your temporary password before using the admin dashboard.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
          <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? 'Updating...' : 'Update password'}</button>
        </form>
      </section>
    </div>
  )
}

function StandaloneState({ title, description }: { title: string; description: string }) {
  return (
    <div className="app-shell">
      <main className="workspace">
        <section className="workspace-page">
          <div className="page-frame">
            <div className="page-heading">
              <div>
                <h1>{title}</h1>
                <p>{description}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function PageFrame({ title, description, children }: { title: string; description: string; buttonLabel: string; children: ReactNode }) {
  return (
    <div className="page-frame">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Admin website / live API data</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="tag tag-dark">Live data</span>
      </div>
      {children}
      <div className="page-footnote">Dashboard figures and records are loaded from the API.</div>
    </div>
  )
}

function OverviewPage({ dashboard, orders }: { dashboard: AdminDashboardResponse; orders: AdminOrder[] }) {
  const metrics = [
    { label: 'Orders awaiting payment', value: dashboard.orders.awaitingPayment },
    { label: 'Orders to pack', value: dashboard.orders.toPack },
    { label: 'Volunteers to review', value: dashboard.volunteerApplications.waiting },
    { label: 'Upcoming initiatives', value: dashboard.initiatives.upcoming },
  ]
  return (
    <PageFrame title="A clear view of the work." description={`Dashboard live data · ${dashboard.today}`} buttonLabel="Dashboard">
      <div className="metric-grid">
        {metrics.map((metric) => (
          <Card key={metric.label} title={metric.label}>
            <div className="metric-value">{metric.value}</div>
            <div className="muted-copy">Current API total</div>
          </Card>
        ))}
      </div>
      <div className="two-column-overview">
        <div className="stacked-cards">
          <Card title="Attention needed">
            <div className="list-row"><span className="row-badge">Donations</span><span className="row-text">{dashboard.donationPledges.waiting} pledges waiting for review</span></div>
            <div className="list-row"><span className="row-badge">Assistance</span><span className="row-text">{dashboard.assistanceRequests.waitingForDecision} requests waiting for a decision</span></div>
            <div className="list-row"><span className="row-badge">Stock</span><span className="row-text">{dashboard.stock.lowItemCount} stock items need attention</span></div>
          </Card>
          <Card title="Recent orders">
            <DataTable columns={['Recent order', 'Customer', 'Total', 'Status']} rows={orders.slice(0, 5).map((order) => [order.orderNumber, order.customer.name, order.total, order.statusLabel])} />
          </Card>
        </div>
        <div className="stacked-cards aside-rail">
          <Card title="Next community event">
            <div className="summary-stack">
              <p>{dashboard.orders.toShip} orders to ship</p>
              <p>{dashboard.orders.onTheWay} orders in transit</p>
              <p>{dashboard.donationsThisMonth.count} donations this month · {dashboard.donationsThisMonth.monetaryTotal.label}</p>
            </div>
          </Card>
          <Card title="Low stock">
            <div className="summary-stack">
              {dashboard.stock.lowItems.map((item) => <p key={item.stockItemId}>{item.itemName}: {item.quantityOnHand} {item.unit} (reorder at {item.reorderLevel})</p>)}
            </div>
          </Card>
        </div>
      </div>
    </PageFrame>
  )
}

function TablePage({ title, description, buttonLabel, columns, rows }: { title: string; description: string; buttonLabel: string; columns: string[]; rows: string[][] }) {
  return (
    <PageFrame title={title} description={description} buttonLabel={buttonLabel}>
      <Card>
        <DataTable columns={columns} rows={rows} />
      </Card>
    </PageFrame>
  )
}

function SimplePage({ title, description, buttonLabel }: { title: string; description: string; buttonLabel: string }) {
  return (
    <PageFrame title={title} description={description} buttonLabel={buttonLabel}>
      <div className="split-panel">
        <Card title="Workspace module">
          <p>This section is ready for the next round of detailed admin screens from your prototype.</p>
        </Card>
        <Card title="Status">
          <p>React app restored and running from the admin workspace.</p>
        </Card>
      </div>
    </PageFrame>
  )
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  )
}

function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((value, cellIndex) => (
                <td key={`${value}-${cellIndex}`}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App