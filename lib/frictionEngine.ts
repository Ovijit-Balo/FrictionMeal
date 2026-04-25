/**
 * Smart Pause Engine
 *
 * Decides when to gently interrupt a food decision with a 10-second pause
 * and a reflection prompt. The trigger combines three independent signals:
 *
 *   1. The day is *off-track* — today's accumulated score is below target
 *      AND the user has enough context for the verdict to be meaningful
 *      (either they've logged multiple meals already, or it is late enough
 *      in the day that a low score matters).
 *   2. The meal is *expensive* — it consumes a large share of what's left
 *      in today's budget (preferred) or of the daily budget.
 *   3. The meal is *unhealthy* — its Nutri-Score + NOVA composite is low.
 *
 *   Pause → off-track AND (expensive OR unhealthy).
 *
 * Prior versions fired on every breakfast because `todayScore < 15` is
 * trivially true when no meals have been logged yet. The meal-count /
 * hour gate removes that false-positive without losing sensitivity.
 */

export interface SmartPauseInput {
  /** Sum of nutrition scores logged so far today (0-60 typical). */
  todayScore: number
  /** Cost of the meal the user is about to log. */
  mealCost: number
  /** dailyBudget = user's monthly budget / 30. */
  dailyBudget: number
  /** 0-20 Nutri-Score + NOVA composite of the candidate meal. */
  mealScore: number

  // ── New, optional context ────────────────────────────────────────────
  /**
   * Number of meals already logged today. Used to suppress the
   * "off-track" verdict when we don't have enough data yet.
   * Defaults to 0 if omitted (preserves old behaviour).
   */
  mealsToday?: number

  /**
   * Hour-of-day (0-23) in the user's local timezone. Used to suppress
   * the "off-track" verdict early in the morning when a low cumulative
   * score is expected. Defaults to 24 (i.e. "late enough") so callers
   * that don't pass it keep the old behaviour.
   */
  localHour?: number

  /**
   * Amount the user has already spent today. When provided, the
   * expensive-meal threshold uses *remaining* budget instead of the
   * full daily budget — a BDT 200 meal is not expensive at 9 AM but
   * is at 9 PM when BDT 250 has already been spent.
   */
  spentToday?: number
}

export interface SmartPauseResult {
  shouldPause: boolean
  reason: "expensive" | "unhealthy" | "both" | null
  triggerType: "offtrack_combo" | "budget_overrun" | "high_risk_combo" | null
  isDayOffTrack: boolean
  isMealExpensive: boolean
  isMealUnhealthy: boolean
  isOverBudget: boolean
  /** Explanation strings for UI / debugging. */
  rationale: string[]
}

/**
 * Target cumulative nutrition score before the day is considered on-track.
 * 15/60 ≈ 25 % — consistent with the 0-20 per-meal scale across ~4 meals.
 */
export const DAILY_SCORE_TARGET = 15

/** Expensive if cost exceeds this share of daily OR remaining budget. */
export const EXPENSIVE_SHARE_OF_DAILY = 0.33
export const EXPENSIVE_SHARE_OF_REMAINING = 0.5

/** Composite meal-score threshold (0-20). */
export const UNHEALTHY_THRESHOLD = 10

/** Only consider the day "off-track" once we have this much evidence. */
export const MIN_MEALS_BEFORE_OFFTRACK = 1
export const OFFTRACK_HOUR_CUTOFF = 12 // Noon local
/** Slight tolerance to avoid pausing on tiny rounding overages. */
export const OVER_BUDGET_GRACE = 1.05

