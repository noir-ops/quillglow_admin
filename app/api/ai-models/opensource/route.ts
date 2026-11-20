import { NextResponse } from "next/server"
import { isAdminUser } from "@/lib/auth/admin"
import { normalizeOpenSourceBaseUrl, openSourceHeaders } from "@/lib/ai/opensource"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Lists models from an OpenAI-compatible `/models` endpoint at an
 * admin-supplied base URL — covers a self-hosted Ollama/vLLM/LM Studio
 * server or a hosted open-weight provider (Together, Groq, OpenRouter, etc).
 *
 * Unlike the OpenAI/Gemini routes, the base URL comes from the request
 * (the admin may be typing a URL that hasn't been saved yet), not from a
 * fixed env var. The API key, if the endpoint needs one at all, still comes
 * from OPEN_SOURCE_MODEL_API_KEY — never accepted from the client.
 *
 * Many self-hosted servers don't implement `/models` at all, so a failure
 * here is expected and not fatal: the form falls back to a free-text model
 * id input rather than requiring this to succeed.
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!(await isAdminUser(supabase, user))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const baseUrl = new URL(req.url).searchParams.get("baseUrl")?.trim()
  if (!baseUrl) {
    return NextResponse.json({ models: [], error: "No base URL provided." }, { status: 200 })
  }



  try {
    const normalizedBaseUrl = normalizeOpenSourceBaseUrl(baseUrl)
    const res = await fetch(`${normalizedBaseUrl}/models`, {
      headers: openSourceHeaders(),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return NextResponse.json(
        {
          models: [],
          error: `Endpoint rejected the request (${res.status}). You can still type a model id manually below.`,
        },
        { status: 200 },
      )
    }

    const payload = await res.json()
    const ids: string[] = (Array.isArray(payload?.data) ? payload.data : [])
      .map((m: any) => m?.id)
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)

    const models = ids.sort((a, b) => a.localeCompare(b)).map((id) => ({
      id,
      label: id,
      description: "Served from your configured endpoint — no pricing catalog for open-source models.",
      inputPrice: null,
      outputPrice: null,
      recommended: false,
      deprecated: false,
      vision: false,
    }))

    return NextResponse.json({ models })
  } catch (err) {
    return NextResponse.json(
      {
        models: [],
        error:
          "Could not reach that endpoint, or it doesn't implement /models. You can still type a model id manually below.",
      },
      { status: 200 },
    )
  }
}
