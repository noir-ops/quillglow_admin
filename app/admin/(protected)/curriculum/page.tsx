import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { CurriculumUploader } from "@/components/curriculum-uploader"
import { BookOpen, Database, FileText, Layers } from "lucide-react"
import { CurriculumList } from "./curriculum-list"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Two count fixes here, on top of 056's aggregation-view fix:
 *
 * 1. "Syllabi" was list.length — the number of (syllabus, subject) rows
 *    from the summary view, NOT distinct syllabus programs. Four subjects
 *    loaded under one exam board (WAEC — Mathematics, Chemistry, Physics,
 *    Mathematics Core) showed as "Syllabi: 4", which reads as four
 *    separate programs when it's really one program with four subjects.
 *    Now split into two honestly-labeled numbers: Syllabus Programs
 *    (distinct syllabus names) and Subjects Loaded (the row count the old
 *    "Syllabi" stat was actually showing).
 *
 * 2. The AI-indexed fraction only ever looked for status values 'indexed'
 *    and 'pending' — any other status (e.g. a 'failed' row) silently
 *    vanished from both the numerator and the denominator instead of
 *    showing up as incomplete. Now sums every row in the denominator
 *    regardless of which status values actually exist, so the fraction
 *    can't quietly undercount.
 *
 * dynamic = "force-dynamic" added alongside revalidate = 0 — belt and
 * suspenders against Next.js's fetch caching masking a fresh count after
 * an import or delete, which both already call revalidatePath() but
 * couldn't rule out on their own without seeing this render dynamically.
 */
export default async function CurriculumPage() {
  const supabase = createAdminClient()

  const { data: syllabi } = await supabase
    .from("curriculum_syllabus_summary")
    .select("syllabus, subject, topics, concepts")
    .order("syllabus")

  const { data: indexingRows } = await supabase.from("curriculum_indexing_summary").select("status, count")

  const indexed = indexingRows?.find((r) => r.status === "indexed")?.count ?? 0
  const totalIndexable = (indexingRows ?? []).reduce((n, r) => n + r.count, 0)

  const list = syllabi ?? []
  const programCount = new Set(list.map((s) => s.syllabus)).size

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Curriculum</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The syllabus content that powers topic mastery, Exam Readiness™ and AI answers.
          </p>
        </div>

        {list.length === 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-4 text-sm">
              <p className="font-medium">No curriculum loaded yet</p>
              <p className="mt-1 text-muted-foreground">
                Until at least one syllabus is imported, topic mastery stays empty, Exam Readiness™
                cannot be calculated, and the AI has no approved material to ground its answers in.
                This is the single biggest blocker to the platform working end to end.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Syllabus Programs", value: programCount, icon: BookOpen },
            { label: "Subjects Loaded", value: list.length, icon: BookOpen },
            { label: "Topics", value: list.reduce((n, s) => n + s.topics, 0), icon: Layers },
            { label: "Concepts", value: list.reduce((n, s) => n + s.concepts, 0), icon: FileText },
            { label: "AI-indexed", value: `${indexed}/${totalIndexable}`, icon: Database },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </div>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

        <CurriculumList syllabi={list} />

        <CurriculumUploader />

        <Card>
          <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Notes</p>
            <p>
              Re-importing the same syllabus updates it rather than duplicating — concepts match on
              syllabus + slug. Fix a file and import again safely.
            </p>
            <p>
              Content is queued for AI indexing on import. Embedding runs in the QuillGlow app, which
              owns the embedding configuration, so &quot;AI-indexed&quot; may lag a few minutes behind.
            </p>
            <p>
              One complete syllabus beats several partial ones — Exam Readiness™ is scaled by
              coverage, so a half-loaded syllabus produces permanently low scores.
            </p>
            <p>
              Large syllabi import in batches now rather than one row at a time — a full subject with
              thousands of concepts should complete in seconds instead of timing out.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
