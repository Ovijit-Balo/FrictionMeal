/**
 * Smart Pause Engine Test Suite
 *
 * Tests the friction logic with realistic scenarios to verify:
 * 1. Early morning false positives are prevented
 * 2. Budget-aware expensive meal detection works
 * 3. Unhealthy meal triggers work correctly
 * 4. Combined triggers (both expensive AND unhealthy) work
 * 5. Edge cases are handled properly
 */

import { evaluateSmartPause, DAILY_SCORE_TARGET, UNHEALTHY_THRESHOLD } from "../lib/frictionEngine"

interface TestCase {
  name: string
  input: {
    todayScore: number
    mealCost: number
    dailyBudget: number
    mealScore: number
    mealsToday?: number
    localHour?: number
    spentToday?: number
  }
  expected: {
    shouldPause: boolean
    reason: "expensive" | "unhealthy" | "both" | null
    isDayOffTrack: boolean
    isMealExpensive: boolean
    isMealUnhealthy: boolean
  }
}

const cases: TestCase[] = [
  // Early morning - should NOT pause even with low score
  {
    name: "Early morning breakfast (8 AM, low score, 0 meals)",
    input: {
      todayScore: 5,
      mealCost: 50,
      dailyBudget: 500,
      mealScore: 8,
      mealsToday: 0,
      localHour: 8,
    },
    expected: {
      shouldPause: false,
      reason: null,
      isDayOffTrack: false,
      isMealExpensive: false,
      isMealUnhealthy: true,
    },
  },

  // Should pause - day off track + unhealthy meal
  {
    name: "Afternoon unhealthy meal (2 PM, off track)",
    input: {
      todayScore: 10,
      mealCost: 100,
      dailyBudget: 500,
      mealScore: 5,
      mealsToday: 2,
      localHour: 14,
    },
    expected: {
      shouldPause: true,
      reason: "unhealthy",
      isDayOffTrack: true,
      isMealExpensive: false,
      isMealUnhealthy: true,
    },
  },

  // Should pause - day off track + expensive meal
  {
    name: "Evening expensive meal (7 PM, off track)",
    input: {
      todayScore: 12,
      mealCost: 200,
      dailyBudget: 500,
      mealScore: 15,
      mealsToday: 2,
      localHour: 19,
      spentToday: 200,
    },
    expected: {
      shouldPause: true,
      reason: "expensive",
      isDayOffTrack: true,
      isMealExpensive: true,
      isMealUnhealthy: false,
    },
  },

  // Should pause - both expensive AND unhealthy
  {
    name: "Late night junk food (10 PM, expensive + unhealthy)",
    input: {
      todayScore: 8,
      mealCost: 250,
      dailyBudget: 500,
      mealScore: 3,
      mealsToday: 3,
      localHour: 22,
      spentToday: 150,
    },
    expected: {
      shouldPause: true,
      reason: "both",
      isDayOffTrack: true,
      isMealExpensive: true,
      isMealUnhealthy: true,
    },
  },

  // Should NOT pause - day on track
  {
    name: "Good day, reasonable meal",
    input: {
      todayScore: 25,
      mealCost: 150,
      dailyBudget: 500,
      mealScore: 12,
      mealsToday: 3,
      localHour: 18,
    },
    expected: {
      shouldPause: false,
      reason: null,
      isDayOffTrack: false,
      isMealExpensive: false,
      isMealUnhealthy: false,
    },
  },

  // Should NOT pause - meal not expensive enough
  {
    name: "Off track but cheap meal",
    input: {
      todayScore: 10,
      mealCost: 80,
      dailyBudget: 500,
      mealScore: 14,
      mealsToday: 2,
      localHour: 15,
    },
    expected: {
      shouldPause: false,
      reason: null,
      isDayOffTrack: true,
      isMealExpensive: false,
      isMealUnhealthy: false,
    },
  },

  // Edge case - exactly at threshold
  {
    name: "Exactly at unhealthy threshold",
    input: {
      todayScore: 14,
      mealCost: 100,
      dailyBudget: 500,
      mealScore: UNHEALTHY_THRESHOLD,
      mealsToday: 2,
      localHour: 14,
    },
    expected: {
      shouldPause: false,
      reason: null,
      isDayOffTrack: true,
      isMealExpensive: false,
      isMealUnhealthy: false,
    },
  },

  // Edge case - exactly at daily score target
  {
    name: "Exactly at daily score target",
    input: {
      todayScore: DAILY_SCORE_TARGET,
      mealCost: 200,
      dailyBudget: 500,
      mealScore: 5,
      mealsToday: 2,
      localHour: 14,
    },
    expected: {
      shouldPause: false,
      reason: null,
      isDayOffTrack: false,
      isMealExpensive: true,
      isMealUnhealthy: true,
    },
  },

  // Budget depletion scenario
  {
    name: "Budget nearly depleted - expensive relative to remaining",
    input: {
      todayScore: 12,
      mealCost: 120,
      dailyBudget: 500,
      mealScore: 14,
      mealsToday: 3,
      localHour: 20,
      spentToday: 400,
    },
    expected: {
      shouldPause: true,
      reason: "expensive",
      isDayOffTrack: true,
      isMealExpensive: true,
      isMealUnhealthy: false,
    },
  },

  // Zero budget edge case
  {
    name: "Zero daily budget",
    input: {
      todayScore: 10,
      mealCost: 100,
      dailyBudget: 0,
      mealScore: 5,
      mealsToday: 2,
      localHour: 14,
    },
    expected: {
      shouldPause: false,
      reason: null,
      isDayOffTrack: true,
      isMealExpensive: false,
      isMealUnhealthy: true,
    },
  },
]

