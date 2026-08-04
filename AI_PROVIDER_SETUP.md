# APIs Page — LLM Provider Control

The **Admin → APIs** page controls which LLM powers every AI feature in
QuillGlow. It writes to the shared `ai_provider_settings` table; the QuillGlow
app reads that row on every AI request (cached 30s).

## 1. Run the migration

Run `scripts/005_create_ai_provider_settings.sql` against your Supabase project.
(It is the same migration shipped with the QuillGlow app as `014_...` — run it
once, in whichever project you prefer.)

## 2. Environment variables

```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
```

These are needed so the page can list each provider's models and run the
"Test connection" button. `SUPABASE_SERVICE_ROLE_KEY` must already be set.

## 3. Using the page

- **Active provider** — radio buttons for ChatGPT (OpenAI) or Gemini (Google).
  Only one is live at a time; the other section keeps its saved model so you can
  flip between them instantly.
- **Model dropdowns** — populated live from `GET /v1/models` (OpenAI) and
  `GET /v1beta/models` (Gemini), then enriched with a description and per-1M-token
  input/output pricing from `lib/ai/model-catalog.ts`. Models released after that
  catalog was last updated still appear — they just show "Pricing not listed".
  Options are sorted recommended-first, deprecated-last.
- **Vision model (optional)** — used only for requests containing images.
- **Reasoning effort** — OpenAI `gpt-5*`/`o*` models only.
- **Test connection** — sends one tiny prompt and reports the reply and latency,
  so you can verify a key and model id before saving.

## Keeping pricing current

Model pricing changes often. To refresh it, edit the `OPENAI_MODEL_META` and
`GEMINI_MODEL_META` maps in `lib/ai/model-catalog.ts` against:

- https://developers.openai.com/api/docs/pricing
- https://ai.google.dev/gemini-api/docs/pricing

Nothing breaks if the catalog goes stale — the model list itself is always live,
and unknown models simply render without a price.
