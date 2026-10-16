import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AdminDashboardResponse, AdminOrder, AdminProduct, adminApi } from './api'
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

  const productRows = products.map((product) => [
    `${product.name} / ${product.categoryName}`,
    product.price,
    product.subtitle,
    String(product.totalStock),
    product.isActive ? 'Active' : 'Hidden',
  ])
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
            <Route path="/products" element={<TablePage title="The collection." description="Products, pricing, variants, and stock from the shop API." buttonLabel="Products" columns={['Product / Category', 'Price', 'Variants', 'Stock', 'Visibility']} rows={productRows} />} />
            <Route path="/orders" element={<TablePage title="Every order, accounted for." description="Orders and payment statuses retrieved from the API." buttonLabel="Orders" columns={['Order', 'Customer', 'Placed', 'Items / Total', 'Payment', 'Fulfillment']} rows={orderRows} />} />
            <Route path="/donations" element={<SimplePage title="Coordinate every contribution." description="Review donation descriptions and their associated event or task." buttonLabel="Export records" />} />
            <Route path="/volunteers" element={<SimplePage title="Put willing hands to good work." description="Review offers of time, confirm availability and assign meaningful tasks." buttonLabel="Export volunteers" />} />
            <Route path="/tasks" element={<SimplePage title="Turn plans into shared action." description="Assign responsibilities, set due dates and keep event preparation moving." buttonLabel="+ Create task" />} />
            <Route path="/events" element={<SimplePage title="Make space for community." description="Upload, publish and update upcoming events." buttonLabel="+ Create event" />} />
          </Routes>
        </section>
      </main>
    </div>
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