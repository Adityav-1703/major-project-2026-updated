import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { User } from '../models/User.js'
import { Herb } from '../models/Herb.js'
import * as localDb from './localDb.js'
import { ensureDemoUser } from './ensureDemoUser.js'

/** @type {'none' | 'mongodb' | 'local'} */
let storageMode = 'none'

export function getStorageMode() {
  return storageMode
}

export function isStorageReady() {
  if (storageMode === 'local') return true
  if (storageMode === 'mongodb') return mongoose.connection.readyState === 1
  return false
}

async function finishStorageInit(mode) {
  storageMode = mode
  await ensureDemoUser()
  return storageMode
}

export async function initStorage() {
  if (process.env.USE_LOCAL_DB === 'true') {
    await localDb.initLocalDb()
    return finishStorageInit('local')
  }

  try {
    await connectDB(Number(process.env.MONGODB_MAX_ATTEMPTS) || 8)

    mongoose.connection.on('disconnected', async () => {
      if (storageMode !== 'mongodb' || process.env.STORAGE_FALLBACK_LOCAL === 'false') return
      console.warn('MongoDB disconnected — switching to local file storage.')
      await localDb.initLocalDb()
      storageMode = 'local'
      await ensureDemoUser()
    })

    return finishStorageInit('mongodb')
  } catch (err) {
    const allowFallback = process.env.STORAGE_FALLBACK_LOCAL !== 'false'
    if (!allowFallback) throw err

    console.warn(`MongoDB failed (${err.message}). Falling back to local file storage.`)
    await localDb.initLocalDb()
    return finishStorageInit('local')
  }
}

export async function findUserByEmail(email) {
  if (storageMode === 'local') return localDb.localFindUserByEmail(email)
  return User.findOne({ email: email.toLowerCase() })
}

export async function findUserById(id) {
  if (storageMode === 'local') return localDb.localFindUserById(id)
  return User.findById(id)
}

export async function createUser(payload) {
  if (storageMode === 'local') return localDb.localCreateUser(payload)
  return User.create(payload)
}

export function serializeUser(user) {
  if (!user) return null
  if (storageMode === 'local') return localDb.userToJSON(user)
  return user.toJSON()
}

export async function listHerbs() {
  if (storageMode === 'local') return localDb.localListHerbs()
  return Herb.find().sort({ timestamp: -1 }).lean()
}

export async function findHerbByBatchId(batchId) {
  if (storageMode === 'local') return localDb.localFindHerbByBatchId(batchId)
  return Herb.findOne({ batchId: batchId.toLowerCase() })
}

export async function findHerbByCode(raw) {
  if (storageMode === 'local') return localDb.localFindHerbByCode(raw)
  const parsed = (await import('../utils/qr.js')).parseQrCode(raw)
  if (!parsed.malformed) {
    const byId = await Herb.findOne({ batchId: parsed.batchId })
    if (byId) return byId
  }
  return Herb.findOne({ qrPayload: String(raw || '').trim() })
}

export async function checkoutHerb(payload) {
  if (storageMode === 'local') return localDb.localCheckoutHerb(payload)
  const herb = await Herb.findOne({ batchId: payload.batchId.toLowerCase() })
  if (!herb) return { error: 'Batch not found', status: 404 }
  if (herb.sold) return { error: 'This unique batch is already sold', status: 409 }
  const { v4: uuidv4 } = await import('uuid')
  const orderId = uuidv4()
  const paidAt = new Date()
  herb.sold = true
  herb.soldTo = payload.buyerId
  herb.paidAt = paidAt
  herb.orderId = orderId
  await herb.save()
  return {
    herb,
    order: {
      orderId,
      batchId: herb.batchId,
      herbName: herb.herbName,
      buyerId: payload.buyerId,
      buyerEmail: payload.buyerEmail,
      amount: herb.priceInr,
      method: payload.method || 'demo',
      paidAt: paidAt.toISOString(),
      qrPayload: herb.qrPayload,
      status: 'paid',
    },
  }
}

export async function listOrdersForUser(userId) {
  if (storageMode === 'local') return localDb.localListOrdersForUser(userId)
  const herbs = await Herb.find({ soldTo: userId }).sort({ paidAt: -1 }).lean()
  return herbs.map((h) => ({
    orderId: h.orderId,
    batchId: h.batchId,
    herbName: h.herbName,
    buyerId: h.soldTo,
    amount: h.priceInr,
    paidAt: h.paidAt,
    qrPayload: h.qrPayload,
    status: 'paid',
  }))
}

export async function createHerb(payload) {
  if (storageMode === 'local') {
    await localDb.localCreateHerb(payload)
    return payload
  }
  return Herb.create(payload)
}

export function serializeHerb(herb) {
  if (!herb) return null
  if (storageMode === 'local') return localDb.herbToJSON(herb)
  if (typeof herb.toJSON === 'function') return herb.toJSON()
  return {
    id: herb.batchId,
    herbName: herb.herbName,
    farmerId: herb.farmerId,
    imageUrl: herb.imageUrl,
    origin: herb.origin,
    latitude: herb.latitude,
    longitude: herb.longitude,
    timestamp: herb.timestamp?.toISOString?.() ?? herb.timestamp,
    isVerified: herb.isVerified,
    aiConfidence: herb.aiConfidence,
    aiModel: herb.aiModel,
    blockchainHash: herb.blockchainHash,
    qrPayload: herb.qrPayload,
    predictedClass: herb.predictedClass,
    sold: Boolean(herb.sold),
    soldTo: herb.soldTo || '',
    paidAt: herb.paidAt?.toISOString?.() ?? herb.paidAt ?? '',
    orderId: herb.orderId || '',
    priceInr: herb.priceInr,
    uniqueQr: herb.qrPayload,
  }
}

export function mapHerbList(herbs) {
  return herbs.map((h) => serializeHerb(h))
}
