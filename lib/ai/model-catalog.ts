/**
 * Curated metadata for OpenAI and Gemini models.
 *
 * The admin panel fetches the *live* model list from each provider's API, then
 * enriches every entry with the description and pricing below. Models that both
 * providers ship after this file was last updated still appear in the dropdown
 * — they just show "Pricing not listed" until the entry is added here.
 *
 * Prices are USD per 1M tokens, standard tier, short context.
 * Last verified against the provider docs: August 2026.
 *   OpenAI  https://developers.openai.com/api/docs/pricing
 *   Gemini  https://ai.google.dev/gemini-api/docs/pricing
 */

export interface ModelMeta {
  /** Friendly display name. */
  label: string
  /** Why you'd pick this model. */
  description: string
  /** USD per 1M input tokens. */
  inputPrice?: number
  /** USD per 1M output tokens. */
  outputPrice?: number
  /** Recommended as a good default for QuillGlow. */
  recommended?: boolean
  /** Legacy / scheduled for retirement. */
  deprecated?: boolean
  /** Accepts image input. */
  vision?: boolean
}

// ── OpenAI ──────────────────────────────────────────────────────────────────

export const OPENAI_MODEL_META: Record<string, ModelMeta> = {
  // Frontier
  "gpt-5.6-sol": {
    label: "GPT-5.6 Sol",
    description: "Top-end frontier reasoning. Best quality, highest cost — overkill for most study tasks.",
    inputPrice: 2.5,
    outputPrice: 15.0,
    vision: true,
  },
  "gpt-5.6-terra": {
    label: "GPT-5.6 Terra",
    description: "Strong frontier reasoning at mid-tier pricing. Great for essay grading and exam generation.",
    inputPrice: 1.0,
    outputPrice: 6.0,
    vision: true,
  },
  "gpt-5.6-luna": {
    label: "GPT-5.6 Luna",
    description: "Cheapest GPT-5.6-class model. Excellent quality-per-dollar for high-volume student traffic.",
    inputPrice: 0.1,
    outputPrice: 0.6,
    recommended: true,
    vision: true,
  },
  "gpt-5.5": {
    label: "GPT-5.5",
    description: "Previous frontier model for coding and professional work.",
    inputPrice: 2.5,
    outputPrice: 15.0,
    vision: true,
  },
  "gpt-5.5-pro": {
    label: "GPT-5.5 Pro",
    description: "Smarter, more precise GPT-5.5 with heavy reasoning. Very expensive and slow.",
    inputPrice: 15.0,
    outputPrice: 90.0,
    vision: true,
  },
  "gpt-5.4": {
    label: "GPT-5.4",
    description: "More affordable frontier-class model with configurable reasoning effort.",
    inputPrice: 1.25,
    outputPrice: 7.5,
    vision: true,
  },
  "gpt-5.4-mini": {
    label: "GPT-5.4 mini",
    description: "Strong mini model. Fast and cheap while still handling structured JSON reliably.",
    inputPrice: 0.375,
    outputPrice: 2.25,
    recommended: true,
    vision: true,
  },
  "gpt-5.4-nano": {
    label: "GPT-5.4 nano",
    description: "Cheapest GPT-5.4-class model. Best for simple, high-volume tasks like chat replies.",
    inputPrice: 0.1,
    outputPrice: 0.625,
    vision: true,
  },
  "gpt-5.4-pro": {
    label: "GPT-5.4 Pro",
    description: "Extended-reasoning version of GPT-5.4. Highest accuracy, highest latency and cost.",
    inputPrice: 15.0,
    outputPrice: 90.0,
    vision: true,
  },
  "chat-latest": {
    label: "Chat Latest",
    description: "The latest Instant model used in ChatGPT. Conversational tone, non-reasoning.",
    inputPrice: 5.0,
    outputPrice: 30.0,
    vision: true,
  },

  // Previous generations
  "gpt-5.2": {
    label: "GPT-5.2",
    description: "Previous frontier model with configurable reasoning effort.",
    vision: true,
  },
  "gpt-5.1": {
    label: "GPT-5.1",
    description: "Earlier GPT-5 generation, strong at coding and agentic tasks.",
    vision: true,
  },
  "gpt-5": {
    label: "GPT-5",
    description: "The original GPT-5 reasoning model. Superseded by the 5.4/5.5/5.6 lines.",
    inputPrice: 1.25,
    outputPrice: 10.0,
    vision: true,
  },
  "gpt-5-mini": {
    label: "GPT-5 mini",
    description: "Near-frontier intelligence for cost-sensitive, low-latency, high-volume workloads.",
    inputPrice: 0.25,
    outputPrice: 2.0,
    vision: true,
  },
  "gpt-5-nano": {
    label: "GPT-5 nano",
    description: "Fastest, most cost-efficient GPT-5 variant.",
    inputPrice: 0.05,
    outputPrice: 0.4,
    vision: true,
  },
  "gpt-5-pro": {
    label: "GPT-5 Pro",
    description: "GPT-5 with extra compute for smarter, more precise responses.",
    vision: true,
  },
  "gpt-4.1": {
    label: "GPT-4.1",
    description: "Smartest non-reasoning model. Predictable latency and no reasoning-token overhead.",
    inputPrice: 2.0,
    outputPrice: 8.0,
    vision: true,
  },
  "gpt-4.1-mini": {
    label: "GPT-4.1 mini",
    description: "Smaller, faster GPT-4.1. Reliable, cheap and instant — a safe default for QuillGlow.",
    inputPrice: 0.4,
    outputPrice: 1.6,
    recommended: true,
    vision: true,
  },
  "gpt-4.1-nano": {
    label: "GPT-4.1 nano",
    description: "Fastest, cheapest GPT-4.1 variant.",
    inputPrice: 0.1,
    outputPrice: 0.4,
    deprecated: true,
    vision: true,
  },
  "gpt-4o-mini": {
    label: "GPT-4o mini",
    description: "Fast, affordable small model for focused tasks.",
    inputPrice: 0.15,
    outputPrice: 0.6,
    vision: true,
  },
  "gpt-4o": {
    label: "GPT-4o",
    description: "Fast, intelligent, flexible GPT model. Deprecated — migrate to GPT-4.1 or GPT-5.x.",
    inputPrice: 2.5,
    outputPrice: 10.0,
    deprecated: true,
    vision: true,
  },
  "gpt-4-turbo": {
    label: "GPT-4 Turbo",
    description: "Older high-intelligence GPT model. Deprecated and expensive for what it does.",
    inputPrice: 10.0,
    outputPrice: 30.0,
    deprecated: true,
    vision: true,
  },
  "gpt-4": {
    label: "GPT-4",
    description: "The original GPT-4. Deprecated — far pricier and weaker than current models.",
    inputPrice: 30.0,
    outputPrice: 60.0,
    deprecated: true,
  },
  "gpt-3.5-turbo": {
    label: "GPT-3.5 Turbo",
    description: "Legacy cheap chat model. Deprecated and noticeably weaker at structured JSON.",
    inputPrice: 0.5,
    outputPrice: 1.5,
    deprecated: true,
  },
  o3: {
    label: "o3",
    description: "Reasoning model for complex tasks, succeeded by GPT-5.",
    inputPrice: 2.0,
    outputPrice: 8.0,
    vision: true,
  },
  "o4-mini": {
    label: "o4-mini",
    description: "Fast, cost-efficient reasoning model. Deprecated in favour of GPT-5 mini.",
    inputPrice: 1.1,
    outputPrice: 4.4,
    deprecated: true,
    vision: true,
  },
}

