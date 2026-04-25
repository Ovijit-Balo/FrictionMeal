import { type NextRequest, NextResponse } from "next/server"

/**
 * Meal-photo recognition endpoint.
 *
 * - If ROBOFLOW_API_KEY, ROBOFLOW_WORKSPACE, and ROBOFLOW_WORKFLOW_ID are all
 *   present, POSTs the base64 image to the Roboflow Serverless Hosted
 *   Workflow and extracts class labels from the response.
 * - Otherwise returns a random mock so the Photo tab still works in dev.
 *
 * The Roboflow workflow response shape isn't fixed — it depends on which
 * blocks the workflow has. We scan common locations (`predictions`,
 * `detections`, `output`) and pull out anything that looks like a class
 * label. Duplicate labels are collapsed so "2 plates of rice" logs as
 * "rice" once; the meal logger's quantity parser handles counts separately.
 */

export const runtime = "nodejs"
// Photo uploads can be bigger than the default 1 MB; let Vercel stream it.
export const maxDuration = 30

const MOCK_POOL = [
  ["rice", "chicken", "vegetable salad"],
  ["biryani", "egg"],
  ["roti", "dal", "spinach"],
  ["pizza", "soft drink"],
  ["burger", "french fries"],
  ["fish", "rice"],
]

function pickMock(imageName: string) {
  const pick = MOCK_POOL[Math.floor(Math.random() * MOCK_POOL.length)]
  return NextResponse.json({
    detected: pick,
    confidence: 0.82,
    imageName: imageName || "upload.jpg",
    mocked: true,
  })
}

/**
 * Walk an arbitrary object tree and collect every string that looks
 * like it came from a `class` / `label` / `name` field on a prediction.
 */
function extractLabels(node: unknown, bag: Set<string>): void {
  if (!node) return
  if (Array.isArray(node)) {
    for (const child of node) extractLabels(child, bag)
    return
  }
  if (typeof node !== "object") return

  const obj = node as Record<string, unknown>

  for (const key of ["class", "class_name", "label", "name"]) {
    const v = obj[key]
    if (typeof v === "string" && v.trim()) bag.add(v.trim().toLowerCase())
  }

  // Recurse into anything that might hold nested predictions.
  for (const key of Object.keys(obj)) {
    const v = obj[key]
    if (v && (Array.isArray(v) || typeof v === "object")) {
      extractLabels(v, bag)
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const imageName = typeof body.imageName === "string" ? body.imageName : ""
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : ""

    const apiKey = process.env.ROBOFLOW_API_KEY
    const workspace = process.env.ROBOFLOW_WORKSPACE
    const workflowId = process.env.ROBOFLOW_WORKFLOW_ID

    // Missing credentials OR missing image payload → graceful mock.
    if (!apiKey || !workspace || !workflowId || !imageBase64) {
      return pickMock(imageName)
    }

    // Strip any data-URL prefix ("data:image/jpeg;base64,...") — Roboflow
    // wants the raw base64 payload only.
    const rawBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "")

    const endpoint = `https://serverless.roboflow.com/infer/workflows/${workspace}/${workflowId}`
    const rfRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        inputs: {
          image: { type: "base64", value: rawBase64 },
        },
      }),
    })

    if (!rfRes.ok) {
      const errText = await rfRes.text().catch(() => "")
      console.error("[v0] roboflow error", rfRes.status, errText.slice(0, 500))
      // Fall back to mock so the user isn't blocked — but tell them.
      const mock = (await pickMock(imageName).json()) as Record<string, unknown>
      return NextResponse.json({ ...mock, warning: `Roboflow ${rfRes.status}` })
    }

    const data = (await rfRes.json()) as Record<string, unknown>

    const labels = new Set<string>()
    extractLabels(data, labels)

    const detected = Array.from(labels)

    if (detected.length === 0) {
      // Workflow returned no detections — degrade gracefully.
      return NextResponse.json({
        detected: [],
        confidence: 0,
        imageName: imageName || "upload.jpg",
        mocked: false,
        warning: "No food items detected in the photo",
      })
    }

    return NextResponse.json({
      detected,
      confidence: null, // Confidence shape varies per workflow; omit.
      imageName: imageName || "upload.jpg",
      mocked: false,
    })
  } catch (error) {
    console.error("[v0] roboflow route error:", error)
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 })
  }
}
