import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { getStorageMode } from './repository.js'
import { syncDemoPassword } from './localDb.js'

/** Keep demo login in sync with SEED_DEMO_* in backend/.env */
export async function ensureDemoUser() {
  const email = (process.env.SEED_DEMO_EMAIL || 'farmer@ayurauth.demo').toLowerCase()
  const password = process.env.SEED_DEMO_PASSWORD || 'demo1234@A'
  const passwordHash = await bcrypt.hash(password, 12)

  if (getStorageMode() === 'local') {
    await syncDemoPassword()
    return
  }

  if (getStorageMode() !== 'mongodb') return

  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({
      name: 'Demo Farmer',
      email,
      passwordHash,
      role: 'farmer',
    })
    console.log(`Demo user created: ${email}`)
    return
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    user.passwordHash = passwordHash
    await user.save()
    console.log(`Demo password updated for ${email} (MongoDB)`)
  }
}
