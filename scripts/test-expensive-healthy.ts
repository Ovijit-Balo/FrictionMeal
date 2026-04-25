/**
 * Test smart pause behavior with expensive healthy foods
 * Does it trigger pause? Does it show good alternatives?
 */

import { evaluateSmartPause } from "../lib/frictionEngine"
import { lookupMultiple } from "../lib/nutrition/lookup"
import { assessMeal } from "../lib/nutrition/score"
import { suggestAlternatives } from "../lib/nutrition/alternatives"

// Test scenarios: expensive but healthy foods
const expensiveHealthyScenarios = [
  {
    name: "Premium grilled salmon (healthy but expensive)",
    input: {
      todayScore: 12,       // Off track
      mealCost: 450,        // Very expensive
      dailyBudget: 500,     // Daily budget
      mealScore: 18,        // Very healthy
      mealsToday: 2,        // 2 meals logged
      localHour: 19,        // 7 PM
      spentToday: 200,      // Already spent 200
    },
    foods: ["grilled salmon", "quinoa", "vegetables"]
  },
  {
    name: "Organic chicken breast (premium healthy)",
    input: {
      todayScore: 10,       // Off track
      mealCost: 350,        // Expensive
      dailyBudget: 500,     // Daily budget
      mealScore: 16,        // Healthy
      mealsToday: 2,        // 2 meals logged
      localHour: 13,        // 1 PM
      spentToday: 150,      // Already spent 150
    },
    foods: ["chicken", "brown rice", "salad"]
  },
  {
    name: "Premium protein shake (healthy but costly)",
    input: {
      todayScore: 8,        // Off track
      mealCost: 300,        // Expensive
      dailyBudget: 500,     // Daily budget
      mealScore: 15,        // Healthy
      mealsToday: 1,        // 1 meal logged
      localHour: 16,        // 4 PM
      spentToday: 100,      // Already spent 100
    },
    foods: ["protein shake", "banana", "almonds"]
  },
  {
    name: "Fresh fish curry (expensive but nutritious)",
    input: {
      todayScore: 14,       // Slightly off track
      mealCost: 280,        // Expensive
      dailyBudget: 500,     // Daily budget
      mealScore: 17,        // Very healthy
      mealsToday: 2,        // 2 meals logged
      localHour: 20,        // 8 PM
      spentToday: 300,      // Already spent 300
    },
    foods: ["fish", "rice", "spinach"]
  },
  {
    name: "Early morning expensive healthy breakfast",
    input: {
      todayScore: 0,        // No meals yet
      mealCost: 400,        // Very expensive (80% of budget)
      dailyBudget: 500,     // Daily budget
      mealScore: 16,        // Healthy
      mealsToday: 0,        // No meals yet
      localHour: 8,         // 8 AM early
      spentToday: 0,        // Nothing spent yet
    },
    foods: ["eggs", "avocado", "whole grain toast"]
  }
]

async function testExpensiveHealthyScenario(scenario: any) {
  console.log(`\n🍽️  ${scenario.name}`)
  console.log(`   Cost: ৳${scenario.input.mealCost} (${(scenario.input.mealCost/scenario.input.dailyBudget*100).toFixed(0)}% of budget)`)
  console.log(`   Nutrition score: ${scenario.input.mealScore}/20`)
  console.log(`   Time: ${scenario.input.localHour}:00, day score: ${scenario.input.todayScore}`)
  
  // Test smart pause
  const pauseResult = evaluateSmartPause(scenario.input)
  console.log(`   🚦 Smart pause: ${pauseResult.shouldPause ? 'YES' : 'NO'}`)
  console.log(`   📊 Reason: ${pauseResult.reason || 'None'}`)
  console.log(`   💰 Expensive: ${pauseResult.isMealExpensive}`)
  console.log(`   🥗 Unhealthy: ${pauseResult.isMealUnhealthy}`)
  console.log(`   📈 Day off-track: ${pauseResult.isDayOffTrack}`)
  
  if (pauseResult.rationale.length > 0) {
    console.log(`   💭 Rationale: ${pauseResult.rationale.join('; ')}`)
  }
  
  // Test nutrition lookup and alternatives
  console.log(`   🔍 Food analysis:`)
  const foods = await lookupMultiple(scenario.foods)
  if (foods.length === 0) {
    console.log(`     ❌ Foods not found in database`)
    return {
      pauseTriggered: pauseResult.shouldPause,
      isExpensive: pauseResult.isMealExpensive,
      isUnhealthy: pauseResult.isMealUnhealthy,
      alternativesCount: 0,
      actualScore: 0,
    }
  }
  
  const assessment = assessMeal(foods, 1)
  console.log(`     📊 Actual nutrition score: ${assessment.score}/20 (Grade: ${assessment.grade})`)
  console.log(`     🏷️  NOVA group: ${assessment.novaGroup}`)
  console.log(`     🚨 WHO flags: ${assessment.whoFlags.map(f => f.key).join(', ') || 'None'}`)
  
  // Test alternatives
  console.log(`   💡 Alternatives suggested:`)
  const alternatives = suggestAlternatives(foods, assessment.whoFlags)
  
  if (alternatives.length === 0) {
    console.log(`     ✅ No alternatives needed (healthy meal)`)
  } else {
    alternatives.forEach((alt, i) => {
      console.log(`     ${i+1}. ${alt.name} - ${alt.benefit}`)
      console.log(`        ${alt.detail}`)
    })
  }
  
  // Analysis
  console.log(`   📝 Analysis:`)
  if (pauseResult.shouldPause && !pauseResult.isMealUnhealthy) {
    console.log(`     ⚠️  PAUSE TRIGGERED for healthy food due to cost only`)
  } else if (!pauseResult.shouldPause && pauseResult.isMealExpensive) {
    console.log(`     ✅ No pause - healthy food expensive but allowed`)
  } else if (pauseResult.shouldPause && pauseResult.isMealUnhealthy) {
    console.log(`     ❌ Pause triggered - unhealthy (unexpected for healthy food test)`)
  } else {
    console.log(`     ✅ No pause - reasonable cost and nutrition`)
  }
  
  return {
    pauseTriggered: pauseResult.shouldPause,
    isExpensive: pauseResult.isMealExpensive,
    isUnhealthy: pauseResult.isMealUnhealthy,
    alternativesCount: alternatives.length,
    actualScore: assessment.score
  }
}

