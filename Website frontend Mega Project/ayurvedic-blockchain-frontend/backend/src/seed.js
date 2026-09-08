import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDB } from './config/db.js'
import { Herb } from './models/Herb.js'
import { User } from './models/User.js'
import { buildQrPayload, fakeBlockchainHash, toOrigin } from './utils/qr.js'

const SAMPLE_IMAGE =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'

const samples = [
  {
    batchId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    herbName: 'Ashwagandha',
    farmerId: 'FARM-001',
    latitude: 19.076,
    longitude: 72.8777,
    isVerified: true,
    aiConfidence: 0.96,
    aiModel: 'leaf_model.h5',
    predictedClass: 'ashwagandha',
  },
  {
    batchId: 'b2c3d4e5-f6a7-4890-b123-456789abcdef',
    herbName: 'Turmeric',
    farmerId: 'FARM-002',
    latitude: 12.9716,
    longitude: 77.5946,
    isVerified: true,
    aiConfidence: 0.91,
    aiModel: 'leaf_model.h5',
    predictedClass: 'turmeric',
  },
  {
    batchId: 'c3d4e5f6-a7b8-4901-c234-56789abcdef0',
    herbName: 'Tulsi',
    farmerId: 'FARM-003',
    latitude: 28.6139,
    longitude: 77.209,
    isVerified: false,
    aiConfidence: 0.42,
    aiModel: 'leaf_model.h5',
    predictedClass: 'unknown',
  },
]

async function seed() {
  await connectDB()

  const demoEmail = process.env.SEED_DEMO_EMAIL || 'farmer@ayurauth.demo'
  const demoPassword = process.env.SEED_DEMO_PASSWORD || 'demo1234'
  const passwordHash = await bcrypt.hash(demoPassword, 12)

  await User.deleteMany({ email: demoEmail })
  const demoUser = await User.create({
    name: 'Demo Farmer',
    email: demoEmail,
    passwordHash,
    role: 'farmer',
  })

  await Herb.deleteMany({})
  for (const s of samples) {
    const qrPayload = buildQrPayload(s.batchId)
    await Herb.create({
      ...s,
      imageUrl: SAMPLE_IMAGE,
      origin: toOrigin(s.latitude, s.longitude),
      blockchainHash: fakeBlockchainHash(s.batchId),
      qrPayload,
      uploadedBy: demoUser._id.toString(),
    })
    console.log(`Seeded ${s.herbName}: ${qrPayload}`)
  }

  console.log('\nDemo login:')
  console.log(`  Email:    ${demoEmail}`)
  console.log(`  Password: ${demoPassword}`)
  console.log('\nDemo valid QR payloads:')
  console.log('  Ashwagandha:', buildQrPayload(samples[0].batchId))
  console.log('  Turmeric:   ', buildQrPayload(samples[1].batchId))
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
