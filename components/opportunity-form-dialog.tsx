"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createOpportunity, updateOpportunity } from "@/app/admin/(protected)/opportunities/actions"
import { Loader2 } from "lucide-react"

interface OpportunityFormDialogProps {
  children: React.ReactNode
  opportunity?: any
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/**
 * Fields that map to hard eligibility filters — countries, age, syllabus, min
 * exam readiness, education level, gender — accept comma-separated lists and
 * are stored as arrays. Left blank means "no restriction" in match_opportunities(),
 * NOT "excludes everyone", which is why every hint below says so explicitly.
 */
export function OpportunityFormDialog({ children, opportunity }: OpportunityFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState(opportunity?.title ?? "")
  const [slug, setSlug] = useState(opportunity?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(!!opportunity)
  const [isRolling, setIsRolling] = useState(opportunity?.is_rolling ?? false)
  const [requiresEssay, setRequiresEssay] = useState(opportunity?.requires_essay ?? false)
  const [requiresRec, setRequiresRec] = useState(opportunity?.requires_recommendation ?? false)
  const router = useRouter()

  const isEdit = !!opportunity

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError(null)

    formData.set("is_rolling", String(isRolling))
    formData.set("requires_essay", String(requiresEssay))
    formData.set("requires_recommendation", String(requiresRec))

    const result = isEdit ? await updateOpportunity(opportunity.id, formData) : await createOpportunity(formData)

    if (result.success) {
      setOpen(false)
      router.refresh()
    } else {
      setError(result.error ?? "Something went wrong")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Opportunity" : "Add Opportunity"}</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="WAEC STEM Excellence Grant"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugTouched(true)
                }}
                placeholder="waec-stem-excellence"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input id="provider" name="provider" defaultValue={opportunity?.provider ?? ""} placeholder="Sample Foundation" />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select name="opportunity_type" defaultValue={opportunity?.opportunity_type ?? "scholarship"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scholarship">Scholarship</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={opportunity?.status ?? "active"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={opportunity?.description ?? ""}
                placeholder="What this opportunity supports, and who it's for."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="url">Application URL</Label>
              <Input id="url" name="url" type="url" defaultValue={opportunity?.url ?? ""} placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="award_amount">Award amount</Label>
              <Input
                id="award_amount"
                name="award_amount"
                type="number"
                step="0.01"
                defaultValue={opportunity?.award_amount ?? ""}
                placeholder="2000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="award_currency">Currency</Label>
              <Input id="award_currency" name="award_currency" defaultValue={opportunity?.award_currency ?? "USD"} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="covers">Covers (comma-separated)</Label>
              <Input
                id="covers"
                name="covers"
                defaultValue={opportunity?.covers?.join(", ") ?? ""}
                placeholder="tuition, living, books, travel"
              />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-medium">Eligibility filters</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Leave any of these blank to mean <strong>no restriction</strong> — e.g. blank countries means
              open to every country, not closed to everyone.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="countries">Countries (ISO codes, comma-separated)</Label>
                <Input id="countries" name="countries" defaultValue={opportunity?.countries?.join(", ") ?? ""} placeholder="NG, GH, SL" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="syllabi">Syllabi (comma-separated)</Label>
                <Input id="syllabi" name="syllabi" defaultValue={opportunity?.syllabi?.join(", ") ?? ""} placeholder="WAEC, JAMB" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_age">Min age</Label>
                <Input id="min_age" name="min_age" type="number" defaultValue={opportunity?.min_age ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_age">Max age</Label>
                <Input id="max_age" name="max_age" type="number" defaultValue={opportunity?.max_age ?? ""} />
              </div>

              <div className="space-y-2">
                <Label>Education level</Label>
                <Select name="education_level" defaultValue={opportunity?.education_level ?? "__any__"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="postgraduate">Postgraduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select name="gender" defaultValue={opportunity?.gender ?? "__any__"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjects">Required subjects (comma-separated)</Label>
                <Input id="subjects" name="subjects" defaultValue={opportunity?.subjects?.join(", ") ?? ""} placeholder="Mathematics, Physics" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_exam_readiness">Min Exam Readiness™ (0-100)</Label>
                <Input
                  id="min_exam_readiness"
                  name="min_exam_readiness"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={opportunity?.min_exam_readiness ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="opens_at">Opens</Label>
              <Input id="opens_at" name="opens_at" type="date" defaultValue={opportunity?.opens_at ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" name="deadline" type="date" defaultValue={opportunity?.deadline ?? ""} disabled={isRolling} />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch id="is_rolling" checked={isRolling} onCheckedChange={setIsRolling} />
              <Label htmlFor="is_rolling">Rolling deadline</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="requires_essay" checked={requiresEssay} onCheckedChange={setRequiresEssay} />
              <Label htmlFor="requires_essay">Requires essay</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="requires_recommendation" checked={requiresRec} onCheckedChange={setRequiresRec} />
              <Label htmlFor="requires_recommendation">Requires recommendation</Label>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create opportunity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
