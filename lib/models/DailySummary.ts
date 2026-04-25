import mongoose, { type Model } from "mongoose"

export interface IDailySummary {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  date: Date
  totalNutritionScore: number
  totalSpent: number
  mealsCount: number
  frictionCount: number
  proteinTotal_g: number
}

const DailySummarySchema = new mongoose.Schema<IDailySummary>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  totalNutritionScore: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  mealsCount: { type: Number, default: 0 },
  frictionCount: { type: Number, default: 0 },
  proteinTotal_g: { type: Number, default: 0 },
})

DailySummarySchema.index({ userId: 1, date: 1 }, { unique: true })

const DailySummary: Model<IDailySummary> =
  (mongoose.models.DailySummary as Model<IDailySummary>) ||
  mongoose.model<IDailySummary>("DailySummary", DailySummarySchema)

export default DailySummary
