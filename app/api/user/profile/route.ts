import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import User from "@/lib/models/User"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const user = await User.findById(payload.userId).select("-passwordHash")
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
    console.error("[v0] profile error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { age, biologicalSex, weightKg, heightCm } = await req.json()
    const update: Record<string, unknown> = {}
    
    // Handle age
    if (age === null || age === undefined || age === "") update.age = undefined
    else if (typeof age === "number" && age >= 5 && age <= 120) update.age = age
    else return NextResponse.json({ error: "age must be between 5 and 120" }, { status: 400 })

    // Handle weight
    if (weightKg === null || weightKg === undefined || weightKg === "") update.weightKg = undefined
    else if (typeof weightKg === "number" && weightKg >= 20 && weightKg <= 300) update.weightKg = weightKg
    else return NextResponse.json({ error: "weightKg must be between 20 and 300" }, { status: 400 })

    // Handle height
    if (heightCm === null || heightCm === undefined || heightCm === "") update.heightCm = undefined
    else if (typeof heightCm === "number" && heightCm >= 100 && heightCm <= 250) update.heightCm = heightCm
    else return NextResponse.json({ error: "heightCm must be between 100 and 250" }, { status: 400 })

    // Handle biological sex (optional)
    if (
      biologicalSex === undefined ||
      biologicalSex === null ||
      biologicalSex === "female" ||
      biologicalSex === "male" ||
      biologicalSex === "other"
    ) {
      update.biologicalSex = biologicalSex
    } else {
      return NextResponse.json({ error: "Invalid biologicalSex" }, { status: 400 })
    }

    await connectDB()
    const user = await User.findByIdAndUpdate(payload.userId, update, { new: true }).select("-passwordHash")
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

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
    console.error("[v0] profile update error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
