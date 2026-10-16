
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const Branch = require('../models/Branch')
const { requireAuth, allowRoles } = require('../middleware/authMiddleware')

const router = express.Router()

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase()
}

function validUsername(value) {
  return /^[a-z0-9._-]{3,30}$/.test(value)
}

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET belum diatur.')
  }

  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

function publicUser(user, branchName = null) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    branchId: user.branchId || null,
    branchName,
    active: user.active,
  }
}

// Membuat admin pertama
router.post('/setup-admin', async (req, res) => {
  try {
    if (await User.exists({})) {
      return res.status(403).json({
        message: 'Admin awal sudah dibuat. Endpoint setup dikunci.',
      })
    }

    const name = String(req.body.name || '').trim()
    const username = normalizeUsername(req.body.username)
    const password = String(req.body.password || '')

    if (!name || !validUsername(username) || password.length < 8) {
      return res.status(400).json({
        message: 'Nama wajib diisi, username 3–30 karakter (huruf, angka, titik, _ atau -), password minimal 8 karakter.',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({
      name,
      username,
      passwordHash,
      role: 'admin',
    })

    res.status(201).json({
      message: 'Admin pertama berhasil dibuat.',
      user: publicUser(user),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username sudah digunakan.' })
    }

    console.error('Setup admin gagal:', error)
    res.status(500).json({ message: 'Gagal membuat admin awal.' })
  }
})

// Login menggunakan username
router.post('/login', async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username)
    const password = String(req.body.password || '')

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username dan password wajib diisi.',
      })
    }

    const user = await User.findOne({ username }).select('+passwordHash')

    if (!user || !user.active) {
      return res.status(401).json({
        message: 'Username atau password salah.',
      })
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash)

    if (!validPassword) {
      return res.status(401).json({
        message: 'Username atau password salah.',
      })
    }

    const branch = user.branchId
      ? await Branch.findById(user.branchId).select('name')
      : null

    res.json({
      message: 'Login berhasil.',
      token: createToken(user),
      expiresIn: 8 * 60 * 60,
      user: publicUser(user, branch?.name || null),
    })
  } catch (error) {
    console.error('Login gagal:', error)
    res.status(500).json({ message: 'Terjadi kesalahan saat login.' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' })
    }

    const branch = user.branchId
      ? await Branch.findById(user.branchId).select('name')
      : null

    res.json({ user: publicUser(user, branch?.name || null) })
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data pengguna.' })
  }
})

// Membuat akun: admin saja
router.post('/users', requireAuth, allowRoles('admin'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const username = normalizeUsername(req.body.username)
    const password = String(req.body.password || '')
    const role = req.body.role === 'admin' ? 'admin' : 'cashier'
    const branchId = req.body.branchId

    if (!name || !validUsername(username) || password.length < 8) {
      return res.status(400).json({
        message: 'Nama wajib diisi, username harus 3–30 karakter yang valid, dan password minimal 8 karakter.',
      })
    }

    let branch = null

    if (role === 'cashier') {
      const branchName = String(req.body.branchName || '').trim()

      if (!branchName) {
        return res.status(400).json({
          message: 'Nama cabang wajib diisi untuk akun kasir.',
        })
      }

      branch = await Branch.findOne({
        name: { $regex: new RegExp(
          '^' + branchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
          'i'
        ) },
      })

      if (!branch) {
        branch = await Branch.create({
          name: branchName,
          active: true,
        })
      }

      if (!branch.active) {
        return res.status(400).json({
          message: 'Cabang tersebut sedang nonaktif.',
        })
      }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
      name,
      username,
      passwordHash,
      role,
      branchId: branch?._id || null,
    })

    res.status(201).json({
      message: 'Akun berhasil dibuat.',
      user: publicUser(user, branch?.name || null),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username sudah digunakan.' })
    }

    console.error('Pembuatan akun gagal:', error)
    res.status(500).json({ message: 'Gagal membuat akun.' })
  }
})

// Daftar akun
router.get('/users', requireAuth, allowRoles('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .select('_id name username role branchId active createdAt')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })

    res.json(users.map(user => ({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      branchId: user.branchId?._id || null,
      branchName: user.branchId?.name || null,
      active: user.active,
      createdAt: user.createdAt,
    })))
  } catch (error) {
    console.error('Gagal mengambil akun:', error)
    res.status(500).json({ message: 'Gagal mengambil daftar akun.' })
  }
})

