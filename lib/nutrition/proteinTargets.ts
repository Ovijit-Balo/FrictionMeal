/**
 * Personalized protein target calculation based on user anthropometrics
 * 
 * Uses weight, height, and biological sex to calculate personalized protein targets
 * with safe fallbacks to WHO/FAO standards when data is missing.
 * 
 * Scientific basis:
 * - WHO/FAO/UNU (2007): 0.83 g/kg/day for adults
 * - Adjustments for biological sex based on typical body composition
 * - Height-based estimation when weight is missing
 * - Safe minimums and maximums to prevent extreme values
 */

export interface UserProfile {
  weightKg?: number
  heightCm?: number
  biologicalSex?: "female" | "male" | "other"
  age?: number
}

/**
 * Calculate personalized protein target in grams per day
 * 
 * Priority order:
 * 1. Use actual weight if available (most accurate)
 * 2. Estimate weight from height + sex if weight missing
 * 3. Use safe default (50g) if both missing
 */
export function calculateProteinTarget(profile: UserProfile): number {
  const { weightKg, heightCm, biologicalSex, age } = profile

  // Method 1: Direct weight-based calculation (most accurate)
  if (weightKg && weightKg >= 20 && weightKg <= 300) {
    return calculateFromWeight(weightKg, biologicalSex, age)
  }

  // Method 2: Height-based estimation when weight missing
  if (heightCm && heightCm >= 100 && heightCm <= 250 && biologicalSex) {
    const estimatedWeight = estimateWeightFromHeight(heightCm, biologicalSex)
    return calculateFromWeight(estimatedWeight, biologicalSex, age)
  }

  // Method 3: Safe fallback
  return 50 // WHO standard for 60kg reference adult
}

/**
 * Calculate protein target from actual weight
 */
function calculateFromWeight(weightKg: number, biologicalSex?: string, age?: number): number {
  // Base protein requirement: 0.83 g/kg/day (WHO/FAO/UNU 2007)
  let proteinPerKg = 0.83

  // Adjust for biological sex based on typical body composition
  if (biologicalSex === "male") {
    proteinPerKg = 0.84 // Slightly higher due to typically higher lean mass
  } else if (biologicalSex === "female") {
    proteinPerKg = 0.82 // Slightly lower due to typically higher fat percentage
  }
  // "other" uses base 0.83

  // Age adjustment (minimal for adults, more significant for elderly)
  if (age && age >= 65) {
    proteinPerKg *= 1.2 // 20% increase for elderly to prevent sarcopenia
  }

  const target = weightKg * proteinPerKg

  // Apply safety bounds
  return Math.max(25, Math.min(200, target)) // Min 25g, Max 200g per day
}

/**
 * Estimate weight from height using anthropometric formulas
 * Uses sex-specific healthy BMI ranges (18.5-24.9)
 */
function estimateWeightFromHeight(heightCm: number, biologicalSex: string): number {
  const heightM = heightCm / 100
  
  // Use midpoint of healthy BMI range (22.0) as reference
  // Slight adjustments for sex differences in typical body composition
  let bmiReference = 22.0
  
  if (biologicalSex === "male") {
    bmiReference = 22.5 // Men typically have slightly higher BMI at same height
  } else if (biologicalSex === "female") {
    bmiReference = 21.5 // Women typically have slightly lower BMI at same height
  }

  const estimatedWeight = bmiReference * heightM * heightM
  
  // Apply reasonable bounds
  return Math.max(40, Math.min(150, estimatedWeight))
}

/**
 * Calculate personalized per-meal protein target
 * Assumes 3 meals per day distribution
 */
export function calculatePerMealProteinTarget(profile: UserProfile): number {
  const dailyTarget = calculateProteinTarget(profile)
  return dailyTarget / 3
}

/**
 * Get protein target calculation method used
 * Useful for UI to show confidence level
 */
export function getProteinTargetMethod(profile: UserProfile): "direct" | "estimated" | "default" {
  if (profile.weightKg && profile.weightKg >= 20 && profile.weightKg <= 300) {
    return "direct"
  }
  
  if (profile.heightCm && profile.heightCm >= 100 && profile.heightCm <= 250 && profile.biologicalSex) {
    return "estimated"
  }
  
  return "default"
}

/**
 * Get explanation of protein target calculation
 * Useful for UI tooltips and educational content
 */
export function getProteinTargetExplanation(profile: UserProfile): string {
  const method = getProteinTargetMethod(profile)
  const target = calculateProteinTarget(profile)
  
  switch (method) {
    case "direct":
      return `Based on your weight (${profile.weightKg}kg): ${target.toFixed(1)}g protein/day using WHO/FAO standards (0.83g/kg).`
    
    case "estimated":
      return `Estimated from your height (${profile.heightCm}cm, ${profile.biologicalSex}): ${target.toFixed(1)}g protein/day using healthy BMI reference.`
    
    case "default":
      return `Using standard reference: ${target}g protein/day (WHO baseline for average adult).`
  }
}

/**
 * Update WHO targets with personalized protein values
 * This integrates with the existing WHO targets system
 */
export function getPersonalizedWhoTargets(profile: UserProfile) {
  const proteinTarget = calculateProteinTarget(profile)
  
  return {
    // Keep all existing WHO targets the same
    saturatedFat_g_per_day: 22,
    freeSugars_g_per_day: 50,
    sodium_mg_per_day: 2000,
    fiber_g_per_day: 25,
    fruitsVeg_g_per_day: 400,
    vitaminC_mg_per_day: 75,
    iron_mg_per_day: 18,
    calcium_mg_per_day: 1000,
    potassium_mg_per_day: 3500,
    
    // Override protein with personalized calculation
    protein_g_per_day: proteinTarget,
  }
}
