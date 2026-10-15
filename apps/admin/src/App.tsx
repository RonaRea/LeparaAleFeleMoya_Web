import { ReactNode, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AdminBootstrapResponse, AdminMetric, AdminTableRow, adminApi } from './api'

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
  const [adminData, setAdminData] = useState<AdminBootstrapResponse | null>(null)
  const [adminDataError, setAdminDataError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    adminApi.getBootstrap()
      .then((response) => {
        if (!ignore) {
          setAdminData(response)
        }
      })
      .catch((error: Error) => {
        if (!ignore) {
          setAdminDataError(error.message)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  if (!adminData && !adminDataError) {
    return <StandaloneState title="Loading admin data..." description="Using the dummy admin bootstrap client while no API URL is configured." />
  }

  if (!adminData) {
    return <StandaloneState title="Unable to load admin data." description={`Check VITE_API_BASE_URL and the ${adminApi.routes.bootstrap} route. ${adminDataError}`} />
  }

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
          <div className="sidebar-status">Demo data · Not live</div>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div className="breadcrumbs">Workspace / Admin</div>
          <div className="user-chip">Thandi N. · Administrator</div>
        </header>

        <section className="workspace-page">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage metrics={adminData.metrics} orders={adminData.orders} />} />
            <Route path="/products" element={<TablePage title="The collection." description="Manage product details, pricing, imagery and available stock." buttonLabel="+ Add product" columns={['Product / SKU', 'Price', 'Variants', 'Stock', 'Visibility', 'Action']} rows={adminData.products} />} />
            <Route path="/orders" element={<TablePage title="Every order, accounted for." description="Review payments, prepare shipments and keep customers informed." buttonLabel="Export orders" columns={['Order', 'Customer', 'Placed', 'Items / Total', 'Payment', 'Fulfillment', 'Action']} rows={adminData.orders} />} />
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

function PageFrame({ title, description, buttonLabel, children }: { title: string; description: string; buttonLabel: string; children: ReactNode }) {
  return (
    <div className="page-frame">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Admin website / sample data</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <button className="primary-button">{buttonLabel}</button>
      </div>
      {children}
      <div className="page-footnote">All names, records, totals and event details shown here are sample data.</div>
    </div>
  )
}

function OverviewPage({ metrics, orders }: { metrics: AdminMetric[]; orders: AdminTableRow[] }) {
  return (
    <PageFrame title="A clear view of the work." description="Sunday, 11 October 2026 · Sample workspace, not verified NGO impact." buttonLabel="+ Create event">
      <div className="metric-grid">
        {metrics.map((metric) => (
          <Card key={metric.label} title={metric.label}>
            <div className="metric-value">{metric.value}</div>
            <div className="muted-copy">Demo records only</div>
          </Card>
        ))}
      </div>
      <div className="two-column-overview">
        <div className="stacked-cards">
          <Card title="Attention needed">
            <div className="list-row"><span className="row-badge">Donation</span><span className="row-text">Naledi Mokoena · 12 blankets for the clothing drive</span><span className="row-action">Review</span></div>
            <div className="list-row"><span className="row-badge">Volunteer</span><span className="row-text">Lerato Khumalo · Welcome desk · Pending review</span><span className="row-action">Review</span></div>
            <div className="list-row"><span className="row-badge">Task</span><span className="row-text">Confirm venue setup · Thandi N. · Due 20 Oct</span><span className="row-action">Open</span></div>
          </Card>
          <Card title="Recent orders">
            <DataTable columns={['Recent order', 'Customer', 'Total', 'Status']} rows={orders.map((row) => [row[0], row[1], row[3].split(' / ')[1], row[5]])} />
          </Card>
        </div>
        <div className="stacked-cards aside-rail">
          <Card title="Next community event">
            <div className="image-placeholder tall">Upcoming event image</div>
            <div className="pill-row compact-top"><Tag dark>Upcoming</Tag></div>
            <h3 className="card-headline">Community clothing drive</h3>
            <p className="muted-copy">24 Oct 2026 · 10:00-14:00</p>
            <p className="muted-copy">Orlando Community Hall, Soweto</p>
          </Card>
          <Card title="Task snapshot">
            <div className="summary-stack">
              <p>1 To do · 2 In progress</p>
              <p>1 Done</p>
              <p className="muted-copy">4 sample tasks across 2 events.</p>
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

function Tag({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={`tag${dark ? ' tag-dark' : ''}`}>{children}</span>
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