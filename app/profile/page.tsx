"use client"

import { useState, useEffect, type FormEvent } from "react"
import { AppShell } from "@/components/app-shell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth, authFetch } from "@/components/auth-provider"
import { toast } from "sonner"
import { Loader2, Info } from "lucide-react"

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileContent />
    </AppShell>
  )
}

function ProfileContent() {
  const { user, token, setUser } = useAuth()
  const [budget, setBudget] = useState(user?.monthlyBudget?.toString() ?? "15000")
  const [age, setAge] = useState(user?.age ? String(user.age) : "")
  const [weightKg, setWeightKg] = useState(user?.weightKg ? String(user.weightKg) : "")
  const [heightCm, setHeightCm] = useState(user?.heightCm ? String(user.heightCm) : "")
  const [biologicalSex, setBiologicalSex] = useState<"female" | "male" | "other">(
    user?.biologicalSex || "other",
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setBudget(user.monthlyBudget.toString())
      setAge(user.age ? String(user.age) : "")
      setWeightKg(user.weightKg ? String(user.weightKg) : "")
      setHeightCm(user.heightCm ? String(user.heightCm) : "")
      setBiologicalSex(user.biologicalSex || "other")
    }
  }, [user])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const val = parseFloat(budget)
    if (!Number.isFinite(val) || val <= 0) {
      toast.error("Budget must be a positive number")
      return
    }
    setSaving(true)
    try {
      const res = await authFetch(token, "/api/user/budget", {
        method: "PUT",
        body: JSON.stringify({ monthlyBudget: val }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to update")
        return
      }
      const parsedAge = age.trim().length > 0 ? Number(age) : null
      const parsedWeight = weightKg.trim().length > 0 ? Number(weightKg) : null
      const parsedHeight = heightCm.trim().length > 0 ? Number(heightCm) : null
      const profileRes = await authFetch(token, "/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          age: parsedAge,
          weightKg: parsedWeight,
          heightCm: parsedHeight,
          biologicalSex,
        }),
      })
      const profileData = await profileRes.json()
      if (!profileRes.ok) {
        toast.error(profileData.error || "Failed to update profile details")
        return
      }

      setUser({
        id: profileData.user.id,
        email: profileData.user.email,
        name: profileData.user.name,
        monthlyBudget: profileData.user.monthlyBudget,
        age: profileData.user.age,
        weightKg: profileData.user.weightKg,
        heightCm: profileData.user.heightCm,
        biologicalSex: profileData.user.biologicalSex,
      })
      toast.success("Profile updated")
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const dailyBudget = Math.round(user.monthlyBudget / 30)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl md:text-4xl text-balance">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </header>

      <Card className="p-6">
        <h2 className="font-serif text-xl mb-4">Account</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-6">
        <h2 className="font-serif text-xl mb-1">Budget</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Daily budget is calculated automatically as monthly ÷ 30.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="budget" className="mb-2 block">
              Monthly budget (BDT)
            </Label>
            <Input
              id="budget"
              type="number"
              min="1000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Current daily budget: <span className="font-medium text-foreground">৳{dailyBudget}</span>
            </p>
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-serif text-xl mb-1">Nutrition personalization</h2>
        <p className="text-sm text-muted-foreground mb-4">
          These fields personalize micronutrient targets, including your minimum protein goal.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                placeholder="e.g. 25"
              />
            </div>
            <div>
              <Label htmlFor="sex" className="mb-2 block">
                Biological sex
              </Label>
              <select
                id="sex"
                value={biologicalSex}
                onChange={(e) => setBiologicalSex(e.target.value as "female" | "male" | "other")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="other">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
                placeholder="e.g. 70"
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
                placeholder="e.g. 170"
              />
            </div>
          </div>
          
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save personalization
          </Button>
        </form>
      </Card>

      <Card className="p-6 bg-secondary/60 border-border">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-serif text-lg mb-1">How the Smart Pause Engine works</h3>
            <p className="text-sm text-muted-foreground text-pretty">
              A 10-second pause appears when your day looks off-track (score under 15, once at
              least one meal is logged or it&apos;s past noon) and the current meal is either
              expensive for your budget context or low on nutrition (score {"<"} 10/20). The goal
              isn&apos;t to block you; it&apos;s to add deliberate friction at high-risk moments so your
              choice is conscious, not automatic. Your dashboard also shows whether you&apos;re meeting
              your personalized protein minimum for the day.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
