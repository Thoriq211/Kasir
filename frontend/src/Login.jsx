
import { useState } from 'react'
import { Coffee, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react'
import './Login.css'

const API_URL = 'http://localhost:5000/api/auth'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Username atau password salah.')
      }

      if (!data.token) {
        throw new Error('Token login tidak ditemukan dari server.')
      }

      onLogin(data.token, data.user)
    } catch (err) {
      setError(err.message || 'Tidak dapat terhubung ke server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-icon">
          <Coffee size={27} />
        </div>

        <div className="login-brand">nook<span>.</span></div>
        <p className="login-eyebrow">CAFE MANAGEMENT SYSTEM</p>

        <div className="login-heading">
          <h1>Selamat datang</h1>
          <p>Masuk untuk mengelola operasional kafe kamu.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-username">Username</label>
          <div className="login-input-wrap">
            <UserRound size={18} />
            <input
              id="login-username"
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={30}
              required
            />
          </div>

          <label htmlFor="login-password">Password</label>
          <div className="login-input-wrap">
            <LockKeyhole size={18} />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword(value => !value)}
              aria-label={
                showPassword
                  ? 'Sembunyikan password'
                  : 'Tampilkan password'
              }
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Memeriksa akun...' : 'Masuk ke Dashboard'}
          </button>
        </form>

        <p className="login-footer">
          © 2026 nook. Made for better coffee days.
        </p>
      </section>
    </main>
  )
}

export default Login
