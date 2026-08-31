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

---

# Opportunities Management

**Admin → Opportunities** manages scholarships, competitions and grants — the
content the QuillGlow app's matching engine (`match_opportunities()` in
`019_opportunities.sql`) matches students against.

## Requires

The `019_opportunities.sql` migration must be applied (same file ships with the
QuillGlow app). This admin panel writes directly to the `opportunities` table via
the service role — no separate migration needed here.

## Using it

- **Add Opportunity** — full eligibility form: countries, syllabi, age range,
  education level, gender, required subjects, minimum Exam Readiness™.
- **Every eligibility field left blank means "no restriction"**, not "excludes
  everyone" — a blank Countries field is open to every country. The form says
  this explicitly so it isn't ambiguous while filling it in.
- **Slug** auto-generates from the title, editable before saving. Used as the
  stable identifier — don't change it after applications reference it.
- **Delete** — checks how many students have saved or applied first, and warns
  before removing those application records along with it.
- **Close** (via the row menu) — soft-deactivates without deleting, so the
  opportunity is preserved for reporting but stops appearing to students.

## What NOT to do

Don't set `education_level` or `gender` by any means other than this form's
"Any" option for unrestricted — the underlying column must be SQL `NULL`, not the
string `"any"` or `"__any__"`, or the matching engine's eligibility filter will
only match students who literally have that value, i.e. nobody. The form and its
server action handle this conversion automatically.
