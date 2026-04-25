"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Camera, Keyboard, UtensilsCrossed, Loader2 } from "lucide-react"
import { useAuth, authFetch } from "./auth-provider"
import { SmartPauseModal, type PausePayload } from "./smart-pause-modal"

type MealType = "breakfast" | "lunch" | "dinner" | "snack"

interface PresetOption {
  label: string
  items: string
  cost: number
}

type SuggestionsByQuery = Record<string, string[]>

const PRESETS: Record<MealType, PresetOption[]> = {
  breakfast: [
    { label: "Eggs + roti", items: "2 eggs, 1 roti", cost: 44 },
    { label: "Tea + biscuits", items: "tea, biscuits", cost: 30 },
    { label: "Banana + milk", items: "banana, milk", cost: 75 },
  ],
  lunch: [
    { label: "Rice + dal + veg", items: "rice, dal, spinach", cost: 115 },
    { label: "Rice + chicken", items: "rice, chicken, vegetable salad", cost: 165 },
    { label: "Biryani", items: "biryani", cost: 120 },
  ],
  dinner: [
    { label: "Roti + fish", items: "2 roti, fish, spinach", cost: 140 },
    { label: "Rice + beef", items: "rice, beef", cost: 185 },
    { label: "Rice + egg + dal", items: "rice, 2 eggs, dal", cost: 119 },
  ],
  snack: [
    { label: "Fruit", items: "apple", cost: 70 },
    { label: "Yogurt", items: "yogurt", cost: 50 },
    { label: "Fast food", items: "burger, french fries, soft drink", cost: 250 },
  ],
}

