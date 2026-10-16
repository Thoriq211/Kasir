import { useEffect, useState } from 'react'

import Products from './Products'

import POS from './POS'

import History from './History'

import Reports from './Reports'

import Expenses from './Expenses'
import Users from './Users'

import {

  LayoutDashboard,
  UsersRound,

  ShoppingBag,

  Coffee,

  FileText,

  BarChart3,

  Wallet,

  Settings,

  Search,

  Bell,

  Plus,

  ArrowUpRight,

  Receipt,

  TrendingUp,

  Clock3,

  ChevronDown,

  MoreHorizontal,

  LogOut,

} from 'lucide-react'

import './App.css'

function App() {

  const [activePage, setActivePage] = useState('dashboard')

  const [currentUser, setCurrentUser] = useState(null)

  const [authLoading, setAuthLoading] = useState(true)

  const [authError, setAuthError] = useState('')

  const isAdmin = currentUser?.role === 'admin'

  const userName = currentUser?.name || currentUser?.email || (isAdmin ? 'Admin' : 'Kasir')

  const userInitials = userName.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'NU'

  const [transactions, setTransactions] = useState([])

  const [loadingTransactions, setLoadingTransactions] = useState(true)

  const [transactionError, setTransactionError] = useState('')

  const [expenses, setExpenses] = useState([])

  const [expenseError, setExpenseError] = useState('')

  useEffect(() => {

    const loadCurrentUser = async () => {

      try {

        const token = sessionStorage.getItem('nook_token')

        if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')

        const response = await fetch('http://localhost:5000/api/auth/me', {

          headers: { Authorization: `Bearer ${token}` },

        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) throw new Error(data.message || 'Sesi login tidak valid. Silakan login kembali.')

        const user = data.user || data

        if (!user.role) throw new Error('Role akun tidak ditemukan. Periksa endpoint /api/auth/me.')

        setCurrentUser(user)

        setAuthError('')

        if (user.role === 'cashier') setActivePage('pos')

      } catch (error) {

        setAuthError(error.message || 'Gagal memeriksa sesi login.')

      } finally {

        setAuthLoading(false)

      }

    }

    loadCurrentUser()

  }, [])

  useEffect(() => {

    const fetchTransactions = async () => {

      try {

        const token = sessionStorage.getItem('nook_token')

        if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')

        const response = await fetch('http://localhost:5000/api/transactions', {

          headers: {

            Authorization: `Bearer ${token}`,

          },

        })

        if (!response.ok) throw new Error('Gagal mengambil data transaksi')

        const data = await response.json()

        setTransactions(Array.isArray(data) ? data : data.transactions || [])

        setTransactionError('')

      } catch (error) {

        setTransactionError(error.message || 'Terjadi kesalahan saat mengambil transaksi')

      } finally {

        setLoadingTransactions(false)

      }

    }

    fetchTransactions()

  }, [])

  useEffect(() => {

    if (!isAdmin) {

      setExpenses([])

      return

    }

    const fetchExpenses = async () => {

      try {

        const token = sessionStorage.getItem('nook_token')

        if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')

        const response = await fetch('http://localhost:5000/api/expenses', {

          headers: {

            Authorization: `Bearer ${token}`,

          },

        })

        if (!response.ok) {

          throw new Error('Gagal mengambil data pengeluaran')

        }

        const data = await response.json()

        setExpenses(Array.isArray(data) ? data : data.expenses || [])

        setExpenseError('')

      } catch (error) {

        setExpenseError(

          error.message || 'Gagal mengambil data pengeluaran'

        )

      }

    }

    fetchExpenses()

  }, [isAdmin])

  useEffect(() => {

    if (currentUser?.role === 'cashier' && !['pos', 'history'].includes(activePage)) {

      setActivePage('pos')

    }

  }, [currentUser, activePage])

  const handleLogout = () => {

    sessionStorage.removeItem('nook_token')

    window.location.reload()

  }

  const formatRupiah = (amount) =>

    new Intl.NumberFormat('id-ID', {

      style: 'currency',

      currency: 'IDR',

      maximumFractionDigits: 0,

    }).format(amount || 0)

  const totalSales = transactions.reduce(

    (sum, transaction) => sum + (Number(transaction.total) || 0),

    0

  )

const now = new Date()

const isSameDay = (value) => {

  const date = new Date(value)

  return (

    !Number.isNaN(date.getTime()) &&

    date.toDateString() === now.toDateString()

  )

}

const isSameMonth = (value) => {

  const date = new Date(value)

  return (

    !Number.isNaN(date.getTime()) &&

    date.getMonth() === now.getMonth() &&

    date.getFullYear() === now.getFullYear()

  )

}

  const todaySales = transactions

    .filter((transaction) => isSameDay(transaction.createdAt))

    .reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0)

  const monthlySales = transactions

    .filter((transaction) => isSameMonth(transaction.createdAt))

    .reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0)

  const todayExpenses = expenses

    .filter((expense) => isSameDay(expense.date))

    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)

  const monthlyExpenses = expenses

    .filter((expense) => isSameMonth(expense.date))

    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)

  const monthlyNetProfit = monthlySales - monthlyExpenses

  const totalTransactions = transactions.length

  const averageOrder = totalTransactions ? totalSales / totalTransactions : 0

  const todayTransactions = transactions.filter((transaction) => {

    const date = new Date(transaction.createdAt)

    return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString()

  }).length

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {

    const date = new Date()

    date.setHours(0, 0, 0, 0)

    date.setDate(date.getDate() - (6 - index))

    const sales = transactions.reduce((sum, transaction) => {

      const transactionDate = new Date(transaction.createdAt)

      return transactionDate.toDateString() === date.toDateString()

        ? sum + (Number(transaction.total) || 0)

        : sum

    }, 0)

    const expensesTotal = expenses.reduce((sum, expense) => {

      const expenseDate = new Date(expense.date)

      return expenseDate.toDateString() === date.toDateString()

        ? sum + (Number(expense.amount) || 0)

        : sum

    }, 0)

    return { date, sales, expenses: expensesTotal }

  })

  const weeklySales = lastSevenDays.reduce((sum, day) => sum + day.sales, 0)

  const maxDailySales = Math.max(...lastSevenDays.map((day) => day.sales), 1)

  const maxDailyValue = Math.max(

    ...lastSevenDays.flatMap((day) => [day.sales, day.expenses]),

    1

  )

  const chartPoints = lastSevenDays.map((day, index) => ({

    x: index * 100,

    y: 160 - (day.sales / maxDailyValue) * 140,

  }))

  const chartLinePath = chartPoints

    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)

    .join(' ')

  const expenseChartPoints = lastSevenDays.map((day, index) => ({

    x: index * 100,

    y: 160 - (day.expenses / maxDailyValue) * 140,

  }))

  const expenseLinePath = expenseChartPoints

    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)

    .join(' ')

  const chartAreaPath = `${chartLinePath} L600 180 L0 180 Z`

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  const popularProducts = Object.values(

    transactions.reduce((result, transaction) => {

      ;(transaction.items || []).forEach((item) => {

        const key = item.name || String(item.product || 'Produk')

        if (!result[key]) {

          result[key] = {

            name: key,

            quantity: 0,

            revenue: 0,

            type: item.category || 'Menu',

          }

        }

        result[key].quantity += Number(item.quantity) || 0

        result[key].revenue += Number(item.subtotal) || (Number(item.price) || 0) * (Number(item.quantity) || 0)

      })

      return result

    }, {})

  ).sort((a, b) => b.quantity - a.quantity).slice(0, 4)

  if (authLoading) {

    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#526747', fontFamily: 'inherit' }}>Memeriksa sesi login nook...</div>

  }

  if (authError || !currentUser) {

    return (

      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f7f8f5', fontFamily: 'inherit' }}>

        <div style={{ maxWidth: 440, background: '#fff', padding: 28, borderRadius: 16, border: '1px solid #e8ebe5' }}>

          <h2 style={{ marginTop: 0, color: '#25372b' }}>Sesi login bermasalah</h2>

          <p style={{ color: '#778178' }}>{authError || 'Pengguna tidak ditemukan.'}</p>

          <button className="primary-btn" onClick={handleLogout}>Login kembali</button>

        </div>

      </div>

    )

  }

  return (

    <div className="layout">

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">

            <Coffee size={23} />

          </div>

          <div>

            <h2>nook<span>.</span></h2>

            <p>CAFE MANAGEMENT</p>

          </div>

        </div>

        <p className="nav-heading">MENU UTAMA</p>

        <nav>

          {isAdmin && <button

            className={`nav-link ${activePage === 'dashboard' ? 'active' : ''}`}

            onClick={() => setActivePage('dashboard')}

          >

            <LayoutDashboard />

            Dashboard

          </button>}

          <button

            className={`nav-link ${activePage === 'pos' ? 'active' : ''}`}

            onClick={() => setActivePage('pos')}

          >

            <ShoppingBag />

            Transaksi Kasir

          </button>

          {isAdmin && <button

            className={`nav-link ${activePage === 'products' ? 'active' : ''}`}

            onClick={() => setActivePage('products')}

          >

            <Coffee />

            Menu & Produk

          </button>}

          <button

            className={`nav-link ${activePage === 'history' ? 'active' : ''}`}

            onClick={() => setActivePage('history')}

          >

            <FileText />

            Riwayat Transaksi

          </button>

          {isAdmin && <button

            className={`nav-link ${activePage === 'reports' ? 'active' : ''}`}

            onClick={() => setActivePage('reports')}

          >

            <BarChart3 />

            Laporan Penjualan

          </button>}

          {isAdmin && <button

            className={`nav-link ${activePage === 'expenses' ? 'active' : ''}`}

            onClick={() => setActivePage('expenses')}

          >

            <Wallet />

            Pengeluaran

          </button>}

          {isAdmin && <button
            className={`nav-link ${activePage === 'users' ? 'active' : ''}`}
            onClick={() => setActivePage('users')}
          >
            <UsersRound size={19} />
            Manajemen Akun
          </button>}

        </nav>

        <div className="sidebar-footer">

          {isAdmin && <>

          <p className="nav-heading">PREFERENSI</p>

          <button className="nav-link">

            <Settings />

            Pengaturan

          </button>

          </>}

          <div className="user-profile">

            <div className="user-avatar">{userInitials}</div>

            <div>

              <strong>{userName}</strong>

              <small>{isAdmin ? 'Administrator' : 'Kasir'}</small>

            </div>

          </div>

          <button className="nav-link" onClick={handleLogout} style={{ marginTop: 10 }}>

            <LogOut />

            Keluar

          </button>

        </div>

      </aside>

      <main className="main">

        <header className="topbar">

          <div className="breadcrumb">

            Workspace <span>/</span>{' '}

            {activePage === 'dashboard'
              ? 'Dashboard'
              : activePage === 'products'
                ? 'Menu & Produk'
                : activePage === 'pos'
                  ? 'Transaksi Kasir'
                  : activePage === 'history'
                    ? 'Riwayat Transaksi'
                    : activePage === 'reports'
                      ? 'Laporan Penjualan'
                      : activePage === 'expenses'
                        ? 'Pengeluaran'
                        : activePage === 'users'
                          ? 'Manajemen Akun'
                          : 'Pengaturan'}

          </div>

          <div className="topbar-actions">

            <div className="branch">

              <span />

              Cabang Utama

              <ChevronDown size={14} />

            </div>

            <button className="icon-btn" aria-label="Cari">

              <Search />

            </button>

            <button className="icon-btn" aria-label="Notifikasi">

              <Bell />

            </button>

            <div className="user-avatar">{userInitials}</div>

          </div>

        </header>

        {activePage === 'products' ? (

          <Products />

        ) : activePage === 'pos' ? (

          <POS />

        ) : activePage === 'history' ? (

          <History />

        ) : activePage === 'reports' && isAdmin ? (

          <Reports />

        ) : activePage === 'expenses' && isAdmin ? (

          <Expenses />

        ) : activePage === 'users' && isAdmin ? (

          <Users />

        ) : (

          <div className="content">

            <section className="welcome">

              <div>

                <div className="eyebrow">CAFE OVERVIEW</div>

                <h1>

                  Selamat pagi, {isAdmin ? 'Admin' : 'Kasir'} <span>✳</span>

                </h1>

                <p>Ini ringkasan aktivitas kafe kamu hari ini.</p>

              </div>

              <button

                className="primary-btn"

                onClick={() => setActivePage('pos')}

              >

                <Plus size={18} />

                Transaksi Baru

              </button>

            </section>

            <section className="stats">

              <Stat icon={Wallet} label="Total Penjualan" value={formatRupiah(totalSales)} trend="Data aktual" />

              <Stat icon={Receipt} label="Total Transaksi" value={String(totalTransactions)} trend="Data aktual" />

              <Stat icon={TrendingUp} label="Rata-rata Pesanan" value={formatRupiah(averageOrder)} trend="Data aktual" />

              <Stat icon={Clock3} label="Transaksi Hari Ini" value={String(todayTransactions)} trend="Hari ini" />

              <Stat

                icon={Wallet}

                label="Pengeluaran Hari Ini"

                value={formatRupiah(todayExpenses)}

                trend="Hari ini"

              />

              <Stat

                icon={TrendingUp}

                label="Pengeluaran Bulan Ini"

                value={formatRupiah(monthlyExpenses)}

                trend="Bulan ini"

              />

              <Stat

                icon={Receipt}

                label="Estimasi Laba Bersih Bulan Ini"

                value={formatRupiah(monthlyNetProfit)}

                trend="Penjualan - Pengeluaran"

              />

            </section>

            <section className="middle-grid">

              <div className="panel">

                <div className="panel-heading">

                  <div>

                    <h3>Ringkasan Penjualan</h3>

                    <p>Performa penjualan kafe kamu</p>

                  </div>

                  <button className="select-btn">

                    7 hari terakhir <ChevronDown size={14} />

                  </button>

                </div>

                <div className="sales-number">

                  <strong>{formatRupiah(weeklySales)}</strong>

                  <span>

                    <ArrowUpRight size={15} />

                    7 hari

                  </span>

                </div>

                <p className="muted">Total penjualan 7 hari terakhir</p>

                <div className="chart">

                  <div className="chart-labels">
                    {[1, 0.8, 0.6, 0.4, 0.2].map((ratio) => (
                      <span key={ratio}>
                        {new Intl.NumberFormat('id-ID', {
                          notation: 'compact',
                          maximumFractionDigits: 1,
                        }).format(maxDailyValue * ratio)}
                      </span>
                    ))}
                  </div>

                  <svg

                    viewBox="0 0 600 180"

                    preserveAspectRatio="none"

                    role="img"

                    aria-label="Ilustrasi grafik penjualan"

                  >

                    <defs>

                      <linearGradient

                        id="fill"

                        x1="0"

                        y1="0"

                        x2="0"

                        y2="1"

                      >

                        <stop

                          offset="0%"

                          stopColor="#899875"

                          stopOpacity=".3"

                        />

                        <stop

                          offset="100%"

                          stopColor="#899875"

                          stopOpacity="0"

                        />

                      </linearGradient>

                    </defs>

                    <path d={chartAreaPath} fill="url(#fill)" />

                    <path

                      d={chartLinePath}

                      fill="none"

                      stroke="#7d8b62"

                      strokeWidth="3"

                      vectorEffect="non-scaling-stroke"

                    />

                    <path

                      d={expenseLinePath}

                      fill="none"

                      stroke="#d97757"

                      strokeWidth="3"

                      strokeDasharray="6 4"

                      vectorEffect="non-scaling-stroke"

                    />

                  </svg>

                  <div className="chart-days">

                    {lastSevenDays.map((day, index) => (

                      <span key={day.date.toISOString()} title={formatRupiah(day.sales)}>

                        {dayNames[day.date.getDay()]}

                      </span>

                    ))}

                  </div>

                  <div className="chart-legend">

                    <span><i className="legend-sales" /> Penjualan</span>

                    <span><i className="legend-expenses" /> Pengeluaran</span>

                  </div>

                </div>

              </div>

              <div className="panel popular">

                <div className="panel-heading">

                  <div>

                    <h3>Menu Terlaris</h3>

                    <p>Favorit pelanggan</p>

                  </div>

                  <button className="more-btn" aria-label="Lainnya">

                    <MoreHorizontal />

                  </button>

                </div>

                {popularProducts.length === 0 ? (

                  <p className="muted">Belum ada data menu terjual.</p>

                ) : (

                  popularProducts.map((product, index) => (

                    <Popular

                      key={product.name}

                      emoji={['☕', '🍵', '🥐', '🍰'][index]}

                      name={product.name}

                      type={product.type}

                      sold={`${product.quantity} terjual`}

                      price={formatRupiah(product.revenue)}

                    />

                  ))

                )}

              </div>

            </section>

            <section className="panel transaction-panel">

              <div className="panel-heading">

                <div>

                  <h3>Transaksi Terbaru</h3>

                  <p>Aktivitas pesanan terbaru di kafe</p>

                </div>

                <button

                  className="link-btn"

                  onClick={() => setActivePage('history')}

                >

                  Lihat semua <ArrowUpRight size={15} />

                </button>

              </div>

              <div className="table-scroll">

                <table>

                  <thead>

                    <tr>

                      <th>ID TRANSAKSI</th>

                      <th>PELANGGAN</th>

                      <th>ITEM PESANAN</th>

                      <th>TOTAL</th>

                      <th>STATUS</th>

                    </tr>

                  </thead>

                  <tbody>

                    {loadingTransactions ? (

                      <tr><td colSpan={5}>Memuat transaksi...</td></tr>

                    ) : transactionError ? (

                      <tr><td colSpan={5}>{transactionError}</td></tr>

                    ) : transactions.length === 0 ? (

                      <tr><td colSpan={5}>Belum ada transaksi.</td></tr>

                    ) : (

                      [...transactions]

                        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

                        .slice(0, 5)

                        .map((t) => (

                          <tr key={t._id}>

                            <td className="id-cell">#{String(t._id).slice(-6).toUpperCase()}</td>

                            <td>{t.customer || 'Pelanggan umum'}</td>

                            <td className="muted">

                              {(t.items || []).map((item) => `${item.name} x${item.quantity}`).join(', ')}

                            </td>

                            <td className="amount">{formatRupiah(t.total)}</td>

                            <td>

                              <span className="status success">{t.status || 'Selesai'}</span>

                            </td>

                          </tr>

                        ))

                    )}

                  </tbody>

                </table>

              </div>

            </section>

            <footer>

              © 2026 nook. Cafe Management

              <span>Made for better coffee days.</span>

            </footer>

          </div>

        )}

      </main>

    </div>

  )

}

function Stat({ icon: Icon, label, value, trend }) {

  return (

    <div className="stat-card">

      <div className="stat-heading">

        <span>{label}</span>

        <div className="stat-icon">

          <Icon size={19} />

        </div>

      </div>

      <strong className="stat-value">{value}</strong>

      <div className="stat-trend">

        <span>↗ {trend}</span>

        <small> dibanding kemarin</small>

      </div>

    </div>

  )

}

function Popular({ emoji, name, type, sold, price }) {

  return (

    <div className="popular-item">

      <div className="food-icon">{emoji}</div>

      <div className="food-detail">

        <strong>{name}</strong>

        <small>{type} · {sold}</small>

      </div>

      <strong className="food-price">{price}</strong>

    </div>

  )

}

export default App
