/**
 * Real-world test: Can user add expensive junk food without friction?
 */

import { evaluateSmartPause } from "../lib/frictionEngine"

// Test scenario: User with low daily score tries to add expensive junk food
const realWorldScenarios = [
  {
    name: "Morning - No meals logged yet, tries expensive junk food",
    input: {
      todayScore: 0,        // No meals logged today
      mealCost: 300,        // Expensive junk food
      dailyBudget: 500,     // Reasonable daily budget
      mealScore: 2,         // Very unhealthy (junk food)
      mealsToday: 0,        // No meals yet
      localHour: 9,         // 9 AM
      spentToday: 0,
    }
  },
  {
    name: "Afternoon - Already off track, tries expensive junk food",
    input: {
      todayScore: 8,        // Already off track (target is 15)
      mealCost: 350,        // Very expensive junk food
      dailyBudget: 500,     // Reasonable daily budget
      mealScore: 1,         // Extremely unhealthy
      mealsToday: 2,        // Has logged 2 meals already
      localHour: 14,        // 2 PM
      spentToday: 200,      // Already spent 200
    }
  },
  {
    name: "Evening - Budget nearly gone, tries expensive junk food",
    input: {
      todayScore: 10,       // Off track
      mealCost: 400,        // Very expensive
      dailyBudget: 500,     // Daily budget
      mealScore: 3,         // Unhealthy
      mealsToday: 3,        // 3 meals logged
      localHour: 20,        // 8 PM
      spentToday: 450,      // Almost spent entire budget
    }
  },
  {
    name: "Late night - Way over budget, tries junk food",
    input: {
      todayScore: 12,       // Off track
      mealCost: 500,        // Entire daily budget on one meal
      dailyBudget: 500,     // Daily budget
      mealScore: 0,         // Worst possible score
      mealsToday: 3,        // 3 meals logged
      localHour: 23,        // 11 PM
      spentToday: 400,      // Already spent 400
    }
  }
]

function testScenario(scenario: any) {
  console.log(`\n🧪 ${scenario.name}`)
  console.log(`   Input: score=${scenario.input.todayScore}, cost=${scenario.input.mealCost}, budget=${scenario.input.dailyBudget}`)
  console.log(`   Time: ${scenario.input.localHour}:00, meals today: ${scenario.input.mealsToday}, spent: ${scenario.input.spentToday}`)
  
  const result = evaluateSmartPause(scenario.input)
  
  console.log(`   🚦 Should pause: ${result.shouldPause ? 'YES' : 'NO'}`)
  console.log(`   📊 Reason: ${result.reason}`)
  console.log(`   💰 Expensive: ${result.isMealExpensive}`)
  console.log(`   🍔 Unhealthy: ${result.isMealUnhealthy}`)
  console.log(`   📈 Day off-track: ${result.isDayOffTrack}`)
  
  if (result.rationale.length > 0) {
    console.log(`   💭 Rationale: ${result.rationale.join('; ')}`)
  }
  
  if (!result.shouldPause) {
    console.log(`   ❌ PROBLEM: User can add expensive junk food WITHOUT friction!`)
  }
  
  return result.shouldPause
}

console.log("🔍 TESTING REAL-WORLD JUNK FOOD SCENARIOS")
console.log("=" .repeat(60))

let allPaused = true

for (const scenario of realWorldScenarios) {
  const paused = testScenario(scenario)
  if (!paused) allPaused = false
}

console.log("\n" + "=" .repeat(60))
if (allPaused) {
  console.log("✅ All scenarios properly trigger smart pause")
} else {
  console.log("❌ SOME SCENARIOS ALLOW JUNK FOOD WITHOUT FRICTION")
  console.log("🚨 THIS IS A SERIOUS BUG - Users can bypass friction!")
}

process.exit(allPaused ? 0 : 1)
