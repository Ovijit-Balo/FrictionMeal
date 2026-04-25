import mongoose, { type Model } from "mongoose"

export interface IUser {
  _id: mongoose.Types.ObjectId
  email: string
  name: string
  passwordHash: string
  monthlyBudget: number
  age?: number
  weightKg?: number
  heightCm?: number
  biologicalSex?: "female" | "male" | "other"
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    monthlyBudget: { type: Number, default: 15000 },
    age: { type: Number, min: 5, max: 120 },
    weightKg: { type: Number, min: 20, max: 300 },
    heightCm: { type: Number, min: 100, max: 250 },
    biologicalSex: { type: String, enum: ["female", "male", "other"] },
  },
  { timestamps: true },
)

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>("User", UserSchema)

export default User
