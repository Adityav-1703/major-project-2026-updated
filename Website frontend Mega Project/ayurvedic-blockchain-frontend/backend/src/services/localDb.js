import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import {
  SAMPLE_QR_BATCH_ID,
  buildQrPayload,
  fakeBlockchainHash,
  normalizeAlias,
  priceForHerbName,
  toOrigin,
} from '../utils/qr.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../../data/local-db.json')

const SAMPLE_IMAGE =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'

let data = null

async function persist() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

async function load() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    data = JSON.parse(raw)
    if (!Array.isArray(data.orders)) data.orders = []
    if (!Array.isArray(data.herbs)) data.herbs = []
    if (!Array.isArray(data.users)) data.users = []
  } catch {
    data = { users: [], herbs: [], orders: [] }
    await persist()
  }
}

async function seedDemoIfEmpty() {
  const demoEmail = (process.env.SEED_DEMO_EMAIL || 'farmer@ayurauth.demo').toLowerCase()
  const demoPassword = process.env.SEED_DEMO_PASSWORD || 'demo1234@A'

  let demoUser = data.users.find((u) => u.email === demoEmail)
  if (!demoUser) {
    demoUser = {
      _id: uuidv4(),
      name: 'Demo Farmer',
      email: demoEmail,
      passwordHash: await bcrypt.hash(demoPassword, 12),
      role: 'farmer',
      createdAt: new Date().toISOString(),
    }
    data.users.push(demoUser)
  }

  let consumer = data.users.find((u) => u.email === 'consumer@ayurauth.demo')
  if (!consumer) {
    consumer = {
      _id: uuidv4(),
      name: 'Demo Shopper',
      email: 'consumer@ayurauth.demo',
      passwordHash: await bcrypt.hash(demoPassword, 12),
      role: 'consumer',
      createdAt: new Date().toISOString(),
    }
    data.users.push(consumer)
  }

  if (data.herbs.length === 0) {
    const samples = [
      { batchId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde', herbName: 'Ashwagandha', farmerId: 'FARM-001', latitude: 19.076, longitude: 72.8777, isVerified: true, aiConfidence: 0.96, aiModel: 'leaf_model.h5', predictedClass: 'ashwagandha' },
      { batchId: 'b2c3d4e5-f6a7-4890-b123-456789abcdef', herbName: 'Turmeric', farmerId: 'FARM-002', latitude: 12.9716, longitude: 77.5946, isVerified: true, aiConfidence: 0.91, aiModel: 'leaf_model.h5', predictedClass: 'turmeric' },
      { batchId: 'c3d4e5f6-a7b8-4901-c234-56789abcdef0', herbName: 'Tulsi', farmerId: 'FARM-003', latitude: 28.6139, longitude: 77.209, isVerified: false, aiConfidence: 0.42, aiModel: 'leaf_model.h5', predictedClass: 'unknown' },
    ]
    for (const s of samples) {
      data.herbs.push({
        ...s,
        imageUrl: SAMPLE_IMAGE,
        origin: toOrigin(s.latitude, s.longitude),
        timestamp: new Date().toISOString(),
        blockchainHash: fakeBlockchainHash(s.batchId),
        qrPayload: buildQrPayload(s.batchId),
        uploadedBy: demoUser._id,
        sold: false,
        soldTo: '',
        paidAt: '',
        orderId: '',
        priceInr: priceForHerbName(s.herbName),
        qrAliases: [],
      })
    }
  }

  await ensureSampleQrHerb(demoUser)
  for (const h of data.herbs) {
    if (typeof h.sold !== 'boolean') h.sold = false
    if (!h.priceInr) h.priceInr = priceForHerbName(h.herbName)
    if (!Array.isArray(h.qrAliases)) h.qrAliases = []
  }

  await persist()
}

export async function syncDemoPassword() {
  await load()
  const demoEmail = (process.env.SEED_DEMO_EMAIL || 'farmer@ayurauth.demo').toLowerCase()
  const demoPassword = process.env.SEED_DEMO_PASSWORD || 'demo1234@A'
  const demoUser = data.users.find((u) => u.email === demoEmail)
  if (!demoUser) return
  const match = await bcrypt.compare(demoPassword, demoUser.passwordHash)
  if (!match) {
    demoUser.passwordHash = await bcrypt.hash(demoPassword, 12)
    await persist()
    console.log(`Demo password updated for ${demoEmail} (local store)`)
  }
}

export async function initLocalDb() {
  await load()
  await seedDemoIfEmpty()
  await syncDemoPassword()
  console.log(`Local database ready: ${DATA_FILE}`)
  console.log(`Demo shopper: consumer@ayurauth.demo`)
  console.log(`Demo grower: ${process.env.SEED_DEMO_EMAIL || 'farmer@ayurauth.demo'}`)
}

export function userToJSON(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

async function ensureSampleQrHerb(demoUser) {
  const aliases = [
    'http://www.yuvikaherbs.com',
    'https://www.yuvikaherbs.com',
    'http://yuvikaherbs.com',
    'https://yuvikaherbs.com',
    '8904372900543',
  ]
  let herb = data.herbs.find((h) => h.batchId === SAMPLE_QR_BATCH_ID)
  if (!herb) {
    herb = {
      batchId: SAMPLE_QR_BATCH_ID,
      herbName: 'Tulsi',
      farmerId: 'FARM-SAMPLE',
      latitude: 19.9975,
      longitude: 73.7898,
      isVerified: true,
      aiConfidence: 0.94,
      aiModel: 'herbal_auth_improved_final.h5',
      predictedClass: 'Tulsi',
      imageUrl: SAMPLE_IMAGE,
      origin: toOrigin(19.9975, 73.7898),
      timestamp: new Date().toISOString(),
      blockchainHash: fakeBlockchainHash(SAMPLE_QR_BATCH_ID),
      qrPayload: buildQrPayload(SAMPLE_QR_BATCH_ID),
      qrAliases: aliases,
      uploadedBy: demoUser._id,
      sold: false,
      soldTo: '',
      paidAt: '',
      orderId: '',
      priceInr: 299,
    }
    data.herbs.push(herb)
    console.log('Seeded sample-QR Tulsi batch (yuvikaherbs.com alias)')
  } else {
    herb.isVerified = true
    herb.qrAliases = aliases
    herb.predictedClass = herb.predictedClass || 'Tulsi'
    if (herb.aiConfidence < 0.7) herb.aiConfidence = 0.94
  }
}

export function herbToJSON(herb) {
  return {
    id: herb.batchId,
    herbName: herb.herbName,
    farmerId: herb.farmerId,
    imageUrl: herb.imageUrl,
    origin: herb.origin,
    latitude: herb.latitude,
    longitude: herb.longitude,
    timestamp: herb.timestamp,
    isVerified: herb.isVerified,
    aiConfidence: herb.aiConfidence,
    aiModel: herb.aiModel,
    blockchainHash: herb.blockchainHash,
    qrPayload: herb.qrPayload,
    predictedClass: herb.predictedClass || '',
    sold: Boolean(herb.sold),
    soldTo: herb.soldTo || '',
    paidAt: herb.paidAt || '',
    orderId: herb.orderId || '',
    priceInr: herb.priceInr || priceForHerbName(herb.herbName),
    uniqueQr: herb.qrPayload,
  }
}

export async function localFindUserByEmail(email) {
  return data.users.find((u) => u.email === email.toLowerCase()) || null
}

export async function localFindUserById(id) {
  return data.users.find((u) => String(u._id) === String(id)) || null
}

export async function localCreateUser({ name, email, passwordHash, role }) {
  const doc = {
    _id: uuidv4(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role || 'consumer',
    createdAt: new Date().toISOString(),
  }
  data.users.push(doc)
  await persist()
  return doc
}

export async function localListHerbs() {
  return [...data.herbs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

export async function localFindHerbByBatchId(batchId) {
  const id = String(batchId || '').toLowerCase()
  return data.herbs.find((h) => h.batchId.toLowerCase() === id) || null
}

export async function localFindHerbByCode(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return null
  const alias = normalizeAlias(trimmed)
  const byAlias = data.herbs.find(
    (h) =>
      Array.isArray(h.qrAliases) &&
      h.qrAliases.some((a) => normalizeAlias(a) === alias)
  )
  if (byAlias) return byAlias
  const byPayload = data.herbs.find(
    (h) => String(h.qrPayload || '').toLowerCase() === trimmed.toLowerCase()
  )
  if (byPayload) return byPayload
  return localFindHerbByBatchId(trimmed)
}

export async function localCreateHerb(doc) {
  data.herbs.push({
    ...doc,
    timestamp: new Date().toISOString(),
    sold: false,
    soldTo: '',
    paidAt: '',
    orderId: '',
    priceInr: doc.priceInr || priceForHerbName(doc.herbName),
    qrAliases: doc.qrAliases || [],
  })
  await persist()
  return doc
}

export async function localCheckoutHerb({ batchId, buyerId, buyerEmail, method }) {
  const herb = await localFindHerbByBatchId(batchId)
  if (!herb) return { error: 'Batch not found', status: 404 }
  if (herb.sold) return { error: 'This unique batch is already sold', status: 409 }
  const orderId = uuidv4()
  const paidAt = new Date().toISOString()
  herb.sold = true
  herb.soldTo = buyerId
  herb.paidAt = paidAt
  herb.orderId = orderId
  const order = {
    orderId,
    batchId: herb.batchId,
    herbName: herb.herbName,
    buyerId,
    buyerEmail,
    amount: herb.priceInr || priceForHerbName(herb.herbName),
    method: method || 'demo',
    paidAt,
    qrPayload: herb.qrPayload,
    status: 'paid',
  }
  data.orders.push(order)
  await persist()
  return { order, herb }
}

export async function localListOrdersForUser(userId) {
  return data.orders
    .filter((o) => String(o.buyerId) === String(userId))
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
}
