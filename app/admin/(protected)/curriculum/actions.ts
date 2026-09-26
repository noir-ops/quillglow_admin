"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

interface ConceptDef {
  name: string
  slug: string
  difficulty?: number
  estimatedMinutes?: number
  prerequisites?: string[]
  content?: string
}
interface TopicDef {
  name: string
  slug: string
  concepts: ConceptDef[]
}
interface SyllabusFile {
  syllabus: string
  subject: string
  topics: TopicDef[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: { topics: number; concepts: number; withContent: number; prerequisites: number }
  parsed?: SyllabusFile
}

/**
 * Validate before writing anything.
 *
 * A typo'd prerequisite slug silently breaks Curriculum Agent sequencing — the
 * agent just never recommends that path and nobody notices. Failing loudly here
 * is the whole point of a separate validate step.
 *
 * Pure in-memory iteration over the parsed JSON — no database calls — so
 * this scales fine even for a very large syllabus. The import step below is
 * where a large file actually caused problems.
 */
export async function validateCurriculum(json: string): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const stats = { topics: 0, concepts: 0, withContent: 0, prerequisites: 0 }

  let parsed: SyllabusFile
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${err instanceof Error ? err.message : "parse failed"}`],
      warnings,
      stats,
    }
  }

  if (!parsed.syllabus) errors.push("Missing required field: syllabus (e.g. \"WAEC\")")
  if (!parsed.subject) errors.push("Missing required field: subject (e.g. \"Mathematics\")")
  if (!Array.isArray(parsed.topics) || parsed.topics.length === 0) {
    errors.push("Missing or empty: topics array")
    return { valid: false, errors, warnings, stats }
  }

  const allSlugs = new Set<string>()
  const dupSlugs = new Set<string>()

  for (const [ti, topic] of parsed.topics.entries()) {
    if (!topic.name) errors.push(`Topic ${ti + 1}: missing name`)
    if (!topic.slug) errors.push(`Topic ${ti + 1}: missing slug`)
    if (!Array.isArray(topic.concepts) || topic.concepts.length === 0) {
      warnings.push(`Topic "${topic.name ?? ti + 1}" has no concepts`)
      continue
    }
    stats.topics++

    for (const concept of topic.concepts) {
      if (!concept.name) errors.push(`A concept in "${topic.name}" is missing a name`)
      if (!concept.slug) {
        errors.push(`Concept "${concept.name}" is missing a slug`)
        continue
      }
      if (allSlugs.has(concept.slug)) dupSlugs.add(concept.slug)
      allSlugs.add(concept.slug)
      stats.concepts++

      if (concept.content?.trim()) stats.withContent++
      else warnings.push(`"${concept.name}" has no content — it won't be searchable by the AI`)

      if (concept.difficulty != null && (concept.difficulty < 0 || concept.difficulty > 1)) {
        errors.push(`"${concept.name}": difficulty must be between 0 and 1`)
      }
    }
  }

  for (const dup of dupSlugs) errors.push(`Duplicate slug: "${dup}" — slugs must be unique`)

  // Prerequisite references must resolve, or sequencing silently breaks.
  for (const topic of parsed.topics) {
    for (const concept of topic.concepts ?? []) {
      for (const pre of concept.prerequisites ?? []) {
        stats.prerequisites++
        if (!allSlugs.has(pre)) {
          errors.push(`"${concept.name}" requires unknown prerequisite slug: "${pre}"`)
        }
      }
    }
  }

  if (stats.withContent === 0) {
    warnings.push("No concept has content. The curriculum will exist but RAG will return nothing.")
  }

  return { valid: errors.length === 0, errors, warnings, stats, parsed }
}

export interface ImportResult {
  success: boolean
  error?: string
  conceptsWritten?: number
  prerequisitesLinked?: number
  contentQueued?: number
}

/** Splits an array into fixed-size pieces — keeps each database round trip's payload reasonable regardless of syllabus size. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

const BATCH_SIZE = 300

/**
 * Write the curriculum. Idempotent: concepts upsert on (syllabus, slug), so
 * re-importing a corrected file updates rather than duplicating.
 *
 * Rewritten from one-row-at-a-time to batched writes — this is the actual
 * fix for "large full syllabus has issues." The original version awaited a
 * separate database round trip for every single topic, then every single
 * concept, then every single prerequisite link, then every single content
 * item — a syllabus with a couple thousand concepts meant a couple
 * thousand-plus sequential round trips inside one server action. That
 * reliably exceeds a serverless function's execution time limit, and a
 * timeout partway through leaves a half-imported syllabus — which is also
 * exactly the kind of inconsistent state that made the syllabus list look
 * "not tracked well." Now: one batched upsert per topic-chunk, one per
 * concept-chunk, one RPC call for all prerequisite links, one batched
 * upsert per content-chunk — a few dozen round trips at most, regardless
 * of whether the syllabus has 50 concepts or 5,000.
 */
