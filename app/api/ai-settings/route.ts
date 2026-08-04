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
  } = body

  if (active_provider !== "openai" && active_provider !== "gemini") {
    return NextResponse.json({ error: "active_provider must be 'openai' or 'gemini'" }, { status: 400 })
  }
  if (!openai_model || !gemini_model) {
    return NextResponse.json({ error: "A model must be selected for both providers" }, { status: 400 })
  }
  const efforts = ["minimal", "low", "medium", "high"]
  if (openai_reasoning_effort && !efforts.includes(openai_reasoning_effort)) {
    return NextResponse.json({ error: "Invalid reasoning effort" }, { status: 400 })
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