// ── Gemini ──────────────────────────────────────────────────────────────────

export const GEMINI_MODEL_META: Record<string, ModelMeta> = {
  "gemini-3.6-flash": {
    label: "Gemini 3.6 Flash",
    description: "Newest Flash model. Beats Gemini 3.1 Pro on many benchmarks at a fraction of the cost.",
    inputPrice: 1.5,
    outputPrice: 7.5,
    recommended: true,
    vision: true,
  },
  "gemini-3.5-flash": {
    label: "Gemini 3.5 Flash",
    description: "Fast, capable Flash model with a 1M-token context window.",
    inputPrice: 1.5,
    outputPrice: 9.0,
    vision: true,
  },
  "gemini-3.5-flash-lite": {
    label: "Gemini 3.5 Flash-Lite",
    description: "Budget tier with the full 1M context. Great for chat replies and short summaries.",
    inputPrice: 0.25,
    outputPrice: 1.5,
    vision: true,
  },
  "gemini-3.1-pro": {
    label: "Gemini 3.1 Pro",
    description: "Flagship reasoning model with a 2M-token context. Paid-only. Best for long documents.",
    inputPrice: 2.0,
    outputPrice: 12.0,
    vision: true,
  },
  "gemini-3.1-flash-lite": {
    label: "Gemini 3.1 Flash-Lite",
    description: "Cheapest current-generation tier. Retains a reduced free quota.",
    inputPrice: 0.25,
    outputPrice: 1.5,
    vision: true,
  },
  "gemini-3-pro": {
    label: "Gemini 3 Pro",
    description: "Stable flagship alternative to 3.1 Pro. Paid-only.",
    inputPrice: 2.0,
    outputPrice: 12.0,
    vision: true,
  },
  "gemini-3-flash": {
    label: "Gemini 3 Flash",
    description: "Solid default Flash model. Strong quality-per-dollar and keeps a free tier.",
    inputPrice: 0.5,
    outputPrice: 3.0,
    recommended: true,
    vision: true,
  },
  "gemini-2.5-pro": {
    label: "Gemini 2.5 Pro",
    description: "Legacy flagship. Still capable but retires 16 Oct 2026 — plan a migration.",
    inputPrice: 1.25,
    outputPrice: 10.0,
    deprecated: true,
    vision: true,
  },
  "gemini-2.5-flash": {
    label: "Gemini 2.5 Flash",
    description: "Legacy mid-tier model. Paid-only, retires 16 Oct 2026.",
    inputPrice: 0.3,
    outputPrice: 2.5,
    deprecated: true,
    vision: true,
  },
  "gemini-2.5-flash-lite": {
    label: "Gemini 2.5 Flash-Lite",
    description: "Legacy cheapest tier. Retires 16 Oct 2026.",
    inputPrice: 0.1,
    outputPrice: 0.4,
    deprecated: true,
    vision: true,
  },
  "gemini-2.0-flash": {
    label: "Gemini 2.0 Flash",
    description: "Shut down 1 June 2026 — do not use.",
    deprecated: true,
  },
  "gemini-2.0-flash-lite": {
    label: "Gemini 2.0 Flash-Lite",
    description: "Shut down 1 June 2026 — do not use.",
    deprecated: true,
  },
}

