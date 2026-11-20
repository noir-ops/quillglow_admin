import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { OPENAI_MODEL_META, isChatCapableOpenAIModel, lookupMeta } from "@/lib/ai/model-catalog"

export const dynamic = "force-dynamic"

/**
 * Returns every chat-capable model the configured OpenAI key can access,
 * enriched with a description and per-1M-token pricing from the local catalog.
 *
 * The list is fetched live so newly released models appear immediately; models
 * missing from the catalog are still returned, just without pricing.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { models: [], error: "OPENAI_API_KEY is not set in this environment." },
      { status: 200 },
    )
  }

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error("[ai-models/openai] list failed:", detail)
      return NextResponse.json(
        { models: [], error: `OpenAI rejected the request (${res.status}). Check the API key.` },
        { status: 200 },
      )
    }

    const payload = await res.json()
    const ids: string[] = (payload?.data ?? []).map((m: any) => m.id).filter(Boolean)

    const models = ids
      .filter(isChatCapableOpenAIModel)
      .map((id) => {
        const meta = lookupMeta(id, OPENAI_MODEL_META)
        return {
          id,
          label: meta?.label ?? id,
          description: meta?.description ?? "No description on file — see the OpenAI model docs.",
          inputPrice: meta?.inputPrice ?? null,
          outputPrice: meta?.outputPrice ?? null,
          recommended: meta?.recommended ?? false,
          deprecated: meta?.deprecated ?? false,
          vision: meta?.vision ?? false,
        }
      })
      // Recommended first, then deprecated last, then alphabetical.
      .sort((a, b) => {
        if (a.recommended !== b.recommended) return a.recommended ? -1 : 1
        if (a.deprecated !== b.deprecated) return a.deprecated ? 1 : -1
        return a.id.localeCompare(b.id)
      })

    return NextResponse.json({ models })
  } catch (err) {
    console.error("[ai-models/openai] error:", err)
    return NextResponse.json(
      { models: [], error: "Could not reach the OpenAI API." },
      { status: 200 },
    )
  }
}
