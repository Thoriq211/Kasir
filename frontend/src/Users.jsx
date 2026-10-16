import { useCallback, useEffect, useState } from 'react'
import {
  UserPlus,
  RefreshCw,
  ShieldCheck,
  UserRound,
  CircleCheck,
  CircleX,
  Pencil,
  Trash2,
} from 'lucide-react'

const API = 'http://localhost:5000/api/auth/users'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [branchNameInput, setBranchNameInput] = useState('')

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier',
    branchName: '',
  })

  const token = () => sessionStorage.getItem('nook_token')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(API, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil daftar akun.')
      }

      setUsers(Array.isArray(data) ? data : data.users || [])
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar akun.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const username = form.username.trim().toLowerCase()

      if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
        throw new Error(
          'Username harus 3–30 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.'
        )
      }

      if (form.password.length < 8) {
        throw new Error('Password minimal 8 karakter.')
      }

      if (form.role === 'cashier' && !form.branchName.trim()) {
        throw new Error('Nama cabang wajib diisi untuk akun kasir.')
      }

      const payload = {
        name: form.name.trim(),
        username,
        password: form.password,
        role: form.role,
        branchName: form.role === 'cashier' ? form.branchName.trim() : '',
      }

      const response = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Gagal membuat akun.')
      }

      setMessage('Akun berhasil dibuat.')
      setForm({
        name: '',
        username: '',
        password: '',
        role: 'cashier',
        branchName: '',
      })
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat membuat akun.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user) => {
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API}/${user._id}/active`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ active: user.active === false }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengubah status akun.')
      }

      setMessage(`Status akun ${user.name || user.username} berhasil diperbarui.`)
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Gagal mengubah status akun.')
    }
  }

  const deleteUser = async (user) => {
    const confirmed = window.confirm(
      `Hapus akun ${user.name || user.username}? Tindakan ini tidak dapat dibatalkan.`
    )
    if (!confirmed) return

    setError('')
    setMessage('')
    setSaving(true)

    try {
      const response = await fetch(`${API}/${user._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Gagal menghapus akun.')
      }

      if (editingBranch?._id === user._id) {
        setEditingBranch(null)
        setBranchNameInput('')
      }

      setMessage(`Akun ${user.name || user.username} berhasil dihapus.`)
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Gagal menghapus akun.')
    } finally {
      setSaving(false)
    }
  }

  const startEditBranch = (user) => {
    setEditingBranch(user)
    setBranchNameInput(user.branchName || '')
    setError('')
    setMessage('')
  }

  const saveUserBranch = async (event) => {
    event.preventDefault()

    if (!editingBranch) return

    const branchName = branchNameInput.trim()
    if (!branchName) {
      setError('Nama cabang wajib diisi.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API}/${editingBranch._id}/branch`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ branchName }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengubah cabang akun.')
      }

      setEditingBranch(null)
      setBranchNameInput('')
      setMessage(`Cabang akun ${editingBranch.name} berhasil diperbarui.`)
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Gagal mengubah cabang akun.')
    } finally {
      setSaving(false)
    }
  }

  const activeCount = users.filter((user) => user.active !== false).length
  const inactiveCount = users.length - activeCount
  const activeAdminCount = users.filter(
    (user) => user.role === 'admin' && user.active !== false
  ).length

  return (
    <div className="content" style={{ display: 'grid', gap: 22 }}>
      <section className="welcome">
        <div>
          <div className="eyebrow">PENGATURAN AKSES</div>
          <h1>Manajemen Akun <span>✳</span></h1>
          <p>Kelola akun administrator, kasir, dan cabang penempatan.</p>
        </div>
        <button className="primary-btn" onClick={loadUsers} disabled={loading}>
          <RefreshCw size={17} /> Muat ulang
        </button>
      </section>

      <section
        className="stats"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
      >
        <div className="stat-card">
          <div className="stat-heading">
            <span>Total Akun</span>
            <div className="stat-icon"><UserRound size={19} /></div>
          </div>
          <strong className="stat-value">{users.length}</strong>
          <div className="stat-trend">Pengguna terdaftar</div>
        </div>

        <div className="stat-card">
          <div className="stat-heading">
            <span>Akun Aktif</span>
            <div className="stat-icon"><CircleCheck size={19} /></div>
          </div>
          <strong className="stat-value">{activeCount}</strong>
          <div className="stat-trend">Dapat masuk ke aplikasi</div>
        </div>

        <div className="stat-card">
          <div className="stat-heading">
            <span>Akun Nonaktif</span>
            <div className="stat-icon"><CircleX size={19} /></div>
          </div>
          <strong className="stat-value">{inactiveCount}</strong>
          <div className="stat-trend">Akses dinonaktifkan</div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: '#fff0ed',
            color: '#a43e2b',
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: '#edf7eb',
            color: '#42643b',
          }}
        >
          {message}
        </div>
      )}

      {editingBranch && (
        <section className="panel" style={{ padding: 24 }}>
          <div className="panel-heading">
            <div>
              <h3>Edit Cabang Kasir</h3>
              <p>
                Akun: {editingBranch.name} (@{editingBranch.username})
              </p>
            </div>
              <Pencil size={22} />
          </div>

          <form
            onSubmit={saveUserBranch}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 16,
              marginTop: 20,
            }}
          >
            <label style={labelStyle}>
              Nama cabang
              <input
                required
                maxLength={100}
                value={branchNameInput}
                onChange={(event) => setBranchNameInput(event.target.value)}
                placeholder="Contoh: Cabang Jagakarsa"
                style={inputStyle}
              />
            </label>

            <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
              <button
                className="primary-btn"
                type="submit"
                disabled={saving || !branchNameInput.trim()}
              >
                {saving ? 'Menyimpan...' : 'Simpan Cabang'}
              </button>
              <button
                type="button"
                className="link-btn"
                disabled={saving}
                onClick={() => {
                  setEditingBranch(null)
                  setBranchNameInput('')
                }}
              >
                Batal
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel" style={{ padding: 24 }}>
        <div className="panel-heading">
          <div>
            <h3>Tambah Akun Baru</h3>
            <p>Tentukan role dan cabang penempatan akun.</p>
          </div>
          <UserPlus size={22} />
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 16,
            marginTop: 20,
          }}
        >
          <label style={labelStyle}>
            Nama lengkap
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Contoh: Kasir Cafe"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Username
            <input
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9._-]+"
              title="Gunakan 3–30 karakter: huruf, angka, titik, garis bawah, atau tanda hubung."
              autoComplete="off"
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
              placeholder="Contoh: kasirdepok"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Password
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Minimal 8 karakter"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Role
            <select
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value }))
              }
              style={inputStyle}
            >
              <option value="cashier">Kasir</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {form.role === 'cashier' && (
            <label style={labelStyle}>
              Cabang penempatan
              <input
                required
                maxLength={100}
                value={form.branchName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    branchName: event.target.value,
                  }))
                }
                placeholder="Contoh: Cabang Jagakarsa"
                style={inputStyle}
              />
            </label>
          )}

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              className="primary-btn"
              type="submit"
              disabled={
                saving ||
                loading ||
                (form.role === 'cashier' && !form.branchName.trim())
              }
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <UserPlus size={17} />
              {saving ? 'Menyimpan...' : 'Buat Akun'}
            </button>
          </div>
        </form>

        <p
          style={{
            color: '#7b847a',
            fontSize: 12,
            marginBottom: 0,
            marginTop: 14,
          }}
        >
          Username unik, 3–30 karakter. Password minimal 8 karakter.
          Nama cabang kasir dapat diketik langsung.
        </p>
      </section>

      <section className="panel" style={{ padding: 24 }}>
        <div className="panel-heading">
          <div>
            <h3>Daftar Pengguna</h3>
            <p>Periksa username, cabang penempatan, dan status akses setiap akun.</p>
          </div>
          <ShieldCheck size={22} />
        </div>

        <div className="table-scroll" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>NAMA</th>
                <th>USERNAME</th>
                <th>ROLE</th>
                <th>CABANG</th>
                <th>STATUS</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6">Memuat akun...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6">Belum ada akun pengguna.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td><strong>{user.name || 'Tanpa nama'}</strong></td>
                    <td>{user.username || 'Belum ada username'}</td>
                    <td>{user.role === 'admin' ? 'Admin' : 'Kasir'}</td>
                    <td>
                      {user.branchName ||
                        (user.role === 'admin' ? 'Semua cabang' : 'Belum ditetapkan')}
                    </td>
                    <td>
                      <span className={`status ${user.active === false ? '' : 'success'}`}>
                        {user.active === false ? 'Nonaktif' : 'Aktif'}
                      </span>
                    </td>
                    <td>
                      {user.role === 'cashier' && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => startEditBranch(user)}
                          style={{ marginRight: 12 }}
                        >
                          Edit Cabang
                        </button>
                      )}
                      <button
                        type="button"
                        className="link-btn"
                        disabled={
                          user.role === 'admin' &&
                          activeAdminCount <= 1 &&
                          user.active !== false
                        }
                        onClick={() => toggleActive(user)}
                        style={{ marginRight: 12 }}
                      >
                        {user.active === false ? 'Aktifkan' : 'Nonaktifkan'}
                      </button>
                      <button
                        type="button"
                        className="link-btn"
                        disabled={saving}
                        onClick={() => deleteUser(user)}
                        style={{ color: '#b42318' }}
                      >
                        <Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p style={{ color: '#7b847a', fontSize: 12, marginBottom: 0 }}>
          Admin aktif terakhir tidak dapat dinonaktifkan dari halaman ini.
        </p>
      </section>
    </div>
  )
}

const labelStyle = {
  display: 'grid',
  gap: 8,
  color: '#53604f',
  fontSize: 13,
  fontWeight: 600,
}

const inputStyle = {
  width: '100%',
  minHeight: 44,
  padding: '10px 12px',
  border: '1px solid #dfe5dc',
  borderRadius: 9,
  background: '#fff',
  color: '#25372b',
  font: 'inherit',
  boxSizing: 'border-box',
}
