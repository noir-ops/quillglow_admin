import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Sends one tiny prompt to the selected provider/model so the admin can confirm
 * the key works and the model id is valid before saving.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { provider, model, reasoningEffort } = await req.json()

  if (provider !== "openai" && provider !== "gemini") {
    return NextResponse.json({ ok: false, error: "Unknown provider" }, { status: 400 })
  }
  if (!model) {
    return NextResponse.json({ ok: false, error: "No model selected" }, { status: 400 })
  }

  const prompt = "Reply with exactly the word: OK"
  const startedAt = Date.now()

  try {
    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY is not set" })

      const isReasoning = /^(gpt-5|o1|o3|o4)/i.test(model)
      const payload: Record<string, unknown> = {
        model,
        messages: [{ role: "user", content: prompt }],
      }
      if (isReasoning) {
        payload.max_completion_tokens = 2048
        if (reasoningEffort) payload.reasoning_effort = reasoningEffort
      } else {
        payload.max_tokens = 20
        payload.temperature = 0
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: data?.error?.message ?? `HTTP ${res.status}` })
      }
      return NextResponse.json({
        ok: true,
        reply: data?.choices?.[0]?.message?.content ?? "",
        latencyMs: Date.now() - startedAt,
      })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ ok: false, error: "GEMINI_API_KEY is not set" })

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 20 },
        }),
      },
    )

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data?.error?.message ?? `HTTP ${res.status}` })
    }
    const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("")
    return NextResponse.json({ ok: true, reply: text, latencyMs: Date.now() - startedAt })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Request failed",
    })
  }
}
