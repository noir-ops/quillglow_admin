"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

async function ensureBucketExists(supabase: any) {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((bucket: any) => bucket.name === "blog-images")

    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket("blog-images", {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
      })

      if (createError) {
        console.error("Error creating bucket:", createError)
        throw createError
      }

      console.log("[v0] Created blog-images bucket successfully")
    }

    return true
  } catch (error) {
    console.error("[v0] Error ensuring bucket exists:", error)
    return false
  }
}

export async function uploadBlogImage(formData: FormData) {
  try {
    const supabase = createAdminClient()
    const file = formData.get("file") as File

    if (!file) {
      return { success: false, error: "No file provided" }
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(file.type)) {
      return { success: false, error: "Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF)" }
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: "File size too large. Maximum size is 5MB" }
    }

    await ensureBucketExists(supabase)

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `blog-covers/${fileName}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from("blog-images").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("[v0] Upload error:", error)
      throw error
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("blog-images").getPublicUrl(filePath)

    console.log("[v0] Image uploaded successfully:", publicUrl)
    return { success: true, url: publicUrl }
  } catch (error) {
    console.error("[v0] Error uploading image:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload image" }
  }
}

export async function createBlogPost(formData: FormData) {
  try {
    const supabase = createAdminClient()

    const title = formData.get("title") as string
    const slug = formData.get("slug") as string
    const excerpt = formData.get("excerpt") as string
    const content = formData.get("content") as string
    const cover_image = formData.get("cover_image") as string
    const author_name = formData.get("author_name") as string
    const author_avatar = formData.get("author_avatar") as string
    const category = formData.get("category") as string
    const read_time = formData.get("read_time") as string
    const published = formData.get("published") === "true"

    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        title,
        slug,
        excerpt,
        content,
        cover_image,
        author_name,
        author_avatar,
        category,
        read_time,
        published,
        views: 0,
        published_at: published ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath("/admin/blogs")
    return { success: true, data }
  } catch (error) {
    console.error("Error creating blog post:", error)
    return { success: false, error: "Failed to create blog post" }
  }
}

export async function updateBlogPost(id: string, formData: FormData) {
  try {
    const supabase = createAdminClient()

    const title = formData.get("title") as string
    const slug = formData.get("slug") as string
    const excerpt = formData.get("excerpt") as string
    const content = formData.get("content") as string
    const cover_image = formData.get("cover_image") as string
    const author_name = formData.get("author_name") as string
    const author_avatar = formData.get("author_avatar") as string
    const category = formData.get("category") as string
    const read_time = formData.get("read_time") as string
    const published = formData.get("published") === "true"

    // Get current post to check if published status changed
    const { data: currentPost } = await supabase.from("blog_posts").select("published").eq("id", id).single()

    const updateData: any = {
      title,
      slug,
      excerpt,
      content,
      cover_image,
      author_name,
      author_avatar,
      category,
      read_time,
      published,
      updated_at: new Date().toISOString(),
    }

    // If changing from unpublished to published, set published_at
    if (published && !currentPost?.published) {
      updateData.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase.from("blog_posts").update(updateData).eq("id", id).select().single()

    if (error) throw error

    revalidatePath("/admin/blogs")
    return { success: true, data }
  } catch (error) {
    console.error("Error updating blog post:", error)
    return { success: false, error: "Failed to update blog post" }
  }
}

export async function deleteBlogPost(id: string) {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase.from("blog_posts").delete().eq("id", id)

    if (error) throw error

    revalidatePath("/admin/blogs")
    return { success: true }
  } catch (error) {
    console.error("Error deleting blog post:", error)
    return { success: false, error: "Failed to delete blog post" }
  }
}

export async function togglePublishStatus(id: string, currentStatus: boolean) {
  try {
    const supabase = createAdminClient()

    const updateData: any = {
      published: !currentStatus,
      updated_at: new Date().toISOString(),
    }

    // If publishing, set published_at
    if (!currentStatus) {
      updateData.published_at = new Date().toISOString()
    }

    const { error } = await supabase.from("blog_posts").update(updateData).eq("id", id)

    if (error) throw error

    revalidatePath("/admin/blogs")
    return { success: true }
  } catch (error) {
    console.error("Error toggling publish status:", error)
    return { success: false, error: "Failed to toggle publish status" }
  }
}
