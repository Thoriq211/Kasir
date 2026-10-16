const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Silakan login terlebih dahulu.' })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET belum diatur di file .env.' })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub).select('_id name email role active')

    if (!user || !user.active) {
      return res.status(401).json({ message: 'Akun tidak aktif atau tidak ditemukan.' })
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    }
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Sesi login tidak valid atau sudah kedaluwarsa.' })
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Kamu tidak memiliki izin untuk melakukan tindakan ini.' })
    }
    next()
  }
}

module.exports = { requireAuth, allowRoles }