function runTest(testCase: TestCase): boolean {
  const result = evaluateSmartPause(testCase.input)
  const expected = testCase.expected

  const matches = 
    result.shouldPause === expected.shouldPause &&
    result.reason === expected.reason &&
    result.isDayOffTrack === expected.isDayOffTrack &&
    result.isMealExpensive === expected.isMealExpensive &&
    result.isMealUnhealthy === expected.isMealUnhealthy

  if (!matches) {
    console.log(`\n❌ ${testCase.name}`)
    console.log(`   Expected: pause=${expected.shouldPause}, reason=${expected.reason}`)
    console.log(`   Got:      pause=${result.shouldPause}, reason=${result.reason}`)
    console.log(`   Off-track: expected=${expected.isDayOffTrack}, got=${result.isDayOffTrack}`)
    console.log(`   Expensive: expected=${expected.isMealExpensive}, got=${result.isMealExpensive}`)
    console.log(`   Unhealthy: expected=${expected.isMealUnhealthy}, got=${result.isMealUnhealthy}`)
    if (result.rationale.length > 0) {
      console.log(`   Rationale: ${result.rationale.join("; ")}`)
    }
  } else {
    console.log(`✅ ${testCase.name}`)
  }

  return matches
}

async function main() {
  console.log("Smart Pause Engine Test Suite")
  console.log("=" .repeat(50))
  console.log(`Daily score target: ${DAILY_SCORE_TARGET}`)
  console.log(`Unhealthy threshold: ${UNHEALTHY_THRESHOLD}`)
  console.log("=" .repeat(50))

  let passed = 0
  let failed = 0

  for (const testCase of cases) {
    if (runTest(testCase)) {
      passed++
    } else {
      failed++
    }
  }

  console.log("=" .repeat(50))
  console.log(`Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.log("\n⚠️  Some tests failed. Review the friction logic.")
    process.exit(1)
  } else {
    console.log("\n🎉 All tests passed! Smart pause logic is working correctly.")
    process.exit(0)
  }
}

main().catch((error: unknown) => {
  console.error("Test runner error:", error)
  process.exit(1)
})
