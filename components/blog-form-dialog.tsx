"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { createBlogPost, updateBlogPost, uploadBlogImage } from "@/app/admin/(protected)/blogs/actions"
import { useRouter } from "next/navigation"
import { Loader2, X, ImageIcon } from "lucide-react"

interface BlogFormDialogProps {
  children: React.ReactNode
  post?: any
}

export function BlogFormDialog({ children, post }: BlogFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image || "")
  const [imagePreview, setImagePreview] = useState(post?.cover_image || "")
  const router = useRouter()

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Supabase
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadBlogImage(formData)

      if (result.success && result.url) {
        setCoverImageUrl(result.url)
      } else {
        alert(result.error || "Failed to upload image")
        setImagePreview("")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      alert("Failed to upload image")
      setImagePreview("")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setCoverImageUrl("")
    setImagePreview("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set("cover_image", coverImageUrl)

    try {
      const result = post ? await updateBlogPost(post.id, formData) : await createBlogPost(formData)

      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        alert(result.error || "An error occurred")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{post ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" defaultValue={post?.title} required placeholder="Enter blog title" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={post?.slug}
                required
                placeholder="blog-post-url-slug"
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">Use lowercase letters, numbers, and hyphens only</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="excerpt">Excerpt *</Label>
              <Textarea
                id="excerpt"
                name="excerpt"
                defaultValue={post?.excerpt}
                required
                placeholder="Brief description of the blog post"
                rows={3}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                name="content"
                defaultValue={post?.content}
                required
                placeholder="Write your blog content here..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cover_image">Cover Image *</Label>
              {imagePreview ? (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-dashed border-primary/20 bg-card">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    id="cover_image"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <Label
                    htmlFor="cover_image"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-primary/20 rounded-lg cursor-pointer bg-card hover:bg-accent/50 transition-colors"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    ) : (
                      <>
                        <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload cover image</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP or GIF (max 5MB)</p>
                      </>
                    )}
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={post?.category} placeholder="e.g., Technology" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author_name">Author Name</Label>
              <Input id="author_name" name="author_name" defaultValue={post?.author_name} placeholder="John Doe" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author_avatar">Author Avatar URL</Label>
              <Input
                id="author_avatar"
                name="author_avatar"
                type="url"
                defaultValue={post?.author_avatar}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="read_time">Read Time</Label>
              <Input id="read_time" name="read_time" defaultValue={post?.read_time} placeholder="5 min read" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="published" className="flex items-center gap-2">
                <Switch id="published" name="published" defaultChecked={post?.published} value="true" />
                <span>Publish immediately</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                {post?.published ? "Post is currently published" : "Post will be saved as draft"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingImage}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {post ? "Update Post" : "Create Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
