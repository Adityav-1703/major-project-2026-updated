import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['farmer', 'consumer', 'admin'], default: 'consumer' },
  },
  { timestamps: true, versionKey: false }
)

userSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.passwordHash
    delete ret.__v
    return ret
  },
})

export const User = mongoose.model('User', userSchema)
