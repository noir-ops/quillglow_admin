import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const DEFAULTS = {
  id: "global",
  active_provider: "openai",
  openai_model: "gpt-4.1-mini",
  openai_vision_model: null,
  openai_reasoning_effort: "low",
  gemini_model: "gemini-2.5-flash",
  gemini_vision_model: null,
  opensource_base_url: null,
  opensource_model: null,
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.from("ai_provider_settings").select("*").eq("id", "global").maybeSingle()

  if (error) {
    console.error("[ai-settings] read failed:", error.message)
    return NextResponse.json({ error: "Failed to load AI settings" }, { status: 500 })
  }

  return NextResponse.json({
    settings: data ?? DEFAULTS,
    keys: {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      // Informational only — many open-source endpoints (e.g. a local Ollama
      // server) don't require a key at all, so this being false doesn't mean
      // the provider is unusable, just that no key will be sent.
      opensource: !!process.env.OPEN_SOURCE_MODEL_API_KEY,
    },
  })
}

export async function POST(req: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const {
    active_provider,
    openai_model,
    openai_vision_model,
    openai_reasoning_effort,
    gemini_model,
    gemini_vision_model,
    opensource_base_url,
    opensource_model,
  } = body

  if (!["openai", "gemini", "opensource"].includes(active_provider)) {
    return NextResponse.json(
      { error: "active_provider must be 'openai', 'gemini' or 'opensource'" },
      { status: 400 },
    )
  }
  if (!openai_model || !gemini_model) {
    return NextResponse.json({ error: "A model must be selected for both providers" }, { status: 400 })
  }
  const efforts = ["minimal", "low", "medium", "high"]
  if (openai_reasoning_effort && !efforts.includes(openai_reasoning_effort)) {
    return NextResponse.json({ error: "Invalid reasoning effort" }, { status: 400 })
  }
  // Open-source config is optional overall (not every deployment uses it),
  // but base URL and model must arrive together, and both are required if
  // it's the active provider.
  if ((opensource_base_url && !opensource_model) || (!opensource_base_url && opensource_model)) {
    return NextResponse.json(
      { error: "Open-source base URL and model must be set together" },
      { status: 400 },
    )
  }
  if (active_provider === "opensource" && (!opensource_base_url || !opensource_model)) {
    return NextResponse.json(
      { error: "Set the open-source base URL and model before activating it" },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("ai_provider_settings")
    .upsert(
      {
        id: "global",
        active_provider,
        openai_model,
        openai_vision_model: openai_vision_model || null,
        openai_reasoning_effort: openai_reasoning_effort || "low",
        gemini_model,
        gemini_vision_model: gemini_vision_model || null,
        opensource_base_url: opensource_base_url || null,
        opensource_model: opensource_model || null,
        updated_by: user.id,
      },
      { onConflict: "id" },
    )
    .select()
    .single()

  if (error) {
    console.error("[ai-settings] write failed:", error.message)
    return NextResponse.json({ error: "Failed to save AI settings" }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}
