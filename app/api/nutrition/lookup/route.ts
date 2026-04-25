import { type NextRequest, NextResponse } from "next/server"
import { lookupFood, lookupMultiple, parseFoodItems } from "@/lib/nutrition/lookup"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (Array.isArray(body.queries)) {
      const items = await lookupMultiple(body.queries)
      return NextResponse.json({ items })
    }

    if (typeof body.query === "string") {
      // Support comma-separated input
      const queries = parseFoodItems(body.query)
      if (queries.length > 1) {
        const items = await lookupMultiple(queries)
        return NextResponse.json({ items })
      }
      const item = await lookupFood(body.query)
      return NextResponse.json({ item })
    }

    return NextResponse.json({ error: "Missing query" }, { status: 400 })
  } catch (error) {
    console.error("[v0] nutrition lookup error:", error)
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  }
}
