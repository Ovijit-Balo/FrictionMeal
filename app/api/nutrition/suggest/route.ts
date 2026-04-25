import { type NextRequest, NextResponse } from "next/server"
import { findClosestLocalFoods } from "@/lib/nutrition/localLookup"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()
    const limitRaw = Number(searchParams.get("limit") || 6)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(10, limitRaw)) : 6

    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const suggestions = findClosestLocalFoods(q, limit)
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("[v0] nutrition suggest error:", error)
    return NextResponse.json({ error: "Suggestion lookup failed" }, { status: 500 })
  }
}
