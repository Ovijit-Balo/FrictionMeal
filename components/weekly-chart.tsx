"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Card } from "@/components/ui/card"

export interface WeeklyDayData {
  date: string
  dayLabel: string
  score: number
  spent: number
  meals: number
  frictionCount: number
}

interface WeeklyChartProps {
  days: WeeklyDayData[]
  dailyBudget: number
}

export function NutritionTrendChart({ days }: { days: WeeklyDayData[] }) {
  return (
    <Card className="p-5">
      <div className="mb-3">
        <h3 className="font-serif text-lg">Nutrition trend</h3>
        <p className="text-xs text-muted-foreground">Daily total score · target 15+/day</p>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={days} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="dayLabel"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "0.8rem",
              }}
            />
            <ReferenceLine
              y={15}
              stroke="var(--chart-2)"
              strokeDasharray="4 4"
              label={{ value: "Target", fill: "var(--muted-foreground)", fontSize: 10, position: "right" }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{ fill: "var(--primary)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function SpendingTrendChart({
  days,
  dailyBudget,
}: {
  days: WeeklyDayData[]
  dailyBudget: number
}) {
  return (
    <Card className="p-5">
      <div className="mb-3">
        <h3 className="font-serif text-lg">Spending trend</h3>
        <p className="text-xs text-muted-foreground">
          Daily spend vs ৳{Math.round(dailyBudget)} budget
        </p>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="dayLabel"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "0.8rem",
              }}
              formatter={(value: number) => [`৳${Math.round(value)}`, "Spent"]}
            />
            <ReferenceLine
              y={dailyBudget}
              stroke="var(--destructive)"
              strokeDasharray="4 4"
              label={{
                value: "Budget",
                fill: "var(--muted-foreground)",
                fontSize: 10,
                position: "right",
              }}
            />
            <Bar dataKey="spent" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function WeeklyCharts({ days, dailyBudget }: WeeklyChartProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <NutritionTrendChart days={days} />
      <SpendingTrendChart days={days} dailyBudget={dailyBudget} />
    </div>
  )
}
