import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BlogFormDialog } from "@/components/blog-form-dialog"
import { BlogActionsMenu } from "@/components/blog-actions-menu"
import { PlusCircle, Search, Eye, Calendar, User } from "lucide-react"

export const revalidate = 0

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string }
}) {
  const supabase = createAdminClient()

  let query = supabase.from("blog_posts").select("*").order("created_at", { ascending: false })

  // Filter by search
  if (searchParams.search) {
    query = query.or(`title.ilike.%${searchParams.search}%,excerpt.ilike.%${searchParams.search}%`)
  }

  // Filter by status
  if (searchParams.status === "published") {
    query = query.eq("published", true)
  } else if (searchParams.status === "draft") {
    query = query.eq("published", false)
  }

  const { data: blogPosts, error } = await query

  if (error) {
    console.error("Error fetching blog posts:", error)
  }

  const stats = {
    total: blogPosts?.length || 0,
    published: blogPosts?.filter((post) => post.published).length || 0,
    drafts: blogPosts?.filter((post) => !post.published).length || 0,
    totalViews: blogPosts?.reduce((sum, post) => sum + (post.views || 0), 0) || 0,
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Blog Management
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Create and manage your blog posts</p>
          </div>
          <BlogFormDialog>
            <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Post
            </Button>
          </BlogFormDialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                <p className="mt-2 text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-full bg-blue-500/20 p-3">
                <PlusCircle className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="mt-2 text-3xl font-bold">{stats.published}</p>
              </div>
              <div className="rounded-full bg-green-500/20 p-3">
                <Eye className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                <p className="mt-2 text-3xl font-bold">{stats.drafts}</p>
              </div>
              <div className="rounded-full bg-orange-500/20 p-3">
                <Calendar className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                <p className="mt-2 text-3xl font-bold">{stats.totalViews.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-purple-500/20 p-3">
                <Eye className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search blog posts..."
                className="pl-10"
                defaultValue={searchParams.search}
                name="search"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={!searchParams.status ? "default" : "outline"} size="sm" asChild>
                <a href="/admin/blogs">All</a>
              </Button>
              <Button variant={searchParams.status === "published" ? "default" : "outline"} size="sm" asChild>
                <a href="/admin/blogs?status=published">Published</a>
              </Button>
              <Button variant={searchParams.status === "draft" ? "default" : "outline"} size="sm" asChild>
                <a href="/admin/blogs?status=draft">Drafts</a>
              </Button>
            </div>
          </div>
        </Card>

        {/* Blog Posts Grid */}
        {blogPosts && blogPosts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <Card
                key={post.id}
                className="group overflow-hidden transition-all hover:shadow-xl hover:shadow-primary/10"
              >
                {/* Cover Image */}
                {post.cover_image && (
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img
                      src={post.cover_image || "/placeholder.svg"}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant={post.published ? "default" : "secondary"}>
                        {post.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <BlogActionsMenu post={post} />
                    </div>
                    {post.category && (
                      <Badge variant="outline" className="mt-2">
                        {post.category}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>{post.author_name || "Anonymous"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      <span>{post.views || 0} views</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    {post.read_time && <span>{post.read_time}</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <PlusCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No blog posts yet</h3>
              <p className="text-sm text-muted-foreground">
                Get started by creating your first blog post. Share your knowledge and insights with your audience.
              </p>
              <BlogFormDialog>
                <Button size="lg" className="mt-4">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create Your First Post
                </Button>
              </BlogFormDialog>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
