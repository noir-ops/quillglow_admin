import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GEMINI_MODEL_META, lookupMeta, normalizeGeminiId } from "@/lib/ai/model-catalog"

export const dynamic = "force-dynamic"

/**
 * Returns every Gemini model that supports `generateContent`, enriched with a
 * description and per-1M-token pricing from the local catalog.
 *
 * Gemini's list endpoint already returns a displayName, description and token
 * limits, so those are used as the fallback when a model isn't in the catalog.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { models: [], error: "GEMINI_API_KEY is not set in this environment." },
      { status: 200 },
    )
  }

  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": apiKey },
      cache: "no-store",
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error("[ai-models/gemini] list failed:", detail)
      return NextResponse.json(
        { models: [], error: `Google rejected the request (${res.status}). Check the API key.` },
        { status: 200 },
      )
    }

    const payload = await res.json()
    const raw: any[] = payload?.models ?? []

    const models = raw
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => {
        const id = normalizeGeminiId(m.name ?? "")
        const meta = lookupMeta(id, GEMINI_MODEL_META)
        return {
          id,
          label: meta?.label ?? m.displayName ?? id,
          description:
            meta?.description ??
            m.description ??
            "No description on file — see the Gemini API model docs.",
          inputPrice: meta?.inputPrice ?? null,
          outputPrice: meta?.outputPrice ?? null,
          recommended: meta?.recommended ?? false,
          deprecated: meta?.deprecated ?? false,
          vision: meta?.vision ?? false,
          contextWindow: m.inputTokenLimit ?? null,
        }
      })
      .filter((m) => m.id && !m.id.includes("embedding") && !m.id.includes("aqa"))
      .sort((a, b) => {
        if (a.recommended !== b.recommended) return a.recommended ? -1 : 1
        if (a.deprecated !== b.deprecated) return a.deprecated ? 1 : -1
        return a.id.localeCompare(b.id)
      })

    return NextResponse.json({ models })
  } catch (err) {
    console.error("[ai-models/gemini] error:", err)
    return NextResponse.json(
      { models: [], error: "Could not reach the Gemini API." },
      { status: 200 },
    )
  }
}
