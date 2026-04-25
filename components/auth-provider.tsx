"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export interface AuthUser {
  id: string
  email: string
  name: string
  monthlyBudget: number
  age?: number
  weightKg?: number
  heightCm?: number
  biologicalSex?: "female" | "male" | "other"
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = "frictionmeal.auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.token && parsed.user) {
          setToken(parsed.token)
          setUserState(parsed.user)
        }
      }
    } catch (e) {
      console.error("[v0] failed to read auth from storage", e)
    }
    setLoading(false)
  }, [])

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken)
    setUserState(newUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, user: newUser }))
  }

  const logout = () => {
    setToken(null)
    setUserState(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const setUser = (newUser: AuthUser) => {
    setUserState(newUser)
    if (token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: newUser }))
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export async function authFetch(
  token: string | null,
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  return fetch(input, { ...init, headers })
}
