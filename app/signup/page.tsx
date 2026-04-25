"use client"

import { useState, type FormEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { BrandMark } from "@/components/brand-mark"

export default function SignupPage() {
  const router = useRouter()
  const { login, user, loading } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [monthlyBudget, setMonthlyBudget] = useState("15000")
  const [age, setAge] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [biologicalSex, setBiologicalSex] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace("/")
  }, [user, loading, router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const budget = parseFloat(monthlyBudget)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          monthlyBudget: Number.isFinite(budget) && budget > 0 ? budget : 15000,
          age: age ? parseFloat(age) : undefined,
          weightKg: weightKg ? parseFloat(weightKg) : undefined,
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
          biologicalSex: biologicalSex === 'prefer_not_to_say' ? undefined : biologicalSex,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Sign up failed")
        return
      }
      login(data.token, data.user)
      toast.success(`Welcome to FrictionMeal, ${data.user.name}`)
      router.push("/")
    } catch {
      toast.error("Network error. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Link href="/login" className="flex items-center gap-2 mb-8">
        <BrandMark size={40} iconSize={20} />
        <div>
          <div className="font-serif text-2xl leading-none">FrictionMeal</div>
          <div className="text-xs text-muted-foreground mt-1">Smart Pause Engine</div>
        </div>
      </Link>

      <Card className="w-full max-w-md p-6 md:p-8">
        <h1 className="font-serif text-3xl mb-1">Start your journey</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Create an account to start tracking mindful meals.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="mb-2 block">
              Name
            </Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
          <div>
            <Label htmlFor="email" className="mb-2 block">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-2 block">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="budget" className="mb-2 block">
              Monthly food budget (BDT)
            </Label>
            <Input
              id="budget"
              type="number"
              min="1000"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              placeholder="15000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              You can change this anytime from your profile.
            </p>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              Optional: Help us personalize your protein targets
            </p>
            <p className="text-xs text-muted-foreground">
              These fields are optional and help calculate more accurate nutrition goals.
            </p>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="age" className="mb-2 block">
                  Age
                </Label>
                <Input
                  id="age"
                  type="number"
                  min="5"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                />
              </div>
              <div>
                <Label htmlFor="weight" className="mb-2 block">
                  Weight (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  min="20"
                  max="300"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                />
              </div>
              <div>
                <Label htmlFor="height" className="mb-2 block">
                  Height (cm)
                </Label>
                <Input
                  id="height"
                  type="number"
                  min="100"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="170"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="sex" className="mb-2 block">
                Biological Sex
              </Label>
              <Select value={biologicalSex} onValueChange={setBiologicalSex}>
                <SelectTrigger>
                  <SelectValue placeholder="Prefer not to say" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create account
          </Button>
        </form>
        <p className="text-sm text-muted-foreground text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}
