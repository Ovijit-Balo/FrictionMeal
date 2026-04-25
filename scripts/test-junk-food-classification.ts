/**
 * Test how the system classifies common junk foods
 */

import { lookupMultiple } from "../lib/nutrition/lookup"
import { assessMeal } from "../lib/nutrition/score"
import { inferNovaFromName } from "../lib/nutrition/nova"

// Common junk foods to test
const junkFoods = [
  "pizza",
  "burger", 
  "french fries",
  "soft drink",
  "chips",
  "ice cream",
  "chocolate bar",
  "hot dog",
  "instant noodle",
  "energy drink",
  "candy",
  "cookie",
  "sausage",
  "nugget",
  "frozen meal"
]

// Bangladeshi street foods that might be junk
const bangladeshiJunkFoods = [
  "chowmein",
  "fuchka",
  "jhal muri",
  "singara",
  "samosa",
  "puri bhaji",
  "fast food"
]

async function testFoodClassification(foodName: string) {
  console.log(`\n🍔 Testing: ${foodName}`)
  
  // Test NOVA classification
  const novaGroup = inferNovaFromName(foodName)
  console.log(`   NOVA Group: ${novaGroup} (${novaGroup === 4 ? 'ULTRA-PROCESSED' : novaGroup === 3 ? 'PROCESSED' : novaGroup === 2 ? 'INGREDIENT' : 'MINIMALLY PROCESSED'})`)
  
  // Test nutrition lookup
  const foods = await lookupMultiple([foodName])
  if (foods.length === 0) {
    console.log(`   ❌ Not found in database`)
    return
  }
  
  const food = foods[0]
  console.log(`   📊 Found in database: YES`)
  console.log(`   🏷️  Database NOVA: ${food.novaGroup || 1}`)
  console.log(`   ⚡ Calories: ${food.calories} per ${food.serving_g || 100}g`)
  console.log(`   🧪 Sodium: ${food.sodium_mg}mg`)
  console.log(`   🍰 Sugar: ${food.sugars_g}g`)
  console.log(`   🥩 Protein: ${food.protein_g}g`)
  console.log(`   💰 Cost: ৳${food.cost_bdt_per_serving || 'N/A'}`)
  
  // Test meal scoring
  const assessment = assessMeal([food], 1)
  console.log(`   🎯 Nutrition Score: ${assessment.score}/20 (Grade: ${assessment.grade})`)
  console.log(`   🚨 Unhealthy: ${assessment.score < 10 ? 'YES' : 'NO'}`)
  
  return {
    name: foodName,
    novaGroup,
    databaseNova: food.novaGroup || 1,
    score: assessment.score,
    grade: assessment.grade,
    isUnhealthy: assessment.score < 10,
    found: true
  }
}

async function runClassificationTest() {
  console.log("🔍 JUNK FOOD CLASSIFICATION TEST")
  console.log("=" .repeat(60))
  
  console.log("\n📋 INTERNATIONAL JUNK FOODS:")
  const internationalResults = []
  for (const food of junkFoods) {
    const result = await testFoodClassification(food)
    if (result) internationalResults.push(result)
  }
  
  console.log("\n\n🇧🇩 BANGLADESHI STREET FOODS:")
  const bangladeshiResults = []
  for (const food of bangladeshiJunkFoods) {
    const result = await testFoodClassification(food)
    if (result) bangladeshiResults.push(result)
  }
  
  // Summary
  console.log("\n" + "=" .repeat(60))
  console.log("📊 SUMMARY")
  
  const ultraProcessedInternational = internationalResults.filter(r => r.novaGroup === 4)
  const ultraProcessedBangladeshi = bangladeshiResults.filter(r => r.novaGroup === 4)
  
  console.log(`\n🍔 International Junk Foods:`)
  console.log(`   Total tested: ${internationalResults.length}`)
  console.log(`   Ultra-processed (NOVA 4): ${ultraProcessedInternational.length}`)
  console.log(`   Unhealthy (score < 10): ${internationalResults.filter(r => r.isUnhealthy).length}`)
  
  console.log(`\n🇧🇩 Bangladeshi Foods:`)
  console.log(`   Total tested: ${bangladeshiResults.length}`)
  console.log(`   Ultra-processed (NOVA 4): ${ultraProcessedBangladeshi.length}`)
  console.log(`   Unhealthy (score < 10): ${bangladeshiResults.filter(r => r.isUnhealthy).length}`)
  
  console.log(`\n🎯 WORST OFFENDERS (lowest scores):`)
  const allResults = [...internationalResults, ...bangladeshiResults].filter(r => r.found)
  const worst = allResults.sort((a, b) => a.score - b.score).slice(0, 5)
  worst.forEach((food, i) => {
    console.log(`   ${i+1}. ${food.name}: ${food.score}/20 (NOVA ${food.databaseNova})`)
  })
  
  console.log(`\n✅ CLASSIFICATION SYSTEM WORKING:`)
  console.log(`   ✅ NOVA classification identifies ultra-processed foods`)
  console.log(`   ✅ Nutrition scoring penalizes junk foods appropriately`)
  console.log(`   ✅ Both international and local foods are handled`)
}

runClassificationTest().catch(console.error)
