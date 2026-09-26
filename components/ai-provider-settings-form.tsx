"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import * as SelectPrimitive from "@radix-ui/react-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, CheckCircle2, CheckIcon, Loader2, RefreshCw, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

type Provider = "openai" | "gemini" | "opensource"

interface ModelOption {
  id: string
  label: string
  description: string
  inputPrice: number | null
  outputPrice: number | null
  recommended: boolean
  deprecated: boolean
  vision: boolean
  contextWindow?: number | null
}

interface Settings {
  activeProvider: Provider
  openaiModel: string
  openaiVisionModel: string
  openaiReasoningEffort: string
  geminiModel: string
  geminiVisionModel: string
  opensourceBaseUrl: string
  opensourceModel: string
}

interface Props {
  initialSettings: Settings
  lastUpdated: string | null
}

const NONE = "__none__"

function formatPrice(value: number | null): string {
  if (value == null) return "—"
  return `$${value < 1 ? value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") : value.toFixed(2)}`
}

function priceLine(model: ModelOption): string {
  if (model.inputPrice == null && model.outputPrice == null) {
    return "Pricing not listed — check the provider docs"
  }
  return `${formatPrice(model.inputPrice)} in / ${formatPrice(model.outputPrice)} out per 1M tokens`
}

/**
 * A select option that shows the model's name, id, description and token price.
 *
 * This deliberately does NOT use the shared `SelectItem`: that wraps *all*
 * children in Radix's `ItemText`, which portals them into the trigger — so the
 * whole multi-line block would be duplicated inside the closed select. Here only
 * the compact label goes in `ItemText`; the description and pricing sit beside
 * it and stay in the dropdown.
 */
function ModelSelectItem({ model }: { model: ModelOption }) {
  return (
    <SelectPrimitive.Item
      value={model.id}
      textValue={`${model.label} (${model.id})`}
      className={cn(
        "relative flex w-full cursor-default select-none flex-col gap-1 rounded-sm py-2 pl-2 pr-8 text-sm outline-hidden",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      )}
    >
      <span className="absolute right-2 top-2.5 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{model.label}</span>
          <code className="rounded bg-muted px-1 text-[11px]">{model.id}</code>
        </span>
      </SelectPrimitive.ItemText>

      <span className="flex flex-wrap items-center gap-1.5">
        {model.recommended && (
          <Badge variant="default" className="h-4 px-1 text-[10px]">
            Recommended
          </Badge>
        )}
        {model.deprecated && (
          <Badge variant="destructive" className="h-4 px-1 text-[10px]">
            Deprecated
          </Badge>
        )}
        {model.vision && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            Vision
          </Badge>
        )}
      </span>

      <span className="max-w-[540px] text-xs leading-snug text-muted-foreground">{model.description}</span>
      <span className="text-xs font-medium text-muted-foreground">{priceLine(model)}</span>
    </SelectPrimitive.Item>
  )
}

