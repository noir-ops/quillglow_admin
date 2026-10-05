import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Users } from "lucide-react"

/**
 * Learner-facing view of the curriculum: which syllabi are actually
 * selectable, and how many learners have chosen each.
 *
 * The picker itself lives in the QuillGlow app (learner Settings), not here —
 * this is the admin's read-only window into it. It answers the two questions
 * an admin actually has after importing curriculum: "can students pick this
 * yet?" and "is anyone using it?"
 *
 * Selectability is derived from `available_syllabi`, the same view the
 * learner picker reads, so what's shown here is exactly what students see.
 * A syllabus with topics but zero depth-2 concepts is imported but NOT
 * selectable — that mismatch is invisible on the import list above and is
 * precisely the thing worth surfacing.
 */
export async function SyllabusAdoption() {
  const supabase = createAdminClient()

  // Learner counts come from admin_syllabus_adoption() (scripts/067), which
  // counts in the database. This used to fetch learners' profiles — capped at
  // 1,000 rows — so "X of N learners have chosen a syllabus" and every
  // per-syllabus count topped out at 1,000.
  const [{ data: available, error: availError }, { data: adoption }] = await Promise.all([
    supabase.from("available_syllabi").select("syllabus, concept_count, subject_count, subjects"),
    supabase.rpc("admin_syllabus_adoption"),
  ])

  // The view ships in migration 007. If it isn't there yet, say so plainly
  // rather than rendering an empty state that looks like "no one has chosen".
  if (availError) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex items-start gap-2 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Syllabus selection not migrated yet</p>
            <p className="mt-1 text-muted-foreground">
              Run <code className="text-xs">scripts/007_learner_syllabus_selection.sql</code>. Until then learners
              can&apos;t choose a syllabus, and every AI feature runs without curriculum grounding.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const rows = available ?? []
  const a: any = adoption ?? {}
  const learnersTotal: number = a.learners_total ?? 0
  const learners = { length: learnersTotal }

  const primaryCounts = new Map<string, number>()
  const secondaryCounts = new Map<string, number>()
  for (const r of a.by_syllabus ?? []) {
    primaryCounts.set(r.syllabus, Number(r.primary) || 0)
    secondaryCounts.set(r.syllabus, Number(r.secondary) || 0)
  }
  // Learners per subject (from their subject selections), per syllabus.
  const subjectLearners = new Map<string, number>()
  for (const r of a.by_subject ?? []) subjectLearners.set(`${r.syllabus}::${r.subject}`, Number(r.learners) || 0)

  const withAnySelection: number = a.with_selection ?? 0
  const unset = learnersTotal - withAnySelection

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Learner syllabus selection</h2>
        <p className="text-sm text-muted-foreground">
          What students can choose in their settings. Sprout AI, the Study Agent, EchoMind, the planner and Exam
          Readiness™ all scope to these choices.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-2 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">Nothing is selectable yet</p>
              <p className="mt-1 text-muted-foreground">
                A syllabus only becomes selectable once it has concepts imported. Import at least one above.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((r: any) => (
              <Card key={r.syllabus}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{r.syllabus}</p>
                    <Badge variant="outline">Selectable</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.subject_count} subject{r.subject_count === 1 ? "" : "s"} · {r.concept_count} concepts
                  </p>

                  {/* Subject names, so an admin can see what's already loaded
                      before importing — the counts alone don't tell you
                      whether "Biology" is in there. */}
                  {Array.isArray(r.subjects) && r.subjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.subjects.map((s: string) => (
                        <span
                          key={s}
                          className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          title={`${(subjectLearners.get(`${r.syllabus}::${s}`) ?? 0).toLocaleString()} learners chose ${s}`}
                        >
                          {s}
                          <span className="ml-1 font-medium text-foreground">
                            {(subjectLearners.get(`${r.syllabus}::${s}`) ?? 0).toLocaleString()}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3 border-t pt-3 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{primaryCounts.get(r.syllabus) ?? 0}</span>
                      <span className="text-muted-foreground">primary</span>
                    </span>
                    <span className="text-muted-foreground">
                      +{secondaryCounts.get(r.syllabus) ?? 0} secondary
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {withAnySelection.toLocaleString()} of {learnersTotal.toLocaleString()} learners have chosen a syllabus
            {unset > 0 && (
              <>
                {" "}
                — the remaining {unset.toLocaleString()} get AI answers with no curriculum grounding until they pick one.
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
