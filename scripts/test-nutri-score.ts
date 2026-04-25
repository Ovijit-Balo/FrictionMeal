/**
 * Sanity test: verify the Nutri-Score implementation against published
 * reference values from Santé Publique France and Open Food Facts.
 *
 * Nutrient values below come from the Open Food Facts product database
 * (public domain) and USDA FoodData Central; grade expectations match the
 * 2017 Santé Publique France algorithm.
 *
 * Run:  npx tsx scripts/test-nutri-score.ts
 */
import { computeNutriScore, type NutriScoreInput } from "../lib/nutrition/nutriScore"

type Case = {
  name: string
  input: NutriScoreInput
  expectedGrade: "A" | "B" | "C" | "D" | "E"
  expectedRange: [number, number]
}

const cases: Case[] = [
  {
    // USDA 11090 — raw broccoli florets
    name: "Raw broccoli (per 100 g)",
    input: {
      energy_kcal: 34,
      sat_fat_g: 0.1,
      sugars_g: 1.7,
      sodium_mg: 33,
      fiber_g: 2.6,
      protein_g: 2.8,
      fruit_veg_legume_pct: 100,
    },
    expectedGrade: "A",
    expectedRange: [-15, -4],
  },
  {
    // USDA 05062 — chicken breast, grilled
    name: "Grilled chicken breast (per 100 g)",
    input: {
      energy_kcal: 165,
      sat_fat_g: 1.1,
      sugars_g: 0,
      sodium_mg: 74,
      fiber_g: 0,
      protein_g: 31,
      fruit_veg_legume_pct: 0,
    },
    expectedGrade: "A",
    expectedRange: [-5, 2],
  },
  {
    // OFF — Dr. Oetker Ristorante Margherita (grades D on OFF)
    name: "Frozen Margherita pizza (per 100 g)",
    input: {
      energy_kcal: 280,
      sat_fat_g: 8,
      sugars_g: 3,
      sodium_mg: 440,
      fiber_g: 1,
      protein_g: 10,
      fruit_veg_legume_pct: 0,
    },
    expectedGrade: "D",
    expectedRange: [11, 18],
  },
  {
    // OFF — Classic Coca Cola (grades E on OFF)
    name: "Cola / sugary soda (per 100 mL)",
    input: {
      energy_kcal: 43,
      sat_fat_g: 0,
      sugars_g: 10.6,
      sodium_mg: 4,
      fiber_g: 0,
      protein_g: 0,
      fruit_veg_legume_pct: 0,
      isBeverage: true,
    },
    expectedGrade: "E",
    expectedRange: [10, 20],
  },
  {
    // OFF — Lay's Classic salted potato chips (grades D on OFF)
    name: "Potato chips, salted (per 100 g)",
    input: {
      energy_kcal: 540,
      sat_fat_g: 6,
      sugars_g: 0,
      sodium_mg: 594,
      fiber_g: 4,
      protein_g: 6,
      fruit_veg_legume_pct: 0,
    },
    expectedGrade: "D",
    expectedRange: [11, 18],
  },
  {
    // OFF — Wonder Bread-style packaged whole-wheat loaf (grades B on OFF)
    name: "Packaged whole-wheat bread (per 100 g)",
    input: {
      energy_kcal: 250,
      sat_fat_g: 1,
      sugars_g: 6,
      sodium_mg: 540,
      fiber_g: 3,
      protein_g: 10,
      fruit_veg_legume_pct: 0,
    },
    expectedGrade: "B",
    expectedRange: [0, 2],
  },
]

let pass = 0
let fail = 0
for (const c of cases) {
  const r = computeNutriScore(c.input)
  const gradeOk = r.grade === c.expectedGrade
  const rangeOk = r.points >= c.expectedRange[0] && r.points <= c.expectedRange[1]
  const ok = gradeOk && rangeOk
  if (ok) pass++
  else fail++
  const status = ok ? "PASS" : "FAIL"
  console.log(
    `[${status}] ${c.name}  →  grade=${r.grade} (expected ${c.expectedGrade}), points=${r.points} (expected ${c.expectedRange[0]}..${c.expectedRange[1]})`,
  )
  if (!ok) {
    console.log(
      `   negative=${JSON.stringify(r.breakdown.negative)} positive=${JSON.stringify(r.breakdown.positive)}`,
    )
  }
}
console.log(`\n${pass}/${pass + fail} cases passed.`)
process.exit(fail === 0 ? 0 : 1)
