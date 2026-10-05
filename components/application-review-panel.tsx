"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Award, Check, FileText, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { getDocumentUrl, setApplicationStatus } from "@/app/admin/(protected)/applications/actions"

export interface AdminApplication {
  id: string
  status: string
  submittedAt: string | null
  notes: string | null
  /** Full application form answers (main app migration 064). */
  formData: Record<string, any> | null
  studentName: string
  opportunityTitle: string
  provider: string | null
  deadline: string | null
  awardAmount: number | null
  partnerRun: boolean
  documents: { id: string; type: string; filename: string | null; verification: string }[]
}

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  shortlisted: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  awarded: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

export function ApplicationReviewPanel({ applications }: { applications: AdminApplication[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No applications in this view.
        </CardContent>
      </Card>
    )
  }

  const review = (app: AdminApplication, status: "shortlisted" | "awarded" | "rejected") => {
    const verb = status === "shortlisted" ? "Shortlist" : status === "awarded" ? "Award" : "Reject"
    if (!confirm(`${verb} ${app.studentName} for "${app.opportunityTitle}"? The student will be notified.`)) return

    setPendingId(app.id)
    startTransition(async () => {
      const res = await setApplicationStatus(app.id, status)
      setPendingId(null)
      if (!res.ok) {
        toast.error(res.error ?? "Could not update application")
        return
      }
      toast.success(`${app.studentName} ${status}`)
      router.refresh()
    })
  }

  const openDocument = async (docId: string) => {
    const res = await getDocumentUrl(docId)
    if (!res.ok || !res.url) {
      toast.error(res.error ?? "Could not open document")
      return
    }
    window.open(res.url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => {
        const busy = pendingId === app.id
        return (
          <Card key={app.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{app.studentName}</p>
                  <p className="text-sm text-muted-foreground">
                    {app.opportunityTitle}
                    {app.provider ? ` · ${app.provider}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {app.submittedAt ? `Submitted ${new Date(app.submittedAt).toLocaleDateString()}` : "Not yet submitted"}
                    {app.deadline ? ` · Deadline ${new Date(app.deadline).toLocaleDateString()}` : ""}
                    {app.awardAmount ? ` · Award ${Number(app.awardAmount).toLocaleString()}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[app.status] ?? ""}`}>
                  {app.status}
                </span>
              </div>

              {app.formData && Object.keys(app.formData).length > 0 ? (
                <ApplicationAnswers data={app.formData} />
              ) : (
                app.notes && <p className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">{app.notes}</p>
              )}

              {app.documents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {app.documents.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => openDocument(d.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="capitalize">{d.type.replace(/_/g, " ")}</span>
                      {d.filename && <span className="max-w-[140px] truncate text-muted-foreground">· {d.filename}</span>}
                      <Badge variant="outline" className="ml-1 text-[10px] capitalize">
                        {d.verification}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {app.partnerRun ? (
                <p className="text-xs text-muted-foreground">
                  Reviewed by the Impact Partner who runs this opportunity.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || app.status === "shortlisted"}
                    onClick={() => review(app, "shortlisted")}
                  >
                    {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                    Shortlist
                  </Button>
                  <Button size="sm" disabled={busy || app.status === "awarded"} onClick={() => review(app, "awarded")}>
                    <Award className="mr-1.5 h-4 w-4" />
                    Award
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={busy || app.status === "rejected"}
                    onClick={() => review(app, "rejected")}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


// ── Full application answers ────────────────────────────────────────────────
// Renders the seven-section form a learner submits (main app,
// lib/applications/form.ts). Collapsed by default so the review list stays
// scannable; the personal statement is shown in full when opened.

const LABELS: Record<string, string> = {
  high_school: "High school student",
  undergraduate: "Undergraduate student",
  graduate: "Graduate student",
  below_5k: "Below $5,000",
  "5k_10k": "$5,000 – $10,000",
  "10k_20k": "$10,000 – $20,000",
  above_20k: "Above $20,000",
  yes: "Yes",
  no: "No",
  male: "Male",
  female: "Female",
}
const show = (v: unknown) => {
  if (v === true) return "Yes"
  if (v === false) return "No"
  const s = String(v ?? "").trim()
  return s ? LABELS[s] ?? s : "—"
}

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid grid-cols-[minmax(0,40%)_1fr] gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap break-words">{show(value)}</span>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="divide-y">{children}</div>
    </div>
  )
}

function ApplicationAnswers({ data }: { data: Record<string, any> }) {
  const p = data.personal ?? {}
  const a = data.academic ?? {}
  const f = data.financial ?? {}
  const act = data.activities ?? {}
  const r1 = data.references?.ref1 ?? {}
  const r2 = data.references?.ref2 ?? {}
  const hasRef2 = [r2.name, r2.relationship, r2.email].some((v) => String(v ?? "").trim())

  return (
    <details className="rounded-md border bg-muted/20 p-3 [&_summary]:cursor-pointer">
      <summary className="text-sm font-medium">View full application</summary>
      <div className="mt-3 space-y-4">
        <Block title="1 · Personal information">
          <Row label="Full name" value={p.fullName} />
          <Row label="Date of birth" value={p.dateOfBirth} />
          <Row label="Gender" value={p.gender} />
          <Row label="Nationality" value={p.nationality} />
          <Row label="Email" value={p.email} />
          <Row label="Phone" value={p.phone} />
          <Row label="Home address" value={p.address} />
          <Row label="Country of residence" value={p.countryOfResidence} />
        </Block>
        <Block title="2 · Academic information">
          <Row label="Education level" value={a.educationLevel} />
          <Row label="Institution" value={a.institution} />
          <Row label="Country of institution" value={a.institutionCountry} />
          <Row label="Field of study" value={a.fieldOfStudy} />
          <Row label="GPA / performance" value={a.gpa} />
          <Row label="Expected graduation" value={a.graduationYear} />
        </Block>
        <Block title="3 · Personal statement">
          <p className="whitespace-pre-wrap py-1 text-sm">{show(data.statement?.text)}</p>
        </Block>
        <Block title="4 · Financial information">
          <Row label="Need-based applicant" value={f.needBased} />
          {f.needBased && (
            <>
              <Row label="Family income (annual)" value={f.incomeBracket} />
              <Row label="Dependents in household" value={f.dependents} />
              <Row label="Other scholarships / aid" value={f.hasOtherAid} />
              {f.hasOtherAid === "yes" && <Row label="Current aid & amounts" value={f.otherAid} />}
            </>
          )}
        </Block>
        <Block title="5 · Activities & achievements">
          <Row label="Academic / leadership awards" value={act.hasAwards} />
          {act.hasAwards === "yes" && <Row label="Awards" value={act.awards} />}
          <Row label="Volunteering / social impact" value={act.hasVolunteering} />
          {act.hasVolunteering === "yes" && <Row label="Details" value={act.volunteering} />}
          <Row label="Extracurriculars" value={act.extracurriculars} />
        </Block>
        <Block title="6 · References">
          <Row label="Reference 1" value={[r1.name, r1.relationship, r1.email].filter(Boolean).join(" · ")} />
          {hasRef2 && <Row label="Reference 2" value={[r2.name, r2.relationship, r2.email].filter(Boolean).join(" · ")} />}
        </Block>
        <Block title="7 · Declarations">
          <Row label="Confirmed information is accurate" value={data.review?.confirmAccurate} />
          <Row label="Agreed to terms & conditions" value={data.review?.agreeTerms} />
        </Block>
      </div>
    </details>
  )
}