// Aktif/nonaktif akun
router.patch('/users/:id/active', requireAuth, allowRoles('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'ID akun tidak valid.' })
    }

    const targetId = String(req.params.id)
    const currentId = String(req.user.id || req.user._id)

    if (currentId === targetId && req.body.active === false) {
      return res.status(400).json({
        message: 'Admin tidak bisa menonaktifkan akunnya sendiri.',
      })
    }

    if (typeof req.body.active !== 'boolean') {
      return res.status(400).json({ message: 'Status akun tidak valid.' })
    }

    const target = await User.findById(targetId)

    if (!target) {
      return res.status(404).json({ message: 'Akun tidak ditemukan.' })
    }

    if (target.role === 'admin' && target.active && req.body.active === false) {
      const activeAdmins = await User.countDocuments({
        role: 'admin',
        active: true,
      })

      if (activeAdmins <= 1) {
        return res.status(400).json({
          message: 'Admin aktif terakhir tidak dapat dinonaktifkan.',
        })
      }
    }

    target.active = req.body.active
    await target.save()

    res.json({
      message: 'Status akun diperbarui.',
      user: publicUser(target),
    })
  } catch (error) {
    console.error('Gagal mengubah status akun:', error)
    res.status(500).json({ message: 'Gagal mengubah status akun.' })
  }
})


router.patch('/users/:id/branch', requireAuth, allowRoles('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'ID akun tidak valid.' })
    }

    const target = await User.findById(req.params.id)

    if (!target) {
      return res.status(404).json({ message: 'Akun tidak ditemukan.' })
    }

    if (target.role !== 'cashier') {
      return res.status(400).json({
        message: 'Penempatan cabang hanya berlaku untuk akun kasir.',
      })
    }

    const branchName = String(req.body.branchName || '').trim()

    if (!branchName || branchName.length > 100) {
      return res.status(400).json({
        message: 'Nama cabang wajib diisi, maksimal 100 karakter.',
      })
    }

    // Cari cabang berdasarkan nama tanpa membedakan huruf besar/kecil.
    const escapedName = branchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    let branch = await Branch.findOne({
      name: { $regex: `^${escapedName}$`, $options: 'i' },
    })

    // Jika belum ada, buat cabang baru.
    if (!branch) {
      try {
        branch = await Branch.create({
          name: branchName,
          active: true,
        })
      } catch (error) {
        // Mengantisipasi jika cabang yang sama dibuat bersamaan.
        if (error.code !== 11000) throw error

        branch = await Branch.findOne({
          name: { $regex: `^${escapedName}$`, $options: 'i' },
        })
      }
    }

    if (!branch || !branch.active) {
      return res.status(400).json({
        message: 'Cabang tidak ditemukan atau sedang nonaktif.',
      })
    }

    target.branchId = branch._id
    await target.save()

    return res.json({
      message: 'Cabang akun berhasil diperbarui.',
      user: {
        _id: target._id,
        name: target.name,
        username: target.username,
        role: target.role,
        branchId: branch._id,
        branchName: branch.name,
        active: target.active,
      },
    })
  } catch (error) {
    console.error('Gagal mengubah cabang akun:', error)
    return res.status(500).json({
      message: 'Gagal mengubah cabang akun.',
    })
  }
})


router.delete('/users/:id', requireAuth, allowRoles('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: 'Akun tidak ditemukan.' })
    }

    // Admin tidak boleh menghapus akunnya sendiri.
    if (String(user._id) === String(req.user.id)) {
      return res.status(400).json({
        message: 'Kamu tidak bisa menghapus akun yang sedang digunakan.',
      })
    }

    // Lindungi admin aktif terakhir.
    if (user.role === 'admin' && user.active !== false) {
      const activeAdminCount = await User.countDocuments({
        role: 'admin',
        active: { $ne: false },
      })

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          message: 'Admin aktif terakhir tidak dapat dihapus.',
        })
      }
    }

    await User.deleteOne({ _id: user._id })

    return res.json({ message: 'Akun berhasil dihapus.' })
  } catch (error) {
    console.error('Gagal menghapus akun:', error)
    return res.status(400).json({
      message: 'Gagal menghapus akun. Periksa ID akun.',
    })
  }
})

module.exports = router
