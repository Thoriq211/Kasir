
const express = require('express')
const mongoose = require('mongoose')
const Branch = require('../models/Branch')
const { requireAuth, allowRoles } = require('../middleware/authMiddleware')

const router = express.Router()

// Daftar cabang yang aktif
router.get('/', requireAuth, async (req, res) => {
  try {
    const branches = await Branch.find({ active: true })
      .select('_id name address active')
      .sort({ name: 1 })

    res.json(branches)
  } catch (error) {
    console.error('Gagal mengambil cabang:', error)
    res.status(500).json({ message: 'Gagal mengambil daftar cabang.' })
  }
})

// Membuat cabang baru: admin saja
router.post('/', requireAuth, allowRoles('admin'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const address = String(req.body.address || '').trim()

    if (!name) {
      return res.status(400).json({ message: 'Nama cabang wajib diisi.' })
    }

    const branch = await Branch.create({ name, address })

    res.status(201).json({
      message: 'Cabang berhasil dibuat.',
      branch,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Nama cabang sudah digunakan.' })
    }

    console.error('Gagal membuat cabang:', error)
    res.status(500).json({ message: 'Gagal membuat cabang.' })
  }
})

// Mengubah cabang: admin saja
router.patch('/:id', requireAuth, allowRoles('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'ID cabang tidak valid.' })
    }

    const updates = {}

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim()
      if (!name) {
        return res.status(400).json({ message: 'Nama cabang wajib diisi.' })
      }
      updates.name = name
    }

    if (req.body.address !== undefined) {
      updates.address = String(req.body.address).trim()
    }

    if (req.body.active !== undefined) {
      if (typeof req.body.active !== 'boolean') {
        return res.status(400).json({ message: 'Status cabang tidak valid.' })
      }
      updates.active = req.body.active
    }

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )

    if (!branch) {
      return res.status(404).json({ message: 'Cabang tidak ditemukan.' })
    }

    res.json({ message: 'Cabang berhasil diperbarui.', branch })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Nama cabang sudah digunakan.' })
    }

    console.error('Gagal mengubah cabang:', error)
    res.status(400).json({ message: 'Gagal mengubah data cabang.' })
  }
})

module.exports = router
