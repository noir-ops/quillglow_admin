import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { AiProviderSettingsForm } from "@/components/ai-provider-settings-form"

export const revalidate = 0

export default async function ApisPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const adminSupabase = createAdminClient()
  const { data: settings } = await adminSupabase
    .from("ai_provider_settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">APIs</h1>
        <p className="text-muted-foreground">
          Choose which LLM provider powers every AI feature in QuillGlow, and pick the model for each.
        </p>
      </div>

      <AiProviderSettingsForm
        initialSettings={{
          activeProvider: settings?.active_provider === "gemini" ? "gemini" : "openai",
          openaiModel: settings?.openai_model ?? "gpt-4.1-mini",
          openaiVisionModel: settings?.openai_vision_model ?? "",
          openaiReasoningEffort: settings?.openai_reasoning_effort ?? "low",
          geminiModel: settings?.gemini_model ?? "gemini-2.5-flash",
          geminiVisionModel: settings?.gemini_vision_model ?? "",
        }}
        lastUpdated={settings?.updated_at ?? null}
      />
    </div>
  )
}