export async function importCurriculum(json: string): Promise<ImportResult> {
  const validation = await validateCurriculum(json)
  if (!validation.valid || !validation.parsed) {
    return { success: false, error: validation.errors[0] ?? "Validation failed" }
  }

  const { syllabus, subject, topics } = validation.parsed
  const supabase = createAdminClient()

  try {
    const subjectSlug = `${syllabus}-${subject}`.toLowerCase().replace(/\s+/g, "-")

    const { data: subjectRow, error: subjectErr } = await supabase
      .from("learning_concepts")
      .upsert(
        { syllabus, subject, name: subject, slug: subjectSlug, depth: 0, difficulty: 0.5 },
        { onConflict: "syllabus,slug" },
      )
      .select("id")
      .single()
    if (subjectErr) throw subjectErr

    // ── Pass 1: all topics, batched ──────────────────────────────────────
    const topicRows = topics.map((t) => ({
      parent_id: subjectRow.id,
      syllabus,
      subject,
      name: t.name,
      slug: t.slug,
      depth: 1,
      difficulty: 0.5,
    }))

    const topicSlugToId = new Map<string, string>()
    for (const batch of chunk(topicRows, BATCH_SIZE)) {
      const { data, error } = await supabase
        .from("learning_concepts")
        .upsert(batch, { onConflict: "syllabus,slug" })
        .select("id, slug")
      if (error) throw error
      // Map built from the RETURNED rows' own slug field, not positional
      // index — upsert doesn't guarantee the response preserves input order.
      for (const row of data ?? []) topicSlugToId.set(row.slug, row.id)
    }

    // ── Pass 2: all concepts across every topic, batched ─────────────────
    const conceptInputs = topics.flatMap((t) =>
      (t.concepts ?? []).map((c) => ({ ...c, _topicSlug: t.slug, _topicName: t.name })),
    )
    const conceptRows = conceptInputs.map((c) => ({
      parent_id: topicSlugToId.get(c._topicSlug),
      syllabus,
      subject,
      name: c.name,
      slug: c.slug,
      depth: 2,
      difficulty: c.difficulty ?? 0.5,
      estimated_minutes: c.estimatedMinutes ?? null,
    }))

    const conceptSlugToId = new Map<string, string>()
    for (const batch of chunk(conceptRows, BATCH_SIZE)) {
      const { data, error } = await supabase
        .from("learning_concepts")
        .upsert(batch, { onConflict: "syllabus,slug" })
        .select("id, slug")
      if (error) throw error
      for (const row of data ?? []) conceptSlugToId.set(row.slug, row.id)
    }

    // ── Pass 3: prerequisite links, one RPC call for everything ──────────
    // A plain batched .upsert() can't safely set only `prerequisites` per
    // row — Postgres validates the INSERT branch's NOT NULL columns even
    // though ON CONFLICT DO UPDATE never takes it, so a payload with just
    // {id, prerequisites} would fail. bulk_update_concept_prerequisites
    // (056) does a single UPDATE ... FROM jsonb_array_elements(...)
    // instead, which updates exactly the one column, for every row, in
    // one round trip.
    const prereqUpdates = conceptInputs
      .map((c) => ({
        id: conceptSlugToId.get(c.slug),
        prerequisites: (c.prerequisites ?? []).map((p) => conceptSlugToId.get(p)).filter(Boolean),
      }))
      .filter((u) => u.id && u.prerequisites.length > 0)

    let linked = 0
    if (prereqUpdates.length > 0) {
      const { error } = await supabase.rpc("bulk_update_concept_prerequisites", { updates: prereqUpdates })
      if (error) throw error
      linked = prereqUpdates.length
    }

    // ── Pass 4: content queued for embedding, batched ─────────────────────
    const contentRows = conceptInputs
      .filter((c) => c.content?.trim())
      .map((c) => ({
        namespace: `syllabus_${syllabus.toLowerCase()}`,
        owner_id: null,
        title: `${subject} — ${c.name}`,
        source_type: "syllabus",
        concept_id: conceptSlugToId.get(c.slug),
        status: "pending",
        metadata: { syllabus, subject, topic: c._topicName, concept: c.name, content: c.content },
      }))

    let queued = 0
    for (const batch of chunk(contentRows, BATCH_SIZE)) {
      const { error, count } = await supabase.from("knowledge_sources").insert(batch, { count: "exact" })
      if (error) throw error
      queued += count ?? batch.length
    }

    revalidatePath("/admin/curriculum")
    return {
      success: true,
      conceptsWritten: conceptSlugToId.size,
      prerequisitesLinked: linked,
      contentQueued: queued,
    }
  } catch (err) {
    console.error("Curriculum import failed:", err)
    return { success: false, error: err instanceof Error ? err.message : "Import failed" }
  }
}

/**
 * Delete a syllabus — also purges indexed RAG content, not just
 * learning_concepts. knowledge_sources.concept_id is "on delete set null,"
 * so deleting concepts first would silently orphan that content instead
 * of removing it, leaving a "deleted" syllabus still searchable and still
 * surfacing in AI answers.
 */
export async function deleteSyllabus(syllabus: string, subject: string) {
  try {
    const supabase = createAdminClient()

    const { error: sourcesErr } = await supabase
      .from("knowledge_sources")
      .delete()
      .eq("namespace", `syllabus_${syllabus.toLowerCase()}`)
      .contains("metadata", { subject })
    if (sourcesErr) throw sourcesErr

    const { error } = await supabase
      .from("learning_concepts")
      .delete()
      .eq("syllabus", syllabus)
      .eq("subject", subject)
    if (error) throw error

    revalidatePath("/admin/curriculum")
    return { success: true }
  } catch (err) {
    console.error("Delete syllabus failed:", err)
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete" }
  }
}
