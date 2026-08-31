"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getPartners() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("partners").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching partners:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function createPartner(formData: FormData) {
  const supabase = createAdminClient()

  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const description = formData.get("description") as string
  const logo_url = formData.get("logo_url") as string
  const link_url = formData.get("link_url") as string
  const link_label = formData.get("link_label") as string
  const featured = formData.get("featured") === "true"
  const tags =
    (formData.get("tags") as string)
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || []

  if (!name || !type) {
    return { success: false, error: "Partner name and type are required" }
  }

  if (type.trim() === "") {
    return { success: false, error: "Partner type cannot be empty" }
  }

  const { error } = await supabase.from("partners").insert([
    {
      name: name.trim(),
      type: type.trim(),
      description: description || null,
      logo_url: logo_url || null,
      link_url: link_url || null,
      link_label: link_label || null,
      featured,
      tags: tags.length > 0 ? tags : null,
    },
  ])

  if (error) {
    console.error("Error creating partner:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updatePartner(id: string, formData: FormData) {
  const supabase = createAdminClient()

  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const description = formData.get("description") as string
  const logo_url = formData.get("logo_url") as string
  const link_url = formData.get("link_url") as string
  const link_label = formData.get("link_label") as string
  const featured = formData.get("featured") === "true"
  const tags =
    (formData.get("tags") as string)
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || []

  if (!name || !type) {
    return { success: false, error: "Partner name and type are required" }
  }

  if (type.trim() === "") {
    return { success: false, error: "Partner type cannot be empty" }
  }

  const { error } = await supabase
    .from("partners")
    .update({
      name: name.trim(),
      type: type.trim(),
      description: description || null,
      logo_url: logo_url || null,
      link_url: link_url || null,
      link_label: link_label || null,
      featured,
      tags: tags.length > 0 ? tags : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("Error updating partner:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deletePartner(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from("partners").delete().eq("id", id)

  if (error) {
    console.error("Error deleting partner:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function toggleFeatured(id: string, featured: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("partners")
    .update({ featured: !featured, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("Error toggling featured:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function uploadPartnerLogo(formData: FormData) {
  const supabase = createAdminClient()
  const file = formData.get("file") as File

  if (!file) {
    return { success: false, error: "No file provided" }
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "File must be an image" }
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File must be smaller than 5MB" }
  }

  try {
    // Create bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === "partners")

    if (!bucketExists) {
      await supabase.storage.createBucket("partners", {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      })
    }

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`
    const { error: uploadError } = await supabase.storage.from("partners").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    const { data } = supabase.storage.from("partners").getPublicUrl(fileName)

    return { success: true, url: data.publicUrl }
  } catch (error) {
    console.error("Error uploading logo:", error)
    return { success: false, error: "Failed to upload logo" }
  }
}
