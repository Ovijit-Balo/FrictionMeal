"use client"

import Image from "next/image"
import { Leaf } from "lucide-react"
import { useState } from "react"

interface BrandMarkProps {
  size: number
  iconSize?: number
  className?: string
}

export function BrandMark({ size, iconSize = 18, className = "" }: BrandMarkProps) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background ${className}`}
      style={{ width: size, height: size }}
    >
      {!failed ? (
        <Image
          src="/logo.png"
          alt="FrictionMeal logo"
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
          <Leaf style={{ width: iconSize, height: iconSize }} />
        </div>
      )}
    </div>
  )
}

