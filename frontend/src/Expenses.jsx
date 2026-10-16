import { useEffect, useMemo, useState } from 'react'

const API_URL = 'http://localhost:5000/api/expenses'

const categories = ['Bahan Baku', 'Operasional', 'Gaji', 'Peralatan', 'Listrik & Air', 'Lainnya']

const emptyForm = { title: '', category: 'Bahan Baku', amount: '', date: new Date().toISOString().slice(0, 10), note: '' }

const rupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0)

export default function Expenses() {

  const [expenses, setExpenses] = useState([])

  const [form, setForm] = useState(emptyForm)

  const [search, setSearch] = useState('')

  const [categoryFilter, setCategoryFilter] = useState('Semua')

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState(null)

  const loadExpenses = async () => {

    try {

      setLoading(true)

      const token = sessionStorage.getItem('nook_token')
      if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Gagal mengambil data pengeluaran. Pastikan endpoint backend sudah dibuat.')

      const data = await response.json()

      setExpenses(Array.isArray(data) ? data : data.expenses || [])

      setError('')

    } catch (err) { setError(err.message || 'Tidak dapat terhubung ke server.') }

    finally { setLoading(false) }

  }

  useEffect(() => { loadExpenses() }, [])

  const monthExpenses = useMemo(() => expenses.filter((item) => String(item.date || item.createdAt || '').slice(0, 7) === month), [expenses, month])

  const filtered = useMemo(() => monthExpenses.filter((item) => {

    const matchesSearch = `${item.title || ''} ${item.category || ''} ${item.note || ''}`.toLowerCase().includes(search.toLowerCase())

    return matchesSearch && (categoryFilter === 'Semua' || item.category === categoryFilter)

  }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)), [monthExpenses, search, categoryFilter])

  const total = monthExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const today = new Date().toISOString().slice(0, 10)

  const totalToday = expenses.filter((item) => String(item.date || item.createdAt || '').slice(0, 10) === today).reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const largestCategory = categories.map((category) => ({ category, amount: monthExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.amount || 0), 0) })).sort((a, b) => b.amount - a.amount)[0]

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const resetForm = () => { setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) }); setEditingId(null) }

  const handleSubmit = async (event) => {

    event.preventDefault()

    if (!form.title.trim() || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) { setError('Isi nama pengeluaran dan nominal yang valid.'); return }

    try {

      setSaving(true); setError('')

      const token = sessionStorage.getItem('nook_token')
      if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
      const response = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) throw new Error(data.message || 'Gagal menyimpan pengeluaran.')

      resetForm(); await loadExpenses()

    } catch (err) { setError(err.message || 'Terjadi kesalahan saat menyimpan.') }

    finally { setSaving(false) }

  }

  const editExpense = (item) => {

    setEditingId(item._id); setForm({ title: item.title || '', category: item.category || 'Lainnya', amount: String(item.amount || ''), date: String(item.date || item.createdAt || today).slice(0, 10), note: item.note || '' });

    window.scrollTo({ top: 0, behavior: 'smooth' })

  }

  const deleteExpense = async (item) => {

    if (!window.confirm(`Hapus pengeluaran "${item.title}"?`)) return

    try {
      const token = sessionStorage.getItem('nook_token')
      if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
      const response = await fetch(`${API_URL}/${item._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Gagal menghapus pengeluaran.')
      await loadExpenses()
    }

    catch (err) { setError(err.message || 'Terjadi kesalahan saat menghapus.') }

  }

  const exportCSV = () => {

    const rows = [['Tanggal', 'Nama Pengeluaran', 'Kategori', 'Nominal', 'Catatan'], ...filtered.map((item) => [String(item.date || item.createdAt || '').slice(0, 10), item.title, item.category, item.amount, item.note || ''])]

    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')

    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }))

    const link = document.createElement('a'); link.href = url; link.download = `pengeluaran-${month}.csv`; link.click(); URL.revokeObjectURL(url)

  }

  const styles = {

    page: { padding: '30px', color: '#18352c', background: '#f7f9f7', minHeight: '100vh', fontFamily: 'Arial, sans-serif' },

    card: { background: '#fff', border: '1px solid #e5ebe7', borderRadius: 14, padding: 22 },

    input: { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #d7e0da', borderRadius: 8, fontSize: 14, background: '#fff', color: '#18352c' },

    button: { border: 0, borderRadius: 8, padding: '11px 15px', fontWeight: 700, cursor: 'pointer' },

    label: { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#40584d' },

  }

  return <main style={styles.page}>

    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>

      <div><p style={{ color: '#668074', fontSize: 12, fontWeight: 700, letterSpacing: 1.4, margin: '0 0 7px' }}>KEUANGAN CAFE</p><h1 style={{ margin: 0, fontSize: 28 }}>Pengeluaran</h1><p style={{ color: '#73877d', margin: '8px 0 0' }}>Catat dan pantau biaya operasional cafe.</p></div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><input aria-label="Pilih bulan" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...styles.input, width: 160 }} /><button onClick={exportCSV} style={{ ...styles.button, background: '#e8f0eb', color: '#174d3b' }}>Ekspor CSV</button></div>

    </header>

    {error && <div role="alert" style={{ background: '#fff1ef', color: '#9b3026', border: '1px solid #f2c8c3', padding: 13, borderRadius: 9, marginBottom: 18 }}>{error}</div>}

    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 22 }}>

      {[{ label: 'Total Pengeluaran Bulan Ini', value: rupiah(total), detail: `${monthExpenses.length} catatan` }, { label: 'Pengeluaran Hari Ini', value: rupiah(totalToday), detail: 'Semua kategori' }, { label: 'Kategori Terbesar', value: largestCategory?.amount ? largestCategory.category : 'Belum ada', detail: rupiah(largestCategory?.amount || 0) }].map((item) => <div key={item.label} style={styles.card}><p style={{ margin: '0 0 12px', color: '#73877d', fontSize: 13 }}>{item.label}</p><div style={{ fontSize: 21, fontWeight: 800, overflowWrap: 'anywhere' }}>{item.value}</div><p style={{ margin: '9px 0 0', color: '#83948c', fontSize: 12 }}>{item.detail}</p></div>)}

    </section>

    <section style={{ ...styles.card, marginBottom: 22 }}>

      <h2 style={{ margin: '0 0 18px', fontSize: 18 }}>{editingId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15, alignItems: 'end' }}>

        <div><label style={styles.label}>Nama Pengeluaran *</label><input style={styles.input} value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Contoh: Beli biji kopi" required /></div>

        <div><label style={styles.label}>Kategori</label><select style={styles.input} value={form.category} onChange={(e) => updateField('category', e.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div>

        <div><label style={styles.label}>Nominal (Rp) *</label><input style={styles.input} type="number" min="1" step="1" value={form.amount} onChange={(e) => updateField('amount', e.target.value)} placeholder="50000" required /></div>

        <div><label style={styles.label}>Tanggal</label><input style={styles.input} type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} required /></div>

        <div style={{ gridColumn: '1 / -1' }}><label style={styles.label}>Catatan (opsional)</label><input style={styles.input} value={form.note} onChange={(e) => updateField('note', e.target.value)} placeholder="Tambahkan detail jika diperlukan" /></div>

        <div style={{ display: 'flex', gap: 9, gridColumn: '1 / -1' }}><button disabled={saving} type="submit" style={{ ...styles.button, background: '#174d3b', color: '#fff', opacity: saving ? .7 : 1 }}>{saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : '+ Simpan Pengeluaran'}</button>{editingId && <button type="button" onClick={resetForm} style={{ ...styles.button, background: '#edf1ee', color: '#385448' }}>Batal</button>}</div>

      </form>

    </section>

    <section style={styles.card}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 17 }}><div><h2 style={{ margin: '0 0 5px', fontSize: 18 }}>Riwayat Pengeluaran</h2><p style={{ margin: 0, color: '#7b8c83', fontSize: 13 }}>Data untuk bulan {month}</p></div><div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}><input style={{ ...styles.input, width: 210 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari pengeluaran..." aria-label="Cari pengeluaran" /><select style={{ ...styles.input, width: 160 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option>Semua</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div></div>

      {loading ? <p style={{ padding: 25, textAlign: 'center', color: '#72857a' }}>Memuat data pengeluaran...</p> : filtered.length === 0 ? <div style={{ padding: 35, textAlign: 'center', color: '#7b8c83' }}><div style={{ fontSize: 28, marginBottom: 8 }}>▤</div><strong>Belum ada pengeluaran</strong><p style={{ fontSize: 13 }}>Tambahkan catatan atau ubah filter pencarian.</p></div> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}><thead><tr>{['Tanggal', 'Pengeluaran', 'Kategori', 'Nominal', 'Catatan', 'Aksi'].map((label) => <th key={label} style={{ textAlign: 'left', padding: '12px 10px', color: '#7b8c83', fontSize: 12, borderBottom: '1px solid #e7ede9', whiteSpace: 'nowrap' }}>{label}</th>)}</tr></thead><tbody>{filtered.map((item) => <tr key={item._id}><td style={td}>{String(item.date || item.createdAt || '').slice(0, 10)}</td><td style={{ ...td, fontWeight: 700 }}>{item.title}</td><td style={td}><span style={{ background: '#edf4ef', color: '#285c45', padding: '5px 8px', borderRadius: 20, fontSize: 12 }}>{item.category}</span></td><td style={{ ...td, fontWeight: 700, whiteSpace: 'nowrap' }}>{rupiah(item.amount)}</td><td style={{ ...td, color: '#7b8c83' }}>{item.note || '—'}</td><td style={td}><div style={{ display: 'flex', gap: 8 }}><button onClick={() => editExpense(item)} style={{ border: 0, background: '#edf4ef', color: '#285c45', borderRadius: 6, padding: '7px 9px', cursor: 'pointer' }}>Edit</button><button onClick={() => deleteExpense(item)} style={{ border: 0, background: '#fff0ee', color: '#a03c32', borderRadius: 6, padding: '7px 9px', cursor: 'pointer' }}>Hapus</button></div></td></tr>)}</tbody></table></div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid #e7ede9' }}><span style={{ color: '#7b8c83', fontSize: 13 }}>{filtered.length} catatan ditampilkan</span><strong>Total hasil filter: {rupiah(filtered.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong></div>

    </section>

  </main>

}

const td = { padding: '14px 10px', borderBottom: '1px solid #edf1ee', fontSize: 13, verticalAlign: 'middle' }
