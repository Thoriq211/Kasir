
import { useCallback, useEffect, useState } from 'react'
import App from './App.jsx'
import Login from './Login.jsx'

const API_URL = 'http://localhost:5000/api/auth'

function AuthGate() {
  const [token, setToken] = useState(() => sessionStorage.getItem('nook_token'))
  const [checking, setChecking] = useState(Boolean(sessionStorage.getItem('nook_token')))

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('nook_token')
    sessionStorage.removeItem('nook_user')
    setToken(null)
  }, [])

  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }

    let cancelled = false

    const verifySession = async () => {
      try {
        const response = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error('Sesi login tidak valid.')
        }

        const data = await response.json()
        const user = data.user || data

        if (!cancelled) {
          sessionStorage.setItem('nook_user', JSON.stringify(user))
        }
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    verifySession()

    return () => {
      cancelled = true
    }
  }, [token, clearSession])

  const handleLogin = (newToken, user) => {
    sessionStorage.setItem('nook_token', newToken)

    if (user) {
      sessionStorage.setItem('nook_user', JSON.stringify(user))
    }

    setChecking(true)
    setToken(newToken)
  }

  if (checking) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Memeriksa sesi login...</div>
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return <App />
}

export default AuthGate
