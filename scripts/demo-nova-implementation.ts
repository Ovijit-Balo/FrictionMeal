/**
 * Demo: How NOVA 4 is implemented in the system
 */

import { inferNovaFromName, novaAdjustment, novaLabel } from "../lib/nutrition/nova"
import { computeNutriScore, gradeToPoints } from "../lib/nutrition/nutriScore"

console.log("🔬 NOVA 4 IMPLEMENTATION DEMO")
console.log("=" .repeat(50))

// 1. How NOVA classification works
console.log("\n📋 1. NOVA CLASSIFICATION KEYWORDS")
console.log("Ultra-processed keywords that trigger NOVA 4:")

const ultraKeywords = [
  "soft drink", "soda", "cola", "pepsi", "sprite", "coke",
  "chips", "crisps", "fries", "french fries", 
  "burger", "hamburger", "cheeseburger", "pizza",
  "instant noodle", "ramen", "packaged", "nugget",
  "sausage", "hot dog", "biscuit", "cookie", "candy",
  "chocolate bar", "ice cream", "cereal bar", 
  "energy drink", "frozen meal"
]

ultraKeywords.forEach(keyword => {
  console.log(`   • "${keyword}" → NOVA 4`)
})

// 2. Classification examples
console.log("\n🔍 2. CLASSIFICATION EXAMPLES")
const testFoods = [
  "pizza",
  "burger", 
  "rice",
  "apple",
  "soft drink",
  "chips",
  "fried chicken",
  "instant noodle"
]

testFoods.forEach(food => {
  const nova = inferNovaFromName(food)
  console.log(`   "${food}" → NOVA ${nova} (${novaLabel(nova)})`)
})

// 3. NOVA penalty system
console.log("\n⚖️  3. NOVA PENALTY SYSTEM")
console.log("How NOVA groups affect nutrition scores:")

const novaGroups: [1, 2, 3, 4] = [1, 2, 3, 4]
novaGroups.forEach(group => {
  const adjustment = novaAdjustment(group)
  const label = novaLabel(group)
  console.log(`   NOVA ${group} (${label}): ${adjustment > 0 ? '+' : ''}${adjustment} points`)
})

// 4. Real scoring example
console.log("\n🍕 4. REAL SCORING EXAMPLE: PIZZA")
console.log("Step-by-step how pizza gets its low score:")

// Pizza nutrition (from database)
const pizzaNutrition = {
  energy_kcal: 319,
  sat_fat_g: 6.7,
  sugars_g: 4.3,
  sodium_mg: 718,
  fiber_g: 2.8,
  protein_g: 13.7,
  fruit_veg_legume_pct: 10,
  isBeverage: false
}

// Step 1: Calculate Nutri-Score
const nutriScore = computeNutriScore(pizzaNutrition)
const basePoints = gradeToPoints(nutriScore.grade)

console.log(`   Step 1 - Nutri-Score: ${nutriScore.grade} (${nutriScore.points} points)`)
console.log(`   Step 2 - Base points: ${basePoints}`)

// Step 3: Apply NOVA penalty
const novaGroup = inferNovaFromName("pizza")
const novaPenalty = novaAdjustment(novaGroup)
const adjustedPoints = basePoints + novaPenalty

console.log(`   Step 3 - NOVA ${novaGroup} penalty: ${novaPenalty > 0 ? '+' : ''}${novaPenalty} points`)
console.log(`   Step 4 - Adjusted points: ${adjustedPoints}`)

// Step 4: Final score
const finalScore = Math.max(0, Math.min(20, Math.round(adjustedPoints)))
console.log(`   Step 5 - Final score: ${finalScore}/20`)

// 5. Comparison: Same nutrition without NOVA penalty
console.log("\n🔄 5. COMPARISON: SAME NUTRITION WITHOUT NOVA PENALTY")
console.log("If pizza had NOVA 1 (natural food) instead of NOVA 4:")

const nova1Penalty = novaAdjustment(1)
const nova1Adjusted = basePoints + nova1Penalty
const nova1Final = Math.max(0, Math.min(20, Math.round(nova1Adjusted)))

console.log(`   With NOVA 1: ${nova1Final}/20 (vs ${finalScore}/20 with NOVA 4)`)
console.log(`   Difference: ${nova1Final - finalScore} points (${((nova1Final - finalScore) / 20 * 100).toFixed(0)}%)`)

// 6. Smart pause integration
console.log("\n⏸️  6. SMART PAUSE INTEGRATION")
console.log("How NOVA 4 triggers smart pause:")

console.log("   • NOVA 4 foods get -5 penalty → lower nutrition scores")
console.log("   • Lower scores (< 10) trigger 'unhealthy' flag")
console.log("   • 'Unhealthy' + 'day off-track' = smart pause")
console.log("   • Early morning override: NOVA 4 + >50% budget = pause")

// 7. Scientific backing
console.log("\n📚 7. SCIENTIFIC BACKING")
console.log("NOVA 4 penalty based on peer-reviewed research:")
console.log("   • Srour B. et al. (2019) - BMJ: Cardiovascular disease risk")
console.log("   • Rico-Campà A. et al. (2019) - BMJ: All-cause mortality")
console.log("   • Monteiro CA. et al. (2019) - FAO: Official guidelines")
console.log("   • Pagliai G. et al. (2021) - British Journal of Nutrition: Meta-analysis")

console.log("\n" + "=" .repeat(50))
console.log("✅ NOVA 4 IMPLEMENTATION SUMMARY:")
console.log("   1. Keyword-based classification (29 junk food keywords)")
console.log("   2. -5 point penalty in nutrition scoring")
console.log("   3. Triggers smart pause when combined with other factors")
console.log("   4. Scientifically validated with peer-reviewed research")
console.log("   5. Evidence-based approach to reducing ultra-processed food intake")
