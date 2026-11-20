"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPartner, updatePartner, uploadPartnerLogo } from "@/app/admin/(protected)/partnerships/actions"
import { useRouter } from "next/navigation"
import { Loader2, X, ImageIcon } from "lucide-react"

interface PartnershipFormDialogProps {
  children: React.ReactNode
  partner?: any
}

const PARTNER_TYPES = ["community", "creator", "platform"]

export function PartnershipFormDialog({ children, partner }: PartnershipFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState(partner?.logo_url || "")
  const [logoPreview, setLogoPreview] = useState(partner?.logo_url || "")
  const [partnerType, setPartnerType] = useState(partner?.type || "")
  const [featured, setFeatured] = useState(partner?.featured || false)
  const router = useRouter()

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setLogoUrl(partner?.logo_url || "")
      setLogoPreview(partner?.logo_url || "")
      setPartnerType(partner?.type || "")
      setFeatured(partner?.featured || false)
    }
    setOpen(newOpen)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)

    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadPartnerLogo(formData)

      if (result.success && result.url) {
        setLogoUrl(result.url)
      } else {
        alert(result.error || "Failed to upload logo")
        setLogoPreview(partner?.logo_url || "")
      }
    } catch (error) {
      console.error("Error uploading logo:", error)
      alert("Failed to upload logo")
      setLogoPreview(partner?.logo_url || "")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    setLogoUrl("")
    setLogoPreview("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!partnerType) {
      alert("Please select a partner type")
      return
    }

    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set("type", partnerType)
    formData.set("logo_url", logoUrl)
    formData.set("featured", featured.toString())

    try {
      const result = partner ? await updatePartner(partner.id, formData) : await createPartner(formData)

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{partner ? "Edit Partner" : "Add New Partner"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Partner Name *</Label>
              <Input id="name" name="name" defaultValue={partner?.name} required placeholder="Company name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={partnerType} onValueChange={setPartnerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_label">Link Label</Label>
              <Input
                id="link_label"
                name="link_label"
                defaultValue={partner?.link_label}
                placeholder="e.g., Visit Website"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={partner?.description}
                placeholder="Brief description of the partnership"
                rows={4}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="link_url">Link URL</Label>
              <Input
                id="link_url"
                name="link_url"
                type="url"
                defaultValue={partner?.link_url}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={partner?.tags?.join(", ")}
                placeholder="education, tech, partner"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="logo">Logo *</Label>
              {logoPreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border-2 border-dashed border-primary/20 bg-card flex items-center justify-center">
                  <img
                    src={logoPreview || "/placeholder.svg"}
                    alt="Logo preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <Label
                    htmlFor="logo"
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-primary/20 rounded-lg cursor-pointer bg-card hover:bg-accent/50 transition-colors"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    ) : (
                      <>
                        <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload logo</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP or GIF (max 5MB)</p>
                      </>
                    )}
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured" className="flex items-center gap-2">
                <Switch id="featured" checked={featured} onCheckedChange={setFeatured} />
                <span>Featured Partner</span>
              </Label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingLogo || !partnerType}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {partner ? "Update Partner" : "Add Partner"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
