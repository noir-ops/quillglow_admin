"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function addInstitution(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const country = String(formData.get("country") ?? "").trim() || null
  const contactName = String(formData.get("contactName") ?? "").trim() || null
  const contactEmail = String(formData.get("contactEmail") ?? "").trim()

  if (!name || !contactEmail) {
    throw new Error("Name and contact email are required")
  }

  const admin = createAdminClient()
  const { error } = await admin.from("institutions").insert({
    name,
    country,
    contact_name: contactName,
    contact_email: contactEmail,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/admin/institutions")
}

export async function toggleInstitutionActive(institutionId: string, isActive: boolean) {
  const admin = createAdminClient()
  const { error } = await admin.from("institutions").update({ is_active: isActive }).eq("id", institutionId)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/institutions")
}
