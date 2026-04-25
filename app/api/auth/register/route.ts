import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/mongodb"
import User from "@/lib/models/User"
import { signToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, monthlyBudget, age, biologicalSex, weightKg, heightCm } =
      await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    await connectDB()

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const parsedAge = typeof age === "number" && age >= 5 && age <= 120 ? age : undefined
    const parsedWeightKg =
      typeof weightKg === "number" && weightKg >= 20 && weightKg <= 300 ? weightKg : undefined
    const parsedHeightCm =
      typeof heightCm === "number" && heightCm >= 100 && heightCm <= 250 ? heightCm : undefined
    const parsedBiologicalSex =
      biologicalSex === "female" || biologicalSex === "male" || biologicalSex === "other"
        ? biologicalSex
        : undefined

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      monthlyBudget: typeof monthlyBudget === "number" && monthlyBudget > 0 ? monthlyBudget : 15000,
      age: parsedAge,
      weightKg: parsedWeightKg,
      heightCm: parsedHeightCm,
      biologicalSex: parsedBiologicalSex,
    })

    const token = signToken({ userId: user._id.toString(), email: user.email })

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        monthlyBudget: user.monthlyBudget,
        age: user.age,
        weightKg: user.weightKg,
        heightCm: user.heightCm,
        biologicalSex: user.biologicalSex,
      },
    })
  } catch (error) {
    console.error("[v0] register error:", error)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("whitelist") || msg.includes("ENOTFOUND") || msg.includes("ServerSelection")) {
      return NextResponse.json(
        {
          error:
            "Can't reach the database. Add 0.0.0.0/0 to your MongoDB Atlas Network Access whitelist, then try again.",
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Failed to register" }, { status: 500 })
  }
}
