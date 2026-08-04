import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search } from "lucide-react"
import { UserActionsMenu } from "@/components/user-actions-menu"

export const revalidate = 0

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const params = await searchParams
  const supabase = createAdminClient()

  // Fetch users with optional search
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false })

  if (params.search) {
    query = query.or(`display_name.ilike.%${params.search}%,bio.ilike.%${params.search}%`)
  }

  const { data: users, error } = await query

  if (error) {
    console.error("Error fetching users:", error)
  }

  const totalUsers = users?.length || 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage and monitor all platform users</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {totalUsers} Total Users
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <form action="/admin/users" method="get">
              <Input
                name="search"
                placeholder="Search users by name or bio..."
                className="pl-9"
                defaultValue={params.search}
              />
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>XP</TableHead>
                <TableHead>Streak</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.display_name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.display_name || "Anonymous User"}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">{user.bio || "No bio"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Level {user.level || 1}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{user.xp || 0} XP</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-orange-500">🔥</span>
                        <span>{user.streak_days || 0} days</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActionsMenu userId={user.id} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {params.search ? "No users found matching your search" : "No users yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
