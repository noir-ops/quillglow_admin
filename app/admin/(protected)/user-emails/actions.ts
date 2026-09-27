"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export interface UserEmailData {
  id: string
  display_name: string | null
  email: string
  created_at: string
}

export interface PaginatedUsersResult {
  users: UserEmailData[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getUsersWithEmails(page = 1, limit = 25, searchQuery = ""): Promise<PaginatedUsersResult> {
  const adminClient = createAdminClient()

  try {
    // Fetch all auth users to get emails
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (authError) {
      console.error("Error fetching auth users:", authError)
      throw authError
    }

    // Create a map of user_id -> email
    const emailMap = new Map(authData.users.map((user) => [user.id, user.email || ""]))

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, display_name, created_at")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return {
        users: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      }
    }

    // Combine profiles with emails
    let users: UserEmailData[] = profiles
      .map((profile) => ({
        id: profile.id,
        display_name: profile.display_name,
        email: emailMap.get(profile.id) || "",
        created_at: profile.created_at,
      }))
      .filter((user) => user.email) // Only include users with emails

    // Apply search filter if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      users = users.filter(
        (user) => user.display_name?.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
      )
    }

    // Calculate total and pagination
    const total = users.length
    const totalPages = Math.ceil(total / limit)

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit
    const paginatedUsers = users.slice(from, to)

    return {
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages,
    }
  } catch (error) {
    console.error("Error in getUsersWithEmails:", error)
    throw error
  }
}

export async function getAllUserEmails(searchQuery = ""): Promise<string[]> {
  const adminClient = createAdminClient()

  try {
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await adminClient.from("profiles").select("id, display_name")

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return []
    }

    // Fetch all auth users to get emails
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (authError) {
      console.error("Error fetching auth users:", authError)
      throw authError
    }

    // Create a map of user_id -> email
    const emailMap = new Map(authData.users.map((user) => [user.id, user.email || ""]))

    // Get all emails
    let emails = profiles.map((profile) => emailMap.get(profile.id)).filter((email): email is string => !!email)

    // Apply search filter if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      // Filter by matching display_name or email
      const matchingProfiles = profiles.filter(
        (profile) =>
          profile.display_name?.toLowerCase().includes(query) ||
          emailMap.get(profile.id)?.toLowerCase().includes(query),
      )
      emails = matchingProfiles.map((profile) => emailMap.get(profile.id)).filter((email): email is string => !!email)
    }

    // Remove duplicates
    return Array.from(new Set(emails))
  } catch (error) {
    console.error("Error in getAllUserEmails:", error)
    throw error
  }
}
