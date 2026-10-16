
require('dotenv').config()
const mongoose = require('mongoose')

async function migrateUsernames() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI belum diatur.')
    }

    await mongoose.connect(process.env.MONGODB_URI)

    const users = mongoose.connection.collection('users')
    const existingUsers = await users.find({}).toArray()

    const used = new Set(
      existingUsers
        .map(user => user.username?.toLowerCase())
        .filter(Boolean)
    )

    let migrated = 0

    for (const user of existingUsers) {
      if (user.username) continue

      if (!user.email) {
        console.log(`Lewati ${user._id}: tidak memiliki email.`)
        continue
      }

      let base = String(user.email)
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')

      if (base.length < 3) base = `user${base}`
      base = base.slice(0, 24)

      let username = base
      let suffix = 1

      while (used.has(username)) {
        username = `${base.slice(0, 24)}${suffix++}`
      }

      await users.updateOne(
        { _id: user._id, username: { $exists: false } },
        { $set: { username } }
      )

      used.add(username)
      migrated++

      console.log(`Username dibuat untuk ${user.name || user._id}: ${username}`)
    }

    console.log(`Selesai. Total username ditambahkan: ${migrated}`)
  } catch (error) {
    console.error('Migrasi gagal:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

migrateUsernames()
