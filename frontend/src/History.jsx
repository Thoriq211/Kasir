import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Receipt,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  CalendarDays,
  X,
} from 'lucide-react'

const API_URL = 'http://localhost:5000/api/transactions'

function formatRupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function escapeCsv(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\"': '&quot;',
    "'": '&#39;',
  })[character])
}

function History() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function loadTransactions() {
    setLoading(true)
    setError('')

    try {
      const token = sessionStorage.getItem("nook_token");

        if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
        }

        const response = await fetch(API_URL, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil transaksi.')
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.transactions)
          ? data.transactions
          : []

      setTransactions(
        [...list].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        )
      )
    } catch (err) {
      setError(err.message || 'Tidak dapat terhubung ke server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()

    return transactions.filter((transaction) => {
      const id = String(transaction._id || '').toLowerCase()
      const shortId = id.slice(-8)
      const customer = String(transaction.customer || 'Pelanggan Umum').toLowerCase()
      const matchesSearch = !query || id.includes(query) || shortId.includes(query) || customer.includes(query)

      const date = new Date(transaction.createdAt)
      if (Number.isNaN(date.getTime())) {
        return matchesSearch && !startDate && !endDate
      }

      const transactionDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const matchesStart = !startDate || transactionDay >= startDate
      const matchesEnd = !endDate || transactionDay <= endDate

      return matchesSearch && matchesStart && matchesEnd
    })
  }, [transactions, search, startDate, endDate])

  const filteredSales = filteredTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.total || 0),
    0
  )

  function resetFilters() {
    setSearch('')
    setStartDate('')
    setEndDate('')
  }

  function printReceipt(transaction) {
    const receiptWindow = window.open('', '_blank', 'width=420,height=720')

    if (!receiptWindow) {
      window.alert('Jendela cetak diblokir browser. Izinkan pop-up untuk mencetak struk.')
      return
    }

    const items = (transaction.items || []).map((item) => {
      const name = escapeHtml(item.name || 'Produk')
      const quantity = Number(item.quantity || 0)
      const price = Number(item.price || 0)
      const subtotal = Number(item.subtotal ?? price * quantity)
      return `<tr><td><div>${name}</div><small>${quantity} x ${formatRupiah(price)}</small></td><td class="right">${formatRupiah(subtotal)}</td></tr>`
    }).join('')

    const transactionId = escapeHtml(String(transaction._id || '').slice(-8).toUpperCase() || '-')
    const customer = escapeHtml(transaction.customer || 'Pelanggan Umum')
    const date = escapeHtml(formatDate(transaction.createdAt))
    const payment = formatRupiah(transaction.payment)
    const total = formatRupiah(transaction.total)
    const change = formatRupiah(transaction.change)

    receiptWindow.document.open()
    receiptWindow.document.write(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Struk ${transactionId}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #182b23; width: 320px; margin: 0 auto; padding: 20px 12px; font-size: 12px; }
  h1 { font-size: 22px; text-align: center; margin: 0 0 4px; letter-spacing: 1px; }
  .muted { color: #68776f; text-align: center; margin: 0 0 16px; }
  .meta { border-top: 1px dashed #9ba79f; border-bottom: 1px dashed #9ba79f; padding: 10px 0; margin: 12px 0; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 7px 0; vertical-align: top; }
  small { color: #68776f; display: block; margin-top: 3px; }
  .right { text-align: right; white-space: nowrap; }
  .totals { border-top: 1px dashed #9ba79f; margin-top: 8px; padding-top: 8px; line-height: 1.9; }
  .total { font-size: 15px; font-weight: bold; }
  .footer { text-align: center; margin-top: 20px; line-height: 1.6; }
  .print-btn { width: 100%; border: 0; padding: 10px; border-radius: 6px; background: #174d3b; color: white; font-weight: bold; margin-top: 16px; cursor: pointer; }
  @media print { body { width: 100%; padding: 0; } .print-btn { display: none; } }
</style>
</head>
<body>
  <h1>nook.</h1>
  <p class="muted">Bukti Pembayaran</p>
  <div class="meta"><div>ID Transaksi: <strong>${transactionId}</strong></div><div>Tanggal: ${date}</div><div>Pelanggan: ${customer}</div></div>
  <table><tbody>${items || '<tr><td>Tidak ada rincian item</td></tr>'}</tbody></table>
  <div class="totals">
    <div class="total">Total <span style="float:right">${total}</span></div>
    <div>Dibayar <span style="float:right">${payment}</span></div>
    <div>Kembalian <span style="float:right">${change}</span></div>
  </div>
  <div class="footer">Terima kasih atas kunjungan Anda!<br />Simpan struk ini sebagai bukti transaksi.</div>
  <button class="print-btn" onclick="window.print()">Cetak Struk</button>
</body>
</html>`)
    receiptWindow.document.close()
    receiptWindow.focus()
  }

  function exportCsv() {
    const headers = [
      'ID Transaksi',
      'Tanggal',
      'Pelanggan',
      'Item Pesanan',
      'Total',
      'Pembayaran',
      'Kembalian',
      'Status',
    ]

    const rows = filteredTransactions.map((transaction) => [
      transaction._id || '',
      formatDate(transaction.createdAt),
      transaction.customer || 'Pelanggan Umum',
      (transaction.items || [])
        .map((item) => `${item.name || 'Produk'} x${item.quantity || 0}`)
        .join('; '),
      Number(transaction.total || 0),
      Number(transaction.payment || 0),
      Number(transaction.change || 0),
      transaction.status || 'Selesai',
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n')
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `riwayat-transaksi-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="content">
      <section className="welcome">
        <div>
          <div className="eyebrow">TRANSACTION MANAGEMENT</div>
          <h1>Riwayat Transaksi</h1>
          <p>Lihat, cari, dan ekspor catatan transaksi yang sudah tersimpan.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="primary-btn" onClick={loadTransactions} disabled={loading}>
            <RefreshCw size={18} />
            {loading ? 'Memuat...' : 'Muat Ulang'}
          </button>
          <button
            className="primary-btn"
            onClick={exportCsv}
            disabled={loading || filteredTransactions.length === 0}
            style={{ background: '#eaf1ed', color: '#174d3b' }}
          >
            <Download size={18} />
            Ekspor CSV
          </button>
        </div>
      </section>

      <section className="stats">
        <div className="stat-card">
          <div className="stat-heading">
            <span>Transaksi Ditemukan</span>
            <div className="stat-icon"><Receipt size={19} /></div>
          </div>
          <strong className="stat-value">{filteredTransactions.length}</strong>
          <div className="stat-trend"><small>Dari {transactions.length} transaksi tersimpan</small></div>
        </div>
        <div className="stat-card">
          <div className="stat-heading">
            <span>Total Omzet Hasil Filter</span>
            <div className="stat-icon"><CalendarDays size={19} /></div>
          </div>
          <strong className="stat-value">{formatRupiah(filteredSales)}</strong>
          <div className="stat-trend"><small>Berdasarkan transaksi yang ditampilkan</small></div>
        </div>
      </section>

      <section className="panel transaction-panel">
        <div className="panel-heading" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3>Daftar Transaksi</h3>
            <p>Transaksi terbaru ditampilkan terlebih dahulu.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, padding: '0 20px 20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #d7e0da', borderRadius: 8, padding: '0 12px' }}>
            <Search size={18} color="#718078" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari ID atau pelanggan..."
              aria-label="Cari ID transaksi atau nama pelanggan"
              style={{ width: '100%', minWidth: 0, border: 0, outline: 0, padding: '12px 0', background: 'transparent' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: '#718078' }}>
            Tanggal mulai
            <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} style={{ padding: 10, border: '1px solid #d7e0da', borderRadius: 8, color: '#18352c' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: '#718078' }}>
            Tanggal akhir
            <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} style={{ padding: 10, border: '1px solid #d7e0da', borderRadius: 8, color: '#18352c' }} />
          </label>
          <button className="more-btn" onClick={resetFilters} title="Reset filter" aria-label="Reset filter" style={{ justifySelf: 'start', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px' }}>
            <X size={17} /> Reset filter
          </button>
        </div>

        {loading ? (
          <p style={{ padding: 20 }}>Memuat riwayat transaksi...</p>
        ) : error ? (
          <div style={{ padding: 20 }}>
            <p>{error}</p>
            <button className="primary-btn" onClick={loadTransactions}>Coba Lagi</button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <p style={{ padding: 20 }}>
            {transactions.length === 0
              ? 'Belum ada transaksi. Transaksi kasir yang berhasil disimpan akan muncul di sini.'
              : 'Tidak ada transaksi yang cocok dengan pencarian atau filter tanggal.'}
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID TRANSAKSI</th>
                  <th>WAKTU</th>
                  <th>PELANGGAN</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                  <th>DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  const id = transaction._id || `${transaction.createdAt}-${transaction.customer}`
                  const isExpanded = expandedId === id

                  return (
                    <Fragment key={id}>
                      <tr>
                        <td className="id-cell">{String(transaction._id || '').slice(-8).toUpperCase() || '-'}</td>
                        <td>{formatDate(transaction.createdAt)}</td>
                        <td>{transaction.customer || 'Pelanggan Umum'}</td>
                        <td className="amount">{formatRupiah(transaction.total)}</td>
                        <td><span className="status success">{transaction.status || 'Selesai'}</span></td>
                        <td>
                          <button className="more-btn" aria-label="Lihat detail transaksi" onClick={() => setExpandedId(isExpanded ? null : id)}>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6}>
                            <div style={{ padding: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                <strong>Rincian Pesanan</strong>
                                <button className="primary-btn" onClick={() => printReceipt(transaction)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                  <Receipt size={16} /> Cetak Struk
                                </button>
                              </div>
                              <div style={{ marginTop: 12 }}>
                                {(transaction.items || []).map((item, index) => (
                                  <div key={`${id}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0' }}>
                                    <span>{item.name || 'Produk'} × {item.quantity || 0}</span>
                                    <strong>{formatRupiah(item.subtotal ?? (Number(item.price || 0) * Number(item.quantity || 0)))}</strong>
                                  </div>
                                ))}
                              </div>
                              <div style={{ marginTop: 12 }}>
                                <p>Total: <strong>{formatRupiah(transaction.total)}</strong></p>
                                <p>Dibayar: <strong>{formatRupiah(transaction.payment)}</strong></p>
                                <p>Kembalian: <strong>{formatRupiah(transaction.change)}</strong></p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default History
