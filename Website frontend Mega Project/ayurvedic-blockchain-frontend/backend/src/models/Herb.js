import mongoose from 'mongoose'

const herbSchema = new mongoose.Schema(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    herbName: { type: String, required: true, trim: true },
    farmerId: { type: String, required: true, trim: true, index: true },
    imageUrl: { type: String, required: true },
    origin: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    aiConfidence: { type: Number, required: true, min: 0, max: 1 },
    aiModel: { type: String, required: true },
    blockchainHash: { type: String, default: '' },
    qrPayload: { type: String, required: true, unique: true },
    predictedClass: { type: String, default: '' },
    uploadedBy: { type: String, default: '' },
    sold: { type: Boolean, default: false },
    soldTo: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    orderId: { type: String, default: '' },
    priceInr: { type: Number, default: 0 },
    qrAliases: { type: [String], default: [] },
  },
  { versionKey: false }
)

herbSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret.batchId
    delete ret._id
    delete ret.batchId
    delete ret.__v
    ret.timestamp = ret.timestamp instanceof Date ? ret.timestamp.toISOString() : ret.timestamp
    return ret
  },
})

export const Herb = mongoose.model('Herb', herbSchema)