/** Strip the `models/` prefix Gemini returns and any `-latest`/date suffix noise. */
export function normalizeGeminiId(id: string): string {
  return id.replace(/^models\//, "")
}

/**
 * Look up metadata, falling back to a progressively shorter model id so that
 * dated snapshots (e.g. `gpt-5.4-mini-2026-03-01`) inherit their base entry.
 */
export function lookupMeta(id: string, table: Record<string, ModelMeta>): ModelMeta | null {
  if (table[id]) return table[id]
  const parts = id.split("-")
  for (let i = parts.length - 1; i >= 2; i--) {
    const candidate = parts.slice(0, i).join("-")
    if (table[candidate]) return table[candidate]
  }
  return null
}

/** Models that aren't usable for chat completions — filtered out of the dropdowns. */
export const OPENAI_EXCLUDE = [
  "embedding",
  "tts",
  "whisper",
  "moderation",
  "dall-e",
  "image",
  "audio",
  "realtime",
  "transcribe",
  "sora",
  "babbage",
  "davinci",
  "computer-use",
  "deep-research",
  "codex",
]

export function isChatCapableOpenAIModel(id: string): boolean {
  const lower = id.toLowerCase()
  if (OPENAI_EXCLUDE.some((token) => lower.includes(token))) return false
  return /^(gpt-|o[1-9]|chat-latest)/.test(lower)
}