export function MealLogger() {
  const router = useRouter()
  const { token } = useAuth()

  const [mealType, setMealType] = useState<MealType>("lunch")
  const [foodText, setFoodText] = useState("")
  const [portionSize, setPortionSize] = useState<number>(1)
  const [cost, setCost] = useState<string>("")

  const [submitting, setSubmitting] = useState(false)
  const [imageProcessing, setImageProcessing] = useState(false)

  const [pausePayload, setPausePayload] = useState<PausePayload | null>(null)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [foodSuggestions, setFoodSuggestions] = useState<string[]>([])
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [photoModeNote, setPhotoModeNote] = useState<string>("")

  const activeFoodFragment = useMemo(() => {
    const parts = foodText.split(/[,;\n|]+/)
    return (parts[parts.length - 1] || "").trim()
  }, [foodText])

  const applyPreset = (preset: PresetOption) => {
    setFoodText(preset.items)
    setCost(String(preset.cost))
  }

  const appendFoodToMealInput = (foodName: string) => {
    const next = foodName.trim()
    if (!next) return

    setFoodText((prev) => {
      const current = prev.trim()
      return current ? `${current}, ${next}` : next
    })
  }

  const replaceActiveFoodFragment = (foodName: string) => {
    const parts = foodText.split(/([,;\n|]+)/)
    let replaced = false
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]
      if (!part || /^[,;\n|]+$/.test(part)) continue
      if (!replaced) {
        parts[i] = ` ${foodName}`
        replaced = true
        break
      }
    }
    if (!replaced) {
      setFoodText(foodName)
      return
    }
    const joined = parts.join("").replace(/\s+/g, " ").replace(/\s*([,;|])\s*/g, "$1 ").trim()
    setFoodText(joined)
  }

  useEffect(() => {
    const q = activeFoodFragment
    if (q.length < 2) {
      setFoodSuggestions([])
      setSuggestionLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setSuggestionLoading(true)
        const res = await fetch(`/api/nutrition/suggest?q=${encodeURIComponent(q)}&limit=6`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok) {
          setFoodSuggestions([])
          return
        }
        setFoodSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      } catch {
        setFoodSuggestions([])
      } finally {
        setSuggestionLoading(false)
      }
    }, 180)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [activeFoodFragment])

  const submitMeal = async (justification?: string, mood?: string) => {
    if (!token) return

    const parsedCost = parseFloat(cost)
    if (!foodText.trim()) {
      toast.error("Add at least one food item")
      return
    }
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      toast.error("Enter a valid cost in BDT")
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetch(token, "/api/meals/log", {
        method: "POST",
        body: JSON.stringify({
          foodItemsInput: foodText,
          portionSize,
          cost: parsedCost,
          mealType,
          justification,
          mood,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to log meal")
        return
      }

      if (data.pauseRequired) {
        const suggestions = (data.suggestionsByQuery || {}) as SuggestionsByQuery
        const firstSuggestion = Object.entries(suggestions)[0]
        if (firstSuggestion) {
          toast.info(
            `Try "${firstSuggestion[1][0]}" for "${firstSuggestion[0]}" for a closer nutrition match.`,
          )
        }
        setPausePayload(data as PausePayload)
        setPauseOpen(true)
        return
      }

      const suggestions = (data.suggestionsByQuery || {}) as SuggestionsByQuery
      if (data.unrecognized?.length > 0) {
        const hintEntries = Object.entries(suggestions)
          .slice(0, 2)
          .map(([raw, options]) => `${raw} -> ${options.slice(0, 2).join(" / ")}`)
        const hintText = hintEntries.length > 0 ? ` Try: ${hintEntries.join("; ")}.` : ""
        toast.warning(
          `Couldn't find nutrition for: ${data.unrecognized.join(", ")}. Logged with partial data.${hintText}`,
        )
      } else {
        const confidencePct =
          data.meal?.matchConfidence != null
            ? Math.round(Number(data.meal.matchConfidence) * 100)
            : null
        toast.success(
          confidencePct != null
            ? `Meal logged · ${data.meal.nutritionScore}/20 · ${confidencePct}% match confidence`
            : `Meal logged · ${data.meal.nutritionScore}/20`,
        )
      }
      setPauseOpen(false)
      setPausePayload(null)
      router.push("/")
    } catch (e) {
      console.error("[v0] meal submit error", e)
      toast.error("Network error. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Roboflow free tier accepts up to ~5 MB; refuse anything larger early.
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large — please use a photo under 5 MB")
      return
    }

    setImageProcessing(true)
    try {
      // Read the file as a data URL and strip the prefix before POSTing.
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error)
        reader.onload = () => {
          const result = typeof reader.result === "string" ? reader.result : ""
          resolve(result.replace(/^data:image\/[a-zA-Z+]+;base64,/, ""))
        }
        reader.readAsDataURL(file)
      })

      const res = await fetch("/api/nutrition/roboflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageName: file.name, imageBase64 }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Image processing failed")
        return
      }

      if (!data.detected || data.detected.length === 0) {
        toast.warning(data.warning || "No food items detected — try another photo")
        return
      }

      setFoodText(data.detected.join(", "))
      if (data.mocked) {
        setPhotoModeNote("Photo detection is running in demo/mock mode.")
        toast.success(`Mock-detected: ${data.detected.join(", ")}`)
      } else if (data.warning) {
        setPhotoModeNote("Photo detection partially failed; fallback labels were used.")
        toast.warning(`${data.warning}. Showing mock: ${data.detected.join(", ")}`)
      } else {
        setPhotoModeNote("")
        toast.success(`Detected: ${data.detected.join(", ")}`)
      }
    } catch (err) {
      console.error("[v0] image upload error", err)
      toast.error("Image processing failed")
    } finally {
      setImageProcessing(false)
    }
  }

  return (
    <>
      <Card className="p-6 space-y-6 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium">Log with context</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add foods and cost accurately to get better Smart Pause suggestions.
          </p>
        </div>

        <div>
          <Label className="mb-2 block">Meal type</Label>
          <ToggleGroup
            type="single"
            value={mealType}
            onValueChange={(v) => v && setMealType(v as MealType)}
            className="justify-start flex-wrap gap-2"
          >
            <ToggleGroupItem
              value="breakfast"
              className="h-9 rounded-md border border-border/80 px-3 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Breakfast
            </ToggleGroupItem>
            <ToggleGroupItem
              value="lunch"
              className="h-9 rounded-md border border-border/80 px-3 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Lunch
            </ToggleGroupItem>
            <ToggleGroupItem
              value="dinner"
              className="h-9 rounded-md border border-border/80 px-3 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Dinner
            </ToggleGroupItem>
            <ToggleGroupItem
              value="snack"
              className="h-9 rounded-md border border-border/80 px-3 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Snack
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Tabs defaultValue="text">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text" className="gap-2">
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">Type</span>
            </TabsTrigger>
            <TabsTrigger value="presets" className="gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Picks</span>
            </TabsTrigger>
            <TabsTrigger value="photo" className="gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Camera</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-4">
            <Label htmlFor="food-text" className="mb-2 block">
              What did you eat?
            </Label>
            <Textarea
              id="food-text"
              value={foodText}
              onChange={(e) => setFoodText(e.target.value)}
              placeholder="e.g. 2 eggs, 1 roti, rice"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Separate items with commas (for example: rice, egg, spinach). We&apos;ll look up
              nutrition automatically.
            </p>
            {(suggestionLoading || foodSuggestions.length > 0) && (
              <div className="mt-2 rounded-md border border-primary/25 bg-background p-2">
                <div className="text-[11px] text-muted-foreground mb-1">
                  {suggestionLoading
                    ? "Finding matches..."
                    : `Suggestions for "${activeFoodFragment}"`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {foodSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="px-2 py-1 rounded-md text-xs border border-border hover:bg-muted transition-colors"
                      onClick={() => replaceActiveFoodFragment(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="presets" className="mt-4 space-y-2">
            {PRESETS[mealType].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="w-full text-left rounded-md border border-border/80 bg-secondary/50 hover:bg-secondary px-4 py-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{p.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.items}</div>
                  </div>
                  <div className="text-sm tabular-nums">৳{p.cost}</div>
                </div>
              </button>
            ))}
            {foodText && (
              <p className="text-xs text-primary pt-1">Preset applied — review below</p>
            )}
          </TabsContent>

          <TabsContent value="photo" className="mt-4">
            <div className="rounded-lg border-2 border-dashed border-primary/35 bg-primary/5 p-6 text-center">
              <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Upload a food photo</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                We&apos;ll detect the items and pre-fill the food list
              </p>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={imageProcessing}
                />
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm cursor-pointer ${
                    imageProcessing
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                >
                  {imageProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {imageProcessing ? "Analyzing…" : "Choose image"}
                </span>
              </label>
            </div>
            {photoModeNote && (
              <div className="mt-3 rounded-md border border-accent/40 bg-accent/10 p-2 text-xs text-accent-foreground">
                {photoModeNote}
              </div>
            )}
            {foodText && (
              <div className="mt-3 text-xs text-primary">Detected: {foodText}</div>
            )}
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">Portion</Label>
            <p className="text-xs text-muted-foreground mb-2">Choose estimated serving size.</p>
            <ToggleGroup
              type="single"
              value={String(portionSize)}
              onValueChange={(v) => v && setPortionSize(parseFloat(v))}
              className="justify-start"
            >
              <ToggleGroupItem value="0.5">½</ToggleGroupItem>
              <ToggleGroupItem value="1">1</ToggleGroupItem>
              <ToggleGroupItem value="1.5">1½</ToggleGroupItem>
              <ToggleGroupItem value="2">2</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div>
            <Label htmlFor="cost" className="mb-2 block">
              Cost (BDT)
            </Label>
            <Input
              id="cost"
              type="number"
              inputMode="decimal"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 120 BDT"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter the amount spent for this meal only.
            </p>
          </div>
        </div>

        <Button
          onClick={() => submitMeal()}
          disabled={submitting || !foodText.trim() || !cost}
          className="w-full shadow-sm"
          size="lg"
        >
          {submitting && !pauseOpen ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking…
            </>
          ) : (
            "Analyze & log meal"
          )}
        </Button>
      </Card>

      <SmartPauseModal
        open={pauseOpen}
        payload={pausePayload}
        submitting={submitting}
        onConfirm={(just, mood) => submitMeal(just, mood)}
        onAddFood={(foodName) => {
          appendFoodToMealInput(foodName)
          setPauseOpen(false)
          setPausePayload(null)
          toast.success(`Added ${foodName} to your meal input`)
        }}
        onCancel={() => {
          setPauseOpen(false)
          setPausePayload(null)
        }}
      />
    </>
  )
}
