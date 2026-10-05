import { createAdminClient } from "@/lib/supabase/admin"
import { PlanLimitsEditor, type LimitRow } from "@/components/plan-limits-editor"

export const revalidate = 0

// Mirrors FEATURE_INFO in the main app (lib/billing/usage.ts).
const FEATURES: [string, string, string][] = [
  ["tutor_chat", "AI Tutor (Study AI + Sprout AI)", "messages"],
  ["quilly_chat", "Quilly chat", "messages"],
  ["revision_notes", "AI revision notes", "notes"],
  ["flashcards", "AI flashcards", "cards"],
  ["mind_map", "Mind Maps", "maps"],
  ["audio_overview", "LearnCast", "episodes"],
  ["writereal_detect", "WriteReal · AI Detector", "checks"],
  ["writereal_grammar", "WriteReal · Grammar Checker", "checks"],
  ["writereal_humanize", "WriteReal · AI Humanizer", "rewrites"],
  ["writereal_paraphrase", "WriteReal · Paraphraser", "rewrites"],
  ["study_agent", "StudyPilot", "runs"],
  ["study_plan", "Study Planner AI plans", "plans"],
  ["task_suggestions", "AI task suggestions", "suggestions"],
  ["syllabus_analysis", "Syllabus analysis", "analyses"],
  ["weekly_review", "Weekly review tests", "tests"],
  ["exam_questions", "Practice exams", "exams"],
  ["mock_exam", "Mock MCQ exams", "exams"],
  ["essay", "Essay writer", "essays"],
  ["echomind", "EchoMind", "sessions"],
  ["stress_relief", "Stress-relief chat", "messages"],
  ["quest_generation", "Quests", "quests"],
  ["_default", "Fallback for any feature without its own row", "requests"],
]

/**
 * Plan Limits — every metered AI feature's monthly allowance, per plan.
 * Reads and writes the same plan_limits table the main app enforces, so a
 * change here is what learners get, with no deploy.
 */
export default async function PlanLimitsPage() {
  const admin = createAdminClient()
  const { data } = await admin.from("plan_limits").select("plan_type, feature, monthly_limit")
  const find = (plan: string, f: string) => {
    const r = (data ?? []).find((x: any) => x.plan_type === plan && x.feature === f)
    return r ? Number(r.monthly_limit) : null
  }
  const known = new Set(FEATURES.map(([f]) => f))
  const extra = Array.from(new Set((data ?? []).map((x: any) => x.feature as string))).filter(
    (f) => !known.has(f) && f !== "ai_total" && f !== "search_summary",
  )
  const rows: LimitRow[] = [...FEATURES, ...extra.map((f) => [f, f, "requests"] as [string, string, string])].map(
    ([feature, label, unit]) => ({ feature, label, unit, scholar: find("scholar", feature), genius: find("genius", feature) }),
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plan Limits</h1>
        <p className="text-muted-foreground">
          How many times each plan can use each AI feature per calendar month (UTC). Learners see these exact numbers
          in Settings → Plan &amp; usage.
        </p>
      </div>
      {(data ?? []).length === 0 ? (
        <p className="text-sm text-destructive">No plan limits found — has migration 066 been run?</p>
      ) : (
        <PlanLimitsEditor rows={rows} />
      )}
    </div>
  )
}