export function evaluateSmartPause(input: SmartPauseInput): SmartPauseResult {
  const {
    todayScore,
    mealCost,
    dailyBudget,
    mealScore,
    mealsToday = 0,
    localHour = 24,
    spentToday,
  } = input

  const rationale: string[] = []

  // ── Unhealthy check (needed for early morning override) ─────────────────────────────────
  const isMealUnhealthy = mealScore < UNHEALTHY_THRESHOLD

  // ── Off-track gate ───────────────────────────────────────────────────
  const scoreBelowTarget = todayScore < DAILY_SCORE_TARGET
  const haveEnoughContext =
    mealsToday >= MIN_MEALS_BEFORE_OFFTRACK || localHour >= OFFTRACK_HOUR_CUTOFF

  // Early morning expensive junk food override - high-cost meals should trigger pause regardless of time
  const isHighCostMeal = mealCost > (dailyBudget * 0.5) // More than 50% of daily budget
  const earlyMorningOverride = isHighCostMeal && !haveEnoughContext && isMealUnhealthy

  const isDayOffTrack = scoreBelowTarget && haveEnoughContext
  if (scoreBelowTarget && !haveEnoughContext && !earlyMorningOverride) {
    rationale.push(
      `Score below target (${todayScore}/${DAILY_SCORE_TARGET}) but only ${mealsToday} meal(s) logged and it is ${localHour}:00 — too early to judge.`,
    )
  }

  if (earlyMorningOverride) {
    rationale.push(
      `High-cost unhealthy meal (${mealCost} BDT, ${(mealCost/dailyBudget*100).toFixed(0)}% of daily budget) triggers early morning pause.`,
    )
  }

  // ── Expensive ────────────────────────────────────────────────────────
  // Prefer remaining-budget logic when we know today's spend; fall back
  // to daily-budget share otherwise. The effective threshold is the
  // *lower* of the two so the trigger remains sensitive as the budget
  // is depleted.
  const dailyThreshold = dailyBudget * EXPENSIVE_SHARE_OF_DAILY
  const remaining = spentToday != null ? Math.max(0, dailyBudget - spentToday) : null
  const remainingThreshold = remaining != null ? remaining * EXPENSIVE_SHARE_OF_REMAINING : null
  const effectiveThreshold =
    remainingThreshold != null ? Math.min(dailyThreshold, remainingThreshold) : dailyThreshold

  const isMealExpensive = mealCost > effectiveThreshold && dailyBudget > 0
  const projectedSpend = (spentToday ?? 0) + mealCost
  const isOverBudget = dailyBudget > 0 && projectedSpend > dailyBudget * OVER_BUDGET_GRACE

  // Don't pause for expensive meals if they're high-quality (Grade A or B).
  const isHighQuality = mealScore >= 15 // Grade A (18-20) or high B (15-17)
  const expensiveButHealthy = isMealExpensive && isHighQuality && !isMealUnhealthy

  // Slightly stricter policy:
  // - keep the original off-track gate,
  // - always pause when meal is both expensive + unhealthy,
  // - always pause when projected spend is clearly over today's budget.
  const bothRisky = isMealUnhealthy && isMealExpensive && !expensiveButHealthy
  const shouldPause =
    dailyBudget > 0 &&
    ((isDayOffTrack || earlyMorningOverride) &&
      (isMealUnhealthy || (isMealExpensive && !expensiveButHealthy)) ||
      bothRisky ||
      isOverBudget)

  let reason: SmartPauseResult["reason"] = null
  let triggerType: SmartPauseResult["triggerType"] = null
  if (shouldPause) {
    if (isOverBudget) triggerType = "budget_overrun"
    else if (bothRisky) triggerType = "high_risk_combo"
    else triggerType = "offtrack_combo"

    if (isMealExpensive && isMealUnhealthy) reason = "both"
    else if (isMealExpensive || isOverBudget) reason = "expensive"
    else if (isMealUnhealthy) reason = "unhealthy"
  }

  if (isOverBudget) {
    rationale.push(
      `Projected daily spend ${Math.round(projectedSpend)} BDT exceeds budget ${Math.round(dailyBudget)} BDT.`,
    )
  }

  return {
    shouldPause,
    reason,
    triggerType,
    isDayOffTrack,
    isMealExpensive,
    isMealUnhealthy,
    isOverBudget,
    rationale,
  }
}
