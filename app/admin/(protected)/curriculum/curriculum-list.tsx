"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { DeleteSyllabusButton } from "./delete-syllabus-button"

export interface SyllabusRow {
  syllabus: string
  subject: string
  topics: number
  concepts: number
}

/**
 * Filtering only affects what's SHOWN in this list, deliberately never the
 * stat cards above it — those describe the whole curriculum regardless of
 * what someone happens to be searching for right now, matching how a
 * filter is expected to behave (narrow the view, not the totals).
 */
export function CurriculumList({ syllabi }: { syllabi: SyllabusRow[] }) {
  const [query, setQuery] = useState("")
  const [programFilter, setProgramFilter] = useState<string>("all")

  const programs = useMemo(() => [...new Set(syllabi.map((s) => s.syllabus))].sort(), [syllabi])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return syllabi.filter((s) => {
      if (programFilter !== "all" && s.syllabus !== programFilter) return false
      if (!q) return true
      return s.syllabus.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q)
    })
  }, [syllabi, query, programFilter])

  if (syllabi.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Loaded syllabi</h2>
        <div className="flex flex-1 items-center gap-2 sm:max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search syllabus or subject…"
              className="pl-8"
            />
          </div>
          {programs.length > 1 && (
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-40 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No syllabus matches that search.</p>
      ) : (
        filtered.map((s) => (
          <Card key={`${s.syllabus}-${s.subject}`}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {s.syllabus} — {s.subject}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.topics} topics · {s.concepts} concepts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{s.syllabus}</Badge>
                <DeleteSyllabusButton syllabus={s.syllabus} subject={s.subject} />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
