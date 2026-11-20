"use server"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Everything the "User Details" dialog shows, loaded with the admin client.
 *
 * The dialog used to query from the browser under the ADMIN's own login.
 * Row-level security only lets a user read their own rows, so every
 * learner's tasks, notes, flashcards, study plans, focus sessions and
 * achievements showed as 0. This server action is admin-only (the
 * middleware requires an admin for every /admin request, server actions
 * included).
 */
export async function getUserDetails(userId: string) {
  if (!userId || typeof userId !== "string") return null
  const db = createAdminClient()
  const head = (table: string) => db.from(table).select("*", { count: "exact", head: true })

  const [
    { data: profile },
    { data: subscription },
    { data: plan },
    authUser,
    { count: totalTasks },
    { count: completedTasks },
    { count: totalNotes },
    { count: totalFlashcards },
    { count: totalStudyPlans },
    { count: pomodoroSessions },
    { count: achievements },
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    db.rpc("user_plan", { p_user_id: userId }),
    db.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } })),
    head("tasks").eq("user_id", userId),
    head("tasks").eq("user_id", userId).eq("completed", true),
    head("notes").eq("user_id", userId),
    db.from("flashcards").select("flashcard_decks!inner(user_id)", { count: "exact", head: true }).eq("flashcard_decks.user_id", userId),
    head("study_plans").eq("user_id", userId),
    head("pomodoro_sessions").eq("user_id", userId).eq("completed", true),
    head("user_achievements").eq("user_id", userId),
  ])

  const u = (authUser as any)?.data?.user ?? null
  return {
    profile: profile ? { ...profile, email: profile.email ?? u?.email ?? null } : null,
    subscription: subscription ? { ...subscription, effective_plan: plan ?? null } : null,
    lastSignInAt: u?.last_sign_in_at ?? null,
    stats: {
      totalTasks: totalTasks || 0,
      completedTasks: completedTasks || 0,
      totalNotes: totalNotes || 0,
      totalFlashcards: totalFlashcards || 0,
      totalStudyPlans: totalStudyPlans || 0,
      pomodoroSessions: pomodoroSessions || 0,
      achievements: achievements || 0,
    },
  }
}

/**
 * Delete a learner's account. Previously done from the browser — which row
 * security blocks, so it always failed — and only targeted the profile row,
 * which would have left the login itself in place. Deleting the auth user
 * removes the account; tables referencing it cascade.
 */
export async function deleteUserAccount(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!userId || typeof userId !== "string") return { ok: false, error: "Missing user id" }
  const db = createAdminClient()
  const { data: before } = await db.from("profiles").select("id, display_name").eq("id", userId).maybeSingle()
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) return { ok: false, error: error.message }
  // Some deployments have profiles without an ON DELETE CASCADE to auth.users.
  await db.from("profiles").delete().eq("id", userId)
  const { error: auditError } = await db.from("audit_log").insert({
    actor_role: "admin",
    action: "user.delete",
    resource_type: "user",
    resource_id: userId,
    before_state: before ?? null,
  })
  if (auditError) console.error("[admin/users] audit log failed:", auditError.message)
  return { ok: true }
}
