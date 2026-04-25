import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import User from "@/lib/models/User"
import { getUserFromRequest } from "@/lib/auth"

export async function PUT(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { monthlyBudget } = await req.json()
    if (typeof monthlyBudget !== "number" || monthlyBudget <= 0) {
      return NextResponse.json({ error: "monthlyBudget must be a positive number" }, { status: 400 })
    }

    await connectDB()
    const user = await User.findByIdAndUpdate(
      payload.userId,
      { monthlyBudget },
      { new: true },
    ).select("-passwordHash")

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        monthlyBudget: user.monthlyBudget,
        age: user.age,
        weightKg: user.weightKg,
        heightCm: user.heightCm,
        biologicalSex: user.biologicalSex,
        dailyBudget: Math.round(user.monthlyBudget / 30),
      },
    })
  } catch (error) {
    console.error("[v0] budget error:", error)
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 })
  }
}
