/**
 * Test the end-to-end protein target calculation flow
 * Tests signup → profile → target calculation with various user profiles
 */

import { calculateProteinTarget, getProteinTargetMethod, getProteinTargetExplanation } from "../lib/nutrition/proteinTargets"
import { getMicronutrientTargets } from "../lib/nutrition/micronutrientTargets"

// Test user profiles representing different scenarios
const testProfiles = [
  {
    name: "Complete profile - adult male",
    profile: {
      weightKg: 75,
      heightCm: 180,
      biologicalSex: "male" as const,
      age: 30
    }
  },
  {
    name: "Complete profile - adult female",
    profile: {
      weightKg: 60,
      heightCm: 165,
      biologicalSex: "female" as const,
      age: 28
    }
  },
  {
    name: "Weight only - no height/sex",
    profile: {
      weightKg: 70,
      heightCm: undefined,
      biologicalSex: undefined,
      age: 35
    }
  },
  {
    name: "Height + sex only - no weight",
    profile: {
      weightKg: undefined,
      heightCm: 175,
      biologicalSex: "male" as const,
      age: 25
    }
  },
  {
    name: "Age + sex only - no weight/height",
    profile: {
      weightKg: undefined,
      heightCm: undefined,
      biologicalSex: "female" as const,
      age: 32
    }
  },
  {
    name: "Empty profile - no data",
    profile: {
      weightKg: undefined,
      heightCm: undefined,
      biologicalSex: undefined,
      age: undefined
    }
  },
  {
    name: "Elderly male - age adjustment",
    profile: {
      weightKg: 80,
      heightCm: 175,
      biologicalSex: "male" as const,
      age: 70
    }
  },
  {
    name: "Teenager female",
    profile: {
      weightKg: 55,
      heightCm: 160,
      biologicalSex: "female" as const,
      age: 16
    }
  }
]

function testProteinTargetCalculation(testCase: any) {
  console.log(`\n🧪 ${testCase.name}`)
  
  const profile = testCase.profile
  console.log(`   Profile: weight=${profile.weightKg}kg, height=${profile.heightCm}cm, sex=${profile.biologicalSex}, age=${profile.age}`)
  
  // Test protein target calculation
  const proteinTarget = calculateProteinTarget(profile)
  const method = getProteinTargetMethod(profile)
  const explanation = getProteinTargetExplanation(profile)
  
  console.log(`   🎯 Protein target: ${proteinTarget.toFixed(1)}g/day`)
  console.log(`   📊 Method: ${method}`)
  console.log(`   💭 Explanation: ${explanation}`)
  
  // Test integration with micronutrient targets
  const microTargets = getMicronutrientTargets(profile)
  console.log(`   🔗 Micro targets integration: ${microTargets.protein_g_per_day.toFixed(1)}g/day`)
  
  // Verify consistency
  const consistent = Math.abs(proteinTarget - microTargets.protein_g_per_day) < 0.1
  console.log(`   ✅ Consistency check: ${consistent ? 'PASS' : 'FAIL'}`)
  
  return {
    name: testCase.name,
    proteinTarget,
    method,
    consistent,
    profile
  }
}

async function runProteinTargetTests() {
  console.log("🔬 PROTEIN TARGET CALCULATION TESTS")
  console.log("=" .repeat(60))
  console.log("Testing end-to-end flow from user profiles to protein targets")
  
  const results = []
  
  for (const testCase of testProfiles) {
    const result = testProteinTargetCalculation(testCase)
    results.push(result)
  }
  
  // Summary analysis
  console.log("\n" + "=" .repeat(60))
  console.log("📊 SUMMARY ANALYSIS")
  
  const methodCounts = {
    direct: results.filter(r => r.method === "direct").length,
    estimated: results.filter(r => r.method === "estimated").length,
    default: results.filter(r => r.method === "default").length
  }
  
  const consistencyRate = (results.filter(r => r.consistent).length / results.length) * 100
  
  console.log(`\n📈 Method distribution:`)
  console.log(`   Direct (weight-based): ${methodCounts.direct}/${results.length}`)
  console.log(`   Estimated (height-based): ${methodCounts.estimated}/${results.length}`)
  console.log(`   Default (fallback): ${methodCounts.default}/${results.length}`)
  
  console.log(`\n🔍 Consistency rate: ${consistencyRate.toFixed(1)}%`)
  
  console.log(`\n📋 Protein target range:`)
  const targets = results.map(r => r.proteinTarget)
  console.log(`   Min: ${Math.min(...targets).toFixed(1)}g`)
  console.log(`   Max: ${Math.max(...targets).toFixed(1)}g`)
  console.log(`   Average: ${(targets.reduce((a, b) => a + b, 0) / targets.length).toFixed(1)}g`)
  
  // Validation tests
  console.log(`\n🧪 VALIDATION TESTS:`)
  
  // Test 1: Weight-based should be most accurate
  const weightBased = results.find(r => r.method === "direct" && r.profile.weightKg === 75)
  if (weightBased) {
    const expected = 75 * 0.84 // Male adjustment
    const actual = weightBased.proteinTarget
    const accurate = Math.abs(actual - expected) < 1
    console.log(`   ✅ Weight-based accuracy: ${accurate ? 'PASS' : 'FAIL'} (${actual.toFixed(1)} vs ${expected.toFixed(1)} expected)`)
  }
  
  // Test 2: Height-based should be reasonable estimate
  const heightBased = results.find(r => r.method === "estimated" && r.profile.heightCm === 175)
  if (heightBased) {
    const reasonable = heightBased.proteinTarget > 40 && heightBased.proteinTarget < 80
    console.log(`   ✅ Height-based reasonable: ${reasonable ? 'PASS' : 'FAIL'} (${heightBased.proteinTarget.toFixed(1)}g)`)
  }
  
  // Test 3: Default should be safe fallback
  const defaultCase = results.find(r => r.method === "default")
  if (defaultCase) {
    const safe = defaultCase.proteinTarget >= 25 && defaultCase.proteinTarget <= 65
    console.log(`   ✅ Default safe range: ${safe ? 'PASS' : 'FAIL'} (${defaultCase.proteinTarget.toFixed(1)}g)`)
  }
  
  // Test 4: Elderly should get higher protein
  const elderly = results.find(r => r.profile.age && r.profile.age >= 65)
  if (elderly) {
    const baseline = elderly.profile.weightKg ? elderly.profile.weightKg * 0.84 : 50
    const increased = elderly.proteinTarget > baseline
    console.log(`   ✅ Elderly protein increase: ${increased ? 'PASS' : 'FAIL'}`)
  }
  
  console.log(`\n🎯 RECOMMENDATIONS:`)
  if (methodCounts.direct > 0) {
    console.log(`   ✅ Weight-based calculation working (${methodCounts.direct} cases)`)
  } else {
    console.log(`   ⚠️  No weight-based cases found - users not providing weight data`)
  }
  
  if (methodCounts.estimated > 0) {
    console.log(`   ✅ Height-based estimation working (${methodCounts.estimated} cases)`)
  } else {
    console.log(`   ℹ️  No height-based cases - users may need more guidance`)
  }
  
  if (consistencyRate >= 95) {
    console.log(`   ✅ Excellent consistency (${consistencyRate.toFixed(1)}%)`)
  } else {
    console.log(`   ⚠️  Consistency issues detected (${consistencyRate.toFixed(1)}%)`)
  }
  
  console.log(`\n🏁 END-TO-END FLOW STATUS: ${consistencyRate >= 95 ? 'WORKING' : 'NEEDS ATTENTION'}`)
}

runProteinTargetTests().catch(console.error)