async function runExpensiveHealthyTest() {
  console.log("💰 EXPENSIVE HEALTHY FOODS TEST")
  console.log("=" .repeat(60))
  console.log("Testing: Does smart pause trigger for expensive but healthy foods?")
  console.log("Testing: Does it show appropriate alternatives?")
  
  const results = []
  
  for (const scenario of expensiveHealthyScenarios) {
    const result = await testExpensiveHealthyScenario(scenario)
    results.push({ ...scenario, ...result })
  }
  
  // Summary analysis
  console.log("\n" + "=" .repeat(60))
  console.log("📊 SUMMARY ANALYSIS")
  
  const pausedCount = results.filter(r => r.pauseTriggered).length
  const expensiveButHealthyCount = results.filter(r => r.isExpensive && !r.isUnhealthy).length
  const expensiveHealthyPausedCount = results.filter(r => r.isExpensive && !r.isUnhealthy && r.pauseTriggered).length
  
  console.log(`\n🍽️  Scenarios tested: ${results.length}`)
  console.log(`⏸️  Smart pause triggered: ${pausedCount}/${results.length}`)
  console.log(`💰 Expensive but healthy: ${expensiveButHealthyCount}/${results.length}`)
  console.log(`⚠️  Expensive healthy paused: ${expensiveHealthyPausedCount}/${results.length}`)
  
  console.log(`\n🔍 DETAILED BREAKDOWN:`)
  results.forEach((result, i) => {
    const status = result.pauseTriggered ? 'PAUSED' : 'ALLOWED'
    const reason = result.isExpensive ? '(expensive)' : result.isUnhealthy ? '(unhealthy)' : '(reasonable)'
    console.log(`   ${i+1}. ${result.name}: ${status} ${reason}`)
  })
  
  console.log(`\n💡 ALTERNATIVES ANALYSIS:`)
  const withAlternatives = results.filter(r => r.alternativesCount > 0)
  const withoutAlternatives = results.filter(r => r.alternativesCount === 0)
  
  console.log(`   ✅ No alternatives needed: ${withoutAlternatives.length} cases`)
  console.log(`   💡 Alternatives suggested: ${withAlternatives.length} cases`)
  
  if (expensiveHealthyPausedCount > 0) {
    console.log(`\n⚠️  ISSUE FOUND: Smart pause triggers for expensive healthy foods!`)
    console.log(`   This might frustrate users buying premium nutritious options.`)
  } else {
    console.log(`\n✅ GOOD: Smart pause doesn't trigger for expensive healthy foods`)
  }
  
  console.log(`\n🎯 RECOMMENDATIONS:`)
  if (expensiveHealthyPausedCount > 0) {
    console.log(`   • Consider reducing cost threshold for healthy foods`)
    console.log(`   • Add nutrition quality factor to expensive calculation`)
    console.log(`   • Show 'premium healthy' alternatives instead of blocking`)
  } else {
    console.log(`   • Current logic appropriately handles expensive healthy foods`)
    console.log(`   • Alternatives system correctly identifies when not needed`)
  }
}

runExpensiveHealthyTest().catch(console.error)
