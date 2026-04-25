import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/mongodb"
import User from "@/lib/models/User"
import { signToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

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
    console.error("[v0] login error:", error)
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
    return NextResponse.json({ error: "Failed to log in" }, { status: 500 })
  }
}
