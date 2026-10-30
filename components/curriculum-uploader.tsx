"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, FileJson, Loader2, Upload } from "lucide-react"
import { importCurriculum, validateCurriculum, type ValidationResult } from "@/app/admin/(protected)/curriculum/actions"

const EXAMPLE = `{
  "syllabus": "WAEC",
  "subject": "Mathematics",
  "topics": [
    {
      "name": "Algebraic Processes",
      "slug": "algebraic-processes",
      "concepts": [
        {
          "name": "Expansion of brackets",
          "slug": "expansion-brackets",
          "difficulty": 0.35,
          "estimatedMinutes": 35,
          "prerequisites": [],
          "content": "Expanding brackets means removing them by multiplying each term inside by the term outside. Common error: forgetting to apply a negative sign to every term."
        },
        {
          "name": "Factorising quadratics",
          "slug": "factorising-quadratics",
          "difficulty": 0.55,
          "estimatedMinutes": 50,
          "prerequisites": ["expansion-brackets"],
          "content": "Factorising reverses expansion. For x squared plus bx plus c, find two numbers that multiply to c and add to b."
        }
      ]
    }
  ]
}`

export function CurriculumUploader() {
  const [json, setJson] = useState("")
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setJson(text)
    setValidation(null)
    setResult(null)
    setError(null)
  }

  const handleValidate = async () => {
    setValidating(true)
    setError(null)
    setResult(null)
    setValidation(await validateCurriculum(json))
    setValidating(false)
  }

  const handleImport = async () => {
    setImporting(true)
    setError(null)
    const res = await importCurriculum(json)
    if (res.success) {
      setResult(
        `Imported ${res.conceptsWritten} concepts, linked ${res.prerequisitesLinked} prerequisite sets, queued ${res.contentQueued} items for AI indexing.`,
      )
      setValidation(null)
      router.refresh()
    } else {
      setError(res.error ?? "Import failed")
    }
    setImporting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Upload curriculum
        </CardTitle>
        <CardDescription>
          Paste or upload a syllabus JSON file. Validate first — a mistyped prerequisite silently
          breaks how the AI sequences topics.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFile}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
          />
          <Button variant="ghost" size="sm" onClick={() => setJson(EXAMPLE)}>
            Load example
          </Button>
        </div>

        <Textarea
          value={json}
          onChange={(e) => {
            setJson(e.target.value)
            setValidation(null)
          }}
          rows={16}
          placeholder="Paste syllabus JSON here…"
          className="font-mono text-xs"
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleValidate} disabled={!json.trim() || validating}>
            {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Validate
          </Button>
          <Button onClick={handleImport} disabled={!validation?.valid || importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import curriculum
          </Button>
        </div>

        {validation && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              {validation.valid ? (
                <Badge className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Valid
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> {validation.errors.length} error
                  {validation.errors.length === 1 ? "" : "s"}
                </Badge>
              )}
              <Badge variant="outline">{validation.stats.topics} topics</Badge>
              <Badge variant="outline">{validation.stats.concepts} concepts</Badge>
              <Badge variant="outline">{validation.stats.withContent} with content</Badge>
              <Badge variant="outline">{validation.stats.prerequisites} prerequisites</Badge>
            </div>

            {validation.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-destructive">Errors — must fix before import</p>
                <ul className="mt-1 space-y-0.5 text-xs text-destructive">
                  {validation.errors.slice(0, 15).map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                  {validation.errors.length > 15 && <li>…and {validation.errors.length - 15} more</li>}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-600">Warnings — import will still work</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {validation.warnings.slice(0, 8).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                  {validation.warnings.length > 8 && <li>…and {validation.warnings.length - 8} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {result && (
          <p className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {result}
          </p>
        )}
        {error && (
          <p className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
