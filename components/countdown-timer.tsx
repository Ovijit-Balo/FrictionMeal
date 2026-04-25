"use client"

import { useEffect, useRef, useState } from "react"

interface CountdownTimerProps {
  durationSeconds: number
  onComplete: () => void
  active?: boolean
}

export function CountdownTimer({ durationSeconds, onComplete, active = true }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [started, setStarted] = useState(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    setRemaining(durationSeconds)
    setStarted(false)
  }, [durationSeconds, active])

  useEffect(() => {
    if (!active) return
    setStarted(true)
    const startAt = Date.now()
    const id = setInterval(() => {
      const elapsed = (Date.now() - startAt) / 1000
      const left = Math.max(0, durationSeconds - elapsed)
      setRemaining(left)
      if (left <= 0) {
        clearInterval(id)
        onCompleteRef.current()
      }
    }, 100)
    return () => clearInterval(id)
  }, [active, durationSeconds])

  const progress = started ? 1 - remaining / durationSeconds : 0
  const size = 140
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 100ms linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-4xl tabular-nums text-foreground">
            {Math.ceil(remaining)}
          </span>
          <span className="text-xs text-muted-foreground mt-1">seconds</span>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground text-center max-w-xs text-pretty">
        Take a breath. Notice how you feel. Then decide.
      </p>
    </div>
  )
}