export function AiProviderSettingsForm({ initialSettings, lastUpdated }: Props) {
  const router = useRouter()

  const [settings, setSettings] = useState<Settings>(initialSettings)
  const [openaiModels, setOpenaiModels] = useState<ModelOption[]>([])
  const [geminiModels, setGeminiModels] = useState<ModelOption[]>([])
  const [opensourceModels, setOpensourceModels] = useState<ModelOption[]>([])
  const [openaiError, setOpenaiError] = useState<string | null>(null)
  const [geminiError, setGeminiError] = useState<string | null>(null)
  const [opensourceError, setOpensourceError] = useState<string | null>(null)
  const [loadingModels, setLoadingModels] = useState(true)
  const [loadingOpensourceModels, setLoadingOpensourceModels] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [testing, setTesting] = useState<Provider | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string }>>({})

  const loadModels = useCallback(async () => {
    setLoadingModels(true)
    try {
      const [openaiRes, geminiRes] = await Promise.all([
        fetch("/api/ai-models/openai", { cache: "no-store" }),
        fetch("/api/ai-models/gemini", { cache: "no-store" }),
      ])
      const openaiData = await openaiRes.json()
      const geminiData = await geminiRes.json()

      setOpenaiModels(openaiData.models ?? [])
      setOpenaiError(openaiData.error ?? null)
      setGeminiModels(geminiData.models ?? [])
      setGeminiError(geminiData.error ?? null)
    } catch {
      setOpenaiError("Could not load the model list.")
      setGeminiError("Could not load the model list.")
    } finally {
      setLoadingModels(false)
    }
  }, [])

  useEffect(() => {
    loadModels()
  }, [loadModels])

  const fetchOpensourceModels = useCallback(async (baseUrl: string) => {
    if (!baseUrl.trim()) {
      setOpensourceModels([])
      setOpensourceError(null)
      return
    }
    setLoadingOpensourceModels(true)
    try {
      const res = await fetch(`/api/ai-models/opensource?baseUrl=${encodeURIComponent(baseUrl.trim())}`, {
        cache: "no-store",
      })
      const data = await res.json()
      setOpensourceModels(data.models ?? [])
      setOpensourceError(data.error ?? null)
    } catch {
      setOpensourceModels([])
      setOpensourceError("Could not load the model list.")
    } finally {
      setLoadingOpensourceModels(false)
    }
  }, [])

  // Try once on mount if a base URL was already saved — after that it's a
  // manual "Fetch models" action, since typing a new URL shouldn't fire a
  // request on every keystroke.
  useEffect(() => {
    if (initialSettings.opensourceBaseUrl) fetchOpensourceModels(initialSettings.opensourceBaseUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    setSaveSuccess(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const res = await fetch("/api/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active_provider: settings.activeProvider,
          openai_model: settings.openaiModel,
          openai_vision_model: settings.openaiVisionModel || null,
          openai_reasoning_effort: settings.openaiReasoningEffort,
          gemini_model: settings.geminiModel,
          gemini_vision_model: settings.geminiVisionModel || null,
          opensource_base_url: settings.opensourceBaseUrl || null,
          opensource_model: settings.opensourceModel || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save")

      setSaveSuccess(true)
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (provider: Provider) => {
    setTesting(provider)
    setTestResult((prev) => ({ ...prev, [provider]: undefined as any }))
    try {
      const res = await fetch("/api/ai-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model:
            provider === "openai"
              ? settings.openaiModel
              : provider === "gemini"
                ? settings.geminiModel
                : settings.opensourceModel,
          reasoningEffort: settings.openaiReasoningEffort,
          baseUrl: provider === "opensource" ? settings.opensourceBaseUrl : undefined,
        }),
      })
      const data = await res.json()
      setTestResult((prev) => ({
        ...prev,
        [provider]: data.ok
          ? { ok: true, message: `Responded in ${data.latencyMs}ms: "${String(data.reply).trim().slice(0, 60)}"` }
          : { ok: false, message: data.error ?? "Test failed" },
      }))
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [provider]: { ok: false, message: err instanceof Error ? err.message : "Test failed" },
      }))
    } finally {
      setTesting(null)
    }
  }

  const renderModelSelect = (
    models: ModelOption[],
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    allowNone = false,
  ) => (
    <Select value={value || (allowNone ? NONE : "")} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[440px]">
        {allowNone && (
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">Use the main model</span>
          </SelectItem>
        )}
        {models.length === 0 && (
          <div className="px-2 py-3 text-sm text-muted-foreground">No models available.</div>
        )}
        {models.map((model) => (
          <ModelSelectItem key={model.id} model={model} />
        ))}
      </SelectContent>
    </Select>
  )

  const selectedOpenai = openaiModels.find((m) => m.id === settings.openaiModel)
  const selectedGemini = geminiModels.find((m) => m.id === settings.geminiModel)
  const isReasoning = /^(gpt-5|o1|o3|o4)/i.test(settings.openaiModel)

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Active provider */}
      <Card>
        <CardHeader>
          <CardTitle>Active provider</CardTitle>
          <CardDescription>
            Every AI feature in QuillGlow — flashcards, study plans, revision notes, mind maps, mock exams, essay
            grading, PDF exam questions, audio overviews, EchoMind, Quilly, the AI tutor, the study agent, WriteReal,
            search summaries, the support chatbot, stress-relief chat, syllabus analysis and quest generation — uses
            the provider selected here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.activeProvider}
            onValueChange={(v) => update({ activeProvider: v as Provider })}
            className="grid gap-3 sm:grid-cols-3"
          >
            <label
              htmlFor="provider-openai"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                settings.activeProvider === "openai" ? "border-primary bg-accent/40" : "hover:bg-accent/20"
              }`}
            >
              <RadioGroupItem value="openai" id="provider-openai" className="mt-1" />
              <div>
                <p className="font-medium">ChatGPT (OpenAI)</p>
                <p className="text-sm text-muted-foreground">
                  Uses <code className="text-xs">OPENAI_API_KEY</code>
                </p>
              </div>
            </label>

            <label
              htmlFor="provider-gemini"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                settings.activeProvider === "gemini" ? "border-primary bg-accent/40" : "hover:bg-accent/20"
              }`}
            >
              <RadioGroupItem value="gemini" id="provider-gemini" className="mt-1" />
              <div>
                <p className="font-medium">Gemini (Google)</p>
                <p className="text-sm text-muted-foreground">
                  Uses <code className="text-xs">GEMINI_API_KEY</code>
                </p>
              </div>
            </label>

            <label
              htmlFor="provider-opensource"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                settings.activeProvider === "opensource" ? "border-primary bg-accent/40" : "hover:bg-accent/20"
              }`}
            >
              <RadioGroupItem value="opensource" id="provider-opensource" className="mt-1" />
              <div>
                <p className="font-medium">Open-source model</p>
                <p className="text-sm text-muted-foreground">
                  Any OpenAI-compatible endpoint — self-hosted or hosted
                </p>
              </div>
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loadingModels ? "Loading live model lists…" : "Model lists are fetched live from each provider."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={loadModels} disabled={loadingModels}>
          {loadingModels ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh models
        </Button>
      </div>

      {/* ChatGPT section */}
      <Card className={settings.activeProvider === "openai" ? "border-primary" : undefined}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                ChatGPT (OpenAI)
                {settings.activeProvider === "openai" && <Badge>Active</Badge>}
              </CardTitle>
              <CardDescription>Pick the model QuillGlow calls when OpenAI is the active provider.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {openaiError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{openaiError}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="openai-model">Model</Label>
            {renderModelSelect(
              openaiModels,
              settings.openaiModel,
              (v) => update({ openaiModel: v }),
              "Select an OpenAI model",
            )}
            {selectedOpenai && (
              <p className="text-xs text-muted-foreground">
                {selectedOpenai.description} · {priceLine(selectedOpenai)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-vision-model">Vision model (optional)</Label>
            {renderModelSelect(
              openaiModels.filter((m) => m.vision),
              settings.openaiVisionModel,
              (v) => update({ openaiVisionModel: v }),
              "Use the main model",
              true,
            )}
            <p className="text-xs text-muted-foreground">
              Used only when a request contains images (image flashcards, tutor screenshots). Leave unset to use the
              main model.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-effort">Reasoning effort</Label>
            <Select
              value={settings.openaiReasoningEffort}
              onValueChange={(v) => update({ openaiReasoningEffort: v })}
            >
              <SelectTrigger id="openai-effort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal — fastest and cheapest</SelectItem>
                <SelectItem value="low">Low — good balance for study content</SelectItem>
                <SelectItem value="medium">Medium — more careful, slower</SelectItem>
                <SelectItem value="high">High — most accurate, most expensive</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isReasoning
                ? "Applies to the selected model — reasoning tokens are billed as output, so higher effort costs more."
                : "Ignored by the selected model (only gpt-5 / o-series models reason)."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTest("openai")}
              disabled={testing !== null || !settings.openaiModel}
            >
              {testing === "openai" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Test connection
            </Button>
            {testResult.openai && (
              <span
                className={`flex items-center gap-1.5 text-sm ${
                  testResult.openai.ok ? "text-green-600 dark:text-green-500" : "text-destructive"
                }`}
              >
                {testResult.openai.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {testResult.openai.message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gemini section */}
      <Card className={settings.activeProvider === "gemini" ? "border-primary" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Gemini (Google)
            {settings.activeProvider === "gemini" && <Badge>Active</Badge>}
          </CardTitle>
          <CardDescription>Pick the model QuillGlow calls when Gemini is the active provider.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {geminiError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{geminiError}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="gemini-model">Model</Label>
            {renderModelSelect(
              geminiModels,
              settings.geminiModel,
              (v) => update({ geminiModel: v }),
              "Select a Gemini model",
            )}
            {selectedGemini && (
              <p className="text-xs text-muted-foreground">
                {selectedGemini.description} · {priceLine(selectedGemini)}
                {selectedGemini.contextWindow
                  ? ` · ${selectedGemini.contextWindow.toLocaleString()} token context`
                  : ""}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-vision-model">Vision model (optional)</Label>
            {renderModelSelect(
              geminiModels.filter((m) => m.vision),
              settings.geminiVisionModel,
              (v) => update({ geminiVisionModel: v }),
              "Use the main model",
              true,
            )}
            <p className="text-xs text-muted-foreground">
              Used only when a request contains images. Leave unset to use the main model.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTest("gemini")}
              disabled={testing !== null || !settings.geminiModel}
            >
              {testing === "gemini" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Test connection
            </Button>
            {testResult.gemini && (
              <span
                className={`flex items-center gap-1.5 text-sm ${
                  testResult.gemini.ok ? "text-green-600 dark:text-green-500" : "text-destructive"
                }`}
              >
                {testResult.gemini.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {testResult.gemini.message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Open-source model section */}
      <Card className={settings.activeProvider === "opensource" ? "border-primary" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Open-source model
            {settings.activeProvider === "opensource" && <Badge>Active</Badge>}
          </CardTitle>
          <CardDescription>
            Any endpoint that speaks the OpenAI chat-completions format — a self-hosted Ollama/vLLM/LM Studio server,
            or a hosted open-weight provider like Together, Groq, or OpenRouter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {opensourceError && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>{opensourceError}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="opensource-base-url">Base URL</Label>
            <div className="flex gap-2">
              <input
                id="opensource-base-url"
                type="url"
                placeholder="https://your-endpoint.example.com/v1"
                value={settings.opensourceBaseUrl}
                onChange={(e) => update({ opensourceBaseUrl: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchOpensourceModels(settings.opensourceBaseUrl)}
                disabled={loadingOpensourceModels || !settings.opensourceBaseUrl.trim()}
              >
                {loadingOpensourceModels ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Fetch models</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Should end in <code className="text-[11px]">/v1</code> for most OpenAI-compatible servers (e.g. Ollama's{" "}
              <code className="text-[11px]">http://localhost:11434/v1</code>).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opensource-model">Model</Label>
            {opensourceModels.length > 0 ? (
              <Select value={settings.opensourceModel} onValueChange={(v) => update({ opensourceModel: v })}>
                <SelectTrigger id="opensource-model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="max-h-[440px]">
                  {opensourceModels.map((model) => (
                    <ModelSelectItem key={model.id} model={model} />
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                id="opensource-model"
                type="text"
                placeholder="e.g. llama-3.1-70b-instruct"
                value={settings.opensourceModel}
                onChange={(e) => update({ opensourceModel: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {opensourceModels.length > 0
                ? "Fetched from your endpoint's /models list."
                : "Your endpoint didn't return a model list (or none was fetched yet) — type the model id your server expects."}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            API key (if your endpoint requires one) is set via{" "}
            <code className="text-[11px]">OPEN_SOURCE_MODEL_API_KEY</code> in the environment — never entered here.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTest("opensource")}
              disabled={testing !== null || !settings.opensourceModel || !settings.opensourceBaseUrl}
            >
              {testing === "opensource" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Test connection
            </Button>
            {testResult.opensource && (
              <span
                className={`flex items-center gap-1.5 text-sm ${
                  testResult.opensource.ok ? "text-green-600 dark:text-green-500" : "text-destructive"
                }`}
              >
                {testResult.opensource.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {testResult.opensource.message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>

        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            Saved. QuillGlow picks this up within 30 seconds.
          </span>
        )}
        {saveError && (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {saveError}
          </span>
        )}
        {lastUpdated && !saveSuccess && !saveError && (
          <span className="text-sm text-muted-foreground">
            Last updated {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </div>
    </form>
  )
}
