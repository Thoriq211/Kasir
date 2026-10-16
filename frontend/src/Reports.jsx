import { useEffect, useMemo, useState } from 'react'

import {

  RefreshCw,

  Download,

  TrendingUp,

  Receipt,

  Wallet,

  ShoppingBasket,

  TrendingDown,

  PiggyBank,

} from 'lucide-react'

const TRANSACTIONS_URL = 'http://localhost:5000/api/transactions'

const EXPENSES_URL = 'http://localhost:5000/api/expenses'

const money = (value) => new Intl.NumberFormat('id-ID', {

  style: 'currency',

  currency: 'IDR',

  maximumFractionDigits: 0,

}).format(Number(value) || 0)

const getDate = (record) => {

  const raw = record.createdAt || record.date || record.transactionDate

  if (!raw) return null

  const date = new Date(raw)

  return Number.isNaN(date.getTime()) ? null : date

}

const getTotal = (transaction) => Number(transaction.total ?? transaction.totalAmount ?? 0) || 0

const getItems = (transaction) => Array.isArray(transaction.items) ? transaction.items : []

const getExpenseAmount = (expense) => Number(expense.amount ?? 0) || 0

const dateKey = (date) => {

  if (!date) return ''

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

}

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

export default function Reports() {

  const [transactions, setTransactions] = useState([])

  const [expenses, setExpenses] = useState([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [startDate, setStartDate] = useState('')

  const [endDate, setEndDate] = useState('')

  const loadReportData = async () => {

    setLoading(true)

    setError('')

    try {

      const token = sessionStorage.getItem('nook_token')
      if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
      const authHeaders = { Authorization: `Bearer ${token}` }

      const [transactionsResponse, expensesResponse] = await Promise.all([
        fetch(TRANSACTIONS_URL, { headers: authHeaders }),
        fetch(EXPENSES_URL, { headers: authHeaders }),
      ])

      if (!transactionsResponse.ok) {

        throw new Error('Gagal mengambil data transaksi dari server.')

      }

      if (!expensesResponse.ok) {

        throw new Error('Gagal mengambil data pengeluaran dari server.')

      }

      const [transactionsData, expensesData] = await Promise.all([

        transactionsResponse.json(),

        expensesResponse.json(),

      ])

      setTransactions(

        Array.isArray(transactionsData)

          ? transactionsData

          : Array.isArray(transactionsData.transactions)

            ? transactionsData.transactions

            : [],

      )

      setExpenses(

        Array.isArray(expensesData)

          ? expensesData

          : Array.isArray(expensesData.expenses)

            ? expensesData.expenses

            : [],

      )

    } catch (err) {

      setError(err.message || 'Tidak dapat terhubung ke server.')

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {

    loadReportData()

  }, [])

  const filteredTransactions = useMemo(() => transactions.filter((transaction) => {

    const date = getDate(transaction)

    if (!date) return !startDate && !endDate

    const day = dateKey(date)

    return (!startDate || day >= startDate) && (!endDate || day <= endDate)

  }), [transactions, startDate, endDate])

  const filteredExpenses = useMemo(() => expenses.filter((expense) => {

    const date = getDate(expense)

    if (!date) return !startDate && !endDate

    const day = dateKey(date)

    return (!startDate || day >= startDate) && (!endDate || day <= endDate)

  }), [expenses, startDate, endDate])

  const summary = useMemo(() => {

    const revenue = filteredTransactions.reduce((sum, transaction) => sum + getTotal(transaction), 0)

    const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + getExpenseAmount(expense), 0)

    const itemCount = filteredTransactions.reduce((sum, transaction) => (

      sum + getItems(transaction).reduce((subtotal, item) => subtotal + (Number(item.quantity) || 0), 0)

    ), 0)

    return {

      revenue,

      expenseTotal,

      netProfit: revenue - expenseTotal,

      count: filteredTransactions.length,

      average: filteredTransactions.length ? revenue / filteredTransactions.length : 0,

      itemCount,

      expenseCount: filteredExpenses.length,

    }

  }, [filteredTransactions, filteredExpenses])

  const daily = useMemo(() => {

    const grouped = new Map()

    filteredTransactions.forEach((transaction) => {

      const date = getDate(transaction)

      if (!date) return

      const key = dateKey(date)

      const current = grouped.get(key) || { sales: 0, expenses: 0 }

      current.sales += getTotal(transaction)

      grouped.set(key, current)

    })

    filteredExpenses.forEach((expense) => {

      const date = getDate(expense)

      if (!date) return

      const key = dateKey(date)

      const current = grouped.get(key) || { sales: 0, expenses: 0 }

      current.expenses += getExpenseAmount(expense)

      grouped.set(key, current)

    })

    return [...grouped.entries()]

      .sort(([a], [b]) => a.localeCompare(b))

      .slice(-7)

  }, [filteredTransactions, filteredExpenses])

  const exportCsv = () => {

    const rows = [

      ['Jenis Data', 'ID', 'Tanggal', 'Nama/Keterangan', 'Kategori/Metode', 'Jumlah Item', 'Pemasukan (IDR)', 'Pengeluaran (IDR)', 'Status/Catatan'],

      ...filteredTransactions.map((transaction) => [

        'Penjualan',

        transaction._id || transaction.id || '',

        getDate(transaction)?.toLocaleString('id-ID') || '',

        transaction.customer || 'Pelanggan Umum',

        transaction.payment ?? transaction.paymentMethod ?? '',

        getItems(transaction).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),

        getTotal(transaction),

        0,

        transaction.status || '',

      ]),

      ...filteredExpenses.map((expense) => [

        'Pengeluaran',

        expense._id || expense.id || '',

        getDate(expense)?.toLocaleString('id-ID') || '',

        expense.title || '',

        expense.category || '',

        '',

        0,

        getExpenseAmount(expense),

        expense.note || '',

      ]),

      ['', '', '', '', '', '', '', '', ''],

      ['RINGKASAN', '', '', '', '', '', 'Total Pemasukan', summary.revenue, ''],

      ['', '', '', '', '', '', 'Total Pengeluaran', summary.expenseTotal, ''],

      ['', '', '', '', '', '', 'Estimasi Laba Bersih', summary.netProfit, ''],

    ]

    const csv = '\uFEFF' + rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))

    const link = document.createElement('a')

    link.href = url

    link.download = `laporan-keuangan-${new Date().toISOString().slice(0, 10)}.csv`

    document.body.appendChild(link)

    link.click()

    link.remove()

    URL.revokeObjectURL(url)

  }

  const maxDaily = Math.max(...daily.flatMap(([, values]) => [values.sales, values.expenses]), 1)

  const cardStyle = {

    background: '#fff',

    border: '1px solid #e8ebe5',

    borderRadius: 16,

    padding: 20,

    minWidth: 0,

  }

  const buttonStyle = {

    display: 'inline-flex',

    alignItems: 'center',

    gap: 8,

    border: '1px solid #dce2d8',

    background: '#fff',

    color: '#25372b',

    borderRadius: 10,

    padding: '10px 13px',

    cursor: 'pointer',

    fontWeight: 600,

  }

  const inputStyle = {

    border: '1px solid #dce2d8',

    borderRadius: 10,

    padding: '10px 12px',

    color: '#25372b',

    background: '#fff',

  }

  return (

    <main style={{ padding: 28, color: '#25372b', background: '#f7f8f5', minHeight: '100%', fontFamily: 'inherit' }}>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>

        <div>

          <p style={{ color: '#7a867b', fontSize: 12, letterSpacing: 1.5, fontWeight: 700, margin: '0 0 8px' }}>BUSINESS INSIGHTS</p>

          <h1 style={{ fontSize: 28, margin: 0, fontWeight: 750 }}>Laporan Keuangan</h1>

          <p style={{ color: '#778178', margin: '8px 0 0' }}>Pantau pemasukan, pengeluaran, dan estimasi laba berdasarkan data tersimpan.</p>

        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

          <button type="button" style={buttonStyle} onClick={loadReportData} disabled={loading}>

            <RefreshCw size={16} /> {loading ? 'Memuat...' : 'Muat Ulang'}

          </button>

          <button type="button" style={{ ...buttonStyle, background: '#526747', color: '#fff', borderColor: '#526747' }} onClick={exportCsv} disabled={!filteredTransactions.length && !filteredExpenses.length}>

            <Download size={16} /> Ekspor CSV

          </button>

        </div>

      </header>

      <section style={{ ...cardStyle, display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>

        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#667267' }}>

          Dari tanggal

          <input style={inputStyle} type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} />

        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#667267' }}>

          Sampai tanggal

          <input style={inputStyle} type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />

        </label>

        <button type="button" style={buttonStyle} onClick={() => { setStartDate(''); setEndDate('') }}>Reset Filter</button>

        <span style={{ color: '#778178', fontSize: 13, marginLeft: 'auto' }}>

          {filteredTransactions.length} transaksi · {filteredExpenses.length} pengeluaran

        </span>

      </section>

      {error && (

        <div role="alert" style={{ ...cardStyle, color: '#a52d2d', marginBottom: 18 }}>

          {error} <span style={{ color: '#667267' }}>Pastikan backend berjalan di localhost:5000 dan endpoint transaksi serta pengeluaran tersedia.</span>

        </div>

      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', gap: 14, marginBottom: 18 }}>

        {[

          { label: 'Total Pemasukan', value: money(summary.revenue), icon: Wallet, color: '#526747' },

          { label: 'Total Pengeluaran', value: money(summary.expenseTotal), icon: TrendingDown, color: '#b66a3c' },

          { label: 'Estimasi Laba Bersih', value: money(summary.netProfit), icon: PiggyBank, color: summary.netProfit < 0 ? '#b42318' : '#526747' },

          { label: 'Total Transaksi', value: summary.count.toLocaleString('id-ID'), icon: Receipt, color: '#526747' },

          { label: 'Rata-rata Transaksi', value: money(summary.average), icon: TrendingUp, color: '#526747' },

          { label: 'Item Terjual', value: summary.itemCount.toLocaleString('id-ID'), icon: ShoppingBasket, color: '#526747' },

        ].map(({ label, value, icon: Icon, color }) => (

          <article key={label} style={cardStyle}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#778178', fontSize: 13, marginBottom: 16, gap: 8 }}>

              <span>{label}</span>

              <span style={{ background: '#eef2e9', color, padding: 9, borderRadius: 10, display: 'inline-flex', flexShrink: 0 }}><Icon size={18} /></span>

            </div>

            <strong style={{ display: 'block', fontSize: 23, letterSpacing: -0.5, overflowWrap: 'anywhere' }}>{value}</strong>

          </article>

        ))}

      </section>

      <section style={{ ...cardStyle, marginBottom: 18 }}>

        <div style={{ marginBottom: 20 }}>

          <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Pemasukan vs Pengeluaran Harian</h2>

          <p style={{ color: '#778178', fontSize: 13, margin: 0 }}>Maksimal 7 tanggal terakhir yang memiliki pemasukan atau pengeluaran dalam filter.</p>

        </div>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18, fontSize: 12, color: '#667267' }}>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#879a72' }} /> Pemasukan</span>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#d99569' }} /> Pengeluaran</span>

        </div>

        {loading ? <p style={{ color: '#778178' }}>Memuat data laporan...</p> : daily.length === 0 ? <p style={{ color: '#778178' }}>Belum ada pemasukan atau pengeluaran pada periode ini.</p> : (

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))`, alignItems: 'end', gap: 12, minHeight: 210 }}>

            {daily.map(([day, values]) => (

              <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0, minHeight: 190, justifyContent: 'end' }}>

                <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'center', gap: 5, width: '100%', height: 130 }}>

                  <div title={`Pemasukan ${day}: ${money(values.sales)}`} style={{ width: 'min(42%, 38px)', height: `${Math.max(values.sales ? 5 : 0, values.sales / maxDaily * 112)}px`, background: '#879a72', borderRadius: '6px 6px 2px 2px' }} />

                  <div title={`Pengeluaran ${day}: ${money(values.expenses)}`} style={{ width: 'min(42%, 38px)', height: `${Math.max(values.expenses ? 5 : 0, values.expenses / maxDaily * 112)}px`, background: '#d99569', borderRadius: '6px 6px 2px 2px' }} />

                </div>

                <span style={{ fontSize: 11, color: '#778178' }}>{day.slice(8, 10)}/{day.slice(5, 7)}</span>

              </div>

            ))}

          </div>

        )}

      </section>

      <section style={{ ...cardStyle, marginBottom: 18 }}>

        <div style={{ marginBottom: 16 }}>

          <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Rincian Transaksi Penjualan</h2>

          <p style={{ color: '#778178', fontSize: 13, margin: 0 }}>Daftar transaksi yang tercatat pada periode terpilih.</p>

        </div>

        {loading ? <p style={{ color: '#778178' }}>Memuat transaksi...</p> : filteredTransactions.length === 0 ? <p style={{ color: '#778178' }}>Tidak ada transaksi untuk ditampilkan.</p> : (

          <div style={{ overflowX: 'auto' }}>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>

              <thead><tr>{['ID TRANSAKSI', 'TANGGAL', 'PELANGGAN', 'ITEM', 'TOTAL'].map((heading) => <th key={heading} style={{ textAlign: 'left', padding: '12px 10px', color: '#778178', fontSize: 11, letterSpacing: 0.7, borderBottom: '1px solid #e8ebe5' }}>{heading}</th>)}</tr></thead>

              <tbody>{[...filteredTransactions].sort((a, b) => (getDate(b)?.getTime() || 0) - (getDate(a)?.getTime() || 0)).map((transaction) => {

                const id = transaction._id || transaction.id || '-'

                const date = getDate(transaction)

                const quantity = getItems(transaction).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

                return (

                  <tr key={id}>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb', fontWeight: 650 }}>{String(id).slice(-8).toUpperCase()}</td>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb', whiteSpace: 'nowrap' }}>{date ? date.toLocaleString('id-ID') : '-'}</td>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb' }}>{transaction.customer || 'Pelanggan Umum'}</td>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb' }}>{quantity}</td>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(getTotal(transaction))}</td>

                  </tr>

                )

              })}</tbody>

            </table>

          </div>

        )}

      </section>

      <section style={cardStyle}>

        <div style={{ marginBottom: 16 }}>

          <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Rincian Pengeluaran</h2>

          <p style={{ color: '#778178', fontSize: 13, margin: 0 }}>Pengeluaran yang dicatat pada periode terpilih.</p>

        </div>

        {loading ? <p style={{ color: '#778178' }}>Memuat pengeluaran...</p> : filteredExpenses.length === 0 ? <p style={{ color: '#778178' }}>Tidak ada pengeluaran untuk ditampilkan.</p> : (

          <div style={{ overflowX: 'auto' }}>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>

              <thead><tr>{['TANGGAL', 'KETERANGAN', 'KATEGORI', 'CATATAN', 'JUMLAH'].map((heading) => <th key={heading} style={{ textAlign: 'left', padding: '12px 10px', color: '#778178', fontSize: 11, letterSpacing: 0.7, borderBottom: '1px solid #e8ebe5' }}>{heading}</th>)}</tr></thead>

              <tbody>{[...filteredExpenses].sort((a, b) => (getDate(b)?.getTime() || 0) - (getDate(a)?.getTime() || 0)).map((expense) => {

                const id = expense._id || expense.id || `${expense.title}-${expense.date}`

                const date = getDate(expense)

                return (

                  <tr key={id}>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb', whiteSpace: 'nowrap' }}>{date ? date.toLocaleDateString('id-ID') : '-'}</td>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb', fontWeight: 650 }}>{expense.title || '-'}</td>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb' }}>{expense.category || 'Lainnya'}</td>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb' }}>{expense.note || '-'}</td>

                    <td style={{ padding: '13px 10px', borderBottom: '1px solid #eef0eb', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(getExpenseAmount(expense))}</td>

                  </tr>

                )

              })}</tbody>

            </table>

          </div>

        )}

        <p style={{ margin: '16px 0 0', fontSize: 12, color: '#778178' }}>

          Catatan: estimasi laba bersih dihitung dari total pemasukan dikurangi pengeluaran yang dicatat. Biaya modal bahan per produk belum dihitung terpisah jika belum dimasukkan sebagai pengeluaran.

        </p>

      </section>

    </main>

  )

}
