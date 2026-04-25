import mongoose, { type Model } from "mongoose"

export type MealType = "breakfast" | "lunch" | "dinner" | "snack"
export type NutritionSource = "off" | "usda" | "local" | "ai"

export type NutriGrade = "A" | "B" | "C" | "D" | "E"

export interface IMeal {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  foodItems: string[]
  portionSize: number
  cost: number
  mealType: MealType
  photoUrl?: string
  nutritionScore: number
  /** Nutri-Score letter grade (A-E) for the meal */
  nutriGrade?: NutriGrade
  /** NOVA classification 1-4 (Monteiro et al.) */
  novaGroup?: 1 | 2 | 3 | 4
  protein_g: number
  calories: number
  fiber_g: number
  carbs_g?: number
  fat_g?: number
  vitamin_c_mg?: number
  iron_mg?: number
  calcium_mg?: number
  potassium_mg?: number
  sat_fat_g?: number
  sugars_g?: number
  sodium_mg?: number
  source: NutritionSource
  sourceBreakdown?: Partial<Record<NutritionSource, number>>
  matchConfidence?: number
  frictionTriggered: boolean
  frictionReason?: "expensive" | "unhealthy" | "both" | null
  frictionTriggerType?: "offtrack_combo" | "budget_overrun" | "high_risk_combo" | null
  justification?: string
  mood?: string
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

const MealSchema = new mongoose.Schema<IMeal>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    foodItems: [{ type: String, required: true }],
    portionSize: { type: Number, required: true, min: 0.5, max: 2 },
    cost: { type: Number, required: true, min: 0 },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack"],
      required: true,
    },
    photoUrl: { type: String },
    nutritionScore: { type: Number, required: true, min: 0, max: 20 },
    nutriGrade: { type: String, enum: ["A", "B", "C", "D", "E"] },
    novaGroup: { type: Number, enum: [1, 2, 3, 4] },
    protein_g: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    fiber_g: { type: Number, default: 0 },
    carbs_g: { type: Number, default: 0 },
    fat_g: { type: Number, default: 0 },
    vitamin_c_mg: { type: Number, default: 0 },
    iron_mg: { type: Number, default: 0 },
    calcium_mg: { type: Number, default: 0 },
    potassium_mg: { type: Number, default: 0 },
    sat_fat_g: { type: Number, default: 0 },
    sugars_g: { type: Number, default: 0 },
    sodium_mg: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ["off", "usda", "local", "ai"],
      required: true,
    },
    frictionTriggered: { type: Boolean, default: false },
    frictionReason: { type: String, enum: ["expensive", "unhealthy", "both", null], default: null },
    frictionTriggerType: {
      type: String,
      enum: ["offtrack_combo", "budget_overrun", "high_risk_combo", null],
      default: null,
    },
    sourceBreakdown: { type: mongoose.Schema.Types.Mixed },
    matchConfidence: { type: Number, default: 0 },
    justification: { type: String },
    mood: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
)

const Meal: Model<IMeal> =
  (mongoose.models.Meal as Model<IMeal>) || mongoose.model<IMeal>("Meal", MealSchema)

export default Meal
