export type BiologicalSex = "female" | "male" | "other"

export interface MicronutrientTargets {
  vitaminC_mg_per_day: number
  iron_mg_per_day: number
  calcium_mg_per_day: number
  potassium_mg_per_day: number
  protein_g_per_day: number
}

import { calculateProteinTarget } from "./proteinTargets"

export function getMicronutrientTargets(input: {
  age?: number | null
  biologicalSex?: BiologicalSex | null
  weightKg?: number | null
  heightCm?: number | null
}): MicronutrientTargets {
  const age = input.age ?? null
  const sex = input.biologicalSex ?? "other"

  // Always use the same protein calculation as the standalone function
  const proteinTarget = calculateProteinTarget({
    weightKg: input.weightKg ?? undefined,
    heightCm: input.heightCm ?? undefined,
    biologicalSex: input.biologicalSex ?? undefined,
    age: input.age ?? undefined
  })

  // Pragmatic coaching targets (hackathon app): broad age bands + sex-aware iron + personalized protein.
  if (age != null && age >= 9 && age <= 13) {
    return {
      vitaminC_mg_per_day: 45,
      iron_mg_per_day: 8,
      calcium_mg_per_day: 1300,
      potassium_mg_per_day: 2300,
      protein_g_per_day: proteinTarget,
    }
  }
  if (age != null && age >= 14 && age <= 18) {
    return {
      vitaminC_mg_per_day: sex === "male" ? 75 : 65,
      iron_mg_per_day: sex === "female" ? 15 : 11,
      calcium_mg_per_day: 1300,
      potassium_mg_per_day: sex === "male" ? 3000 : 2300,
      protein_g_per_day: proteinTarget,
    }
  }
  if (age != null && age >= 51) {
    return {
      vitaminC_mg_per_day: sex === "male" ? 90 : 75,
      iron_mg_per_day: 8,
      calcium_mg_per_day: sex === "female" ? 1200 : 1000,
      potassium_mg_per_day: sex === "male" ? 3400 : 2600,
      protein_g_per_day: proteinTarget,
    }
  }

  // Adult default (19-50 or unknown age).
  return {
    vitaminC_mg_per_day: sex === "male" ? 90 : 75,
    iron_mg_per_day: sex === "female" ? 18 : 8,
    calcium_mg_per_day: 1000,
    potassium_mg_per_day: sex === "male" ? 3400 : 2600,
    protein_g_per_day: proteinTarget,
  }
}

/**
 * Fallback protein target calculation based on age and sex only
 * Used when weight/height data is not available
 */
function getAgeBasedProteinTarget(age: number | null, sex: BiologicalSex): number {
  if (age != null && age >= 9 && age <= 13) return 34
  if (age != null && age >= 14 && age <= 18) return sex === "male" ? 52 : 46
  if (age != null && age >= 51) return sex === "male" ? 56 : 46
  return sex === "male" ? 56 : 46 // Adult default (19-50)
}
