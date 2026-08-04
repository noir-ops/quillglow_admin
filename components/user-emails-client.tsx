"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Search, X, CheckCircle2, Mail, Users, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  type PaginatedUsersResult,
  getAllUserEmails,
  getUsersWithEmails,
} from "@/app/admin/(protected)/user-emails/actions"
import { format } from "date-fns"

interface UserEmailsClientProps {
  initialData: PaginatedUsersResult
}

export function UserEmailsClient({ initialData }: UserEmailsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [users, setUsers] = useState(initialData.users)
  const [total, setTotal] = useState(initialData.total)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [page, setPage] = useState(initialData.page)
  const [limit, setLimit] = useState(initialData.limit)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllPages, setSelectAllPages] = useState(false)
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const result = await getUsersWithEmails(page, limit, searchQuery)
        setUsers(result.users)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      } catch (error) {
        console.error("Error fetching users:", error)
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [page, limit, searchQuery])

  const updateURL = (newPage: number, newLimit: number, newQuery: string) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set("page", newPage.toString())
    if (newLimit !== 25) params.set("limit", newLimit.toString())
    if (newQuery) params.set("q", newQuery)

    const url = params.toString() ? `/admin/user-emails?${params.toString()}` : "/admin/user-emails"
    router.push(url, { scroll: false })
  }

  const handleSearch = () => {
    setPage(1)
    setSelectedIds(new Set())
    setSelectAllPages(false)
    updateURL(1, limit, searchQuery)
  }

  const handleLimitChange = (newLimit: string) => {
    const limitNum = Number.parseInt(newLimit)
    setLimit(limitNum)
    setPage(1)
    setSelectedIds(new Set())
    setSelectAllPages(false)
    updateURL(1, limitNum, searchQuery)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setSelectedIds(new Set())
    setSelectAllPages(false)
    updateURL(newPage, limit, searchQuery)
  }

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedIds(newSelected)
    setSelectAllPages(false)
  }

  const toggleAllCurrentPage = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
      setSelectAllPages(false)
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)))
      setSelectAllPages(false)
    }
  }

  const handleSelectAllPages = async () => {
    setIsLoadingAll(true)
    try {
      const allEmails = await getAllUserEmails(searchQuery)
      setSelectAllPages(true)
      toast({
        title: "All users selected",
        description: `Selected ${allEmails.length} users across all pages`,
      })
    } catch (error) {
      console.error("Error selecting all:", error)
      toast({
        title: "Error",
        description: "Failed to select all users",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAll(false)
    }
  }

  const copySelectedEmails = async () => {
    try {
      let emailsToCopy: string[] = []

      if (selectAllPages) {
        emailsToCopy = await getAllUserEmails(searchQuery)
      } else {
        emailsToCopy = users.filter((u) => selectedIds.has(u.id)).map((u) => u.email)
      }

      const uniqueEmails = Array.from(new Set(emailsToCopy))
      const emailString = uniqueEmails.join("\n")

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(emailString)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = emailString
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }

      toast({
        title: "Copied to clipboard",
        description: `${uniqueEmails.length} email${uniqueEmails.length !== 1 ? "s" : ""} copied`,
      })
    } catch (error) {
      console.error("Error copying emails:", error)
      toast({
        title: "Error",
        description: "Failed to copy emails to clipboard",
        variant: "destructive",
      })
    }
  }

  const copySingleEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      toast({
        title: "Email copied",
        description: email,
      })
    } catch (error) {
      console.error("Error copying email:", error)
      toast({
        title: "Error",
        description: "Failed to copy email",
        variant: "destructive",
      })
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectAllPages(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Registered users with emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectAllPages ? total : selectedIds.size}</div>
            <p className="text-xs text-muted-foreground">
              {selectAllPages ? "All users selected" : "Users selected on this page"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Page</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {page} / {totalPages}
            </div>
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedIds.size === users.length && users.length > 0}
                    onCheckedChange={toggleAllCurrentPage}
                    disabled={isLoading}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select all on page
                  </label>
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAllPages} disabled={isLoadingAll || isLoading}>
                  {isLoadingAll ? "Loading..." : "Select ALL results"}
                </Button>
                <Badge variant="secondary">Selected: {selectAllPages ? total : selectedIds.size}</Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copySelectedEmails}
                  disabled={selectedIds.size === 0 && !selectAllPages}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Emails
                </Button>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={selectedIds.size === 0 && !selectAllPages}
                  className="gap-2 bg-transparent"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show per page:</span>
              <Select value={limit.toString()} onValueChange={handleLimitChange} disabled={isLoading}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === users.length && users.length > 0}
                      onCheckedChange={toggleAllCurrentPage}
                      disabled={isLoading}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {isLoading ? "Loading..." : "No users found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleUser(user.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(user.id)} onCheckedChange={() => toggleUser(user.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{user.display_name || "Unknown User"}</TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copySingleEmail(user.email)
                          }}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {user.email}
                          <Copy className="h-3 w-3" />
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), "MMM dd, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {users.length} of {total} users
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handlePageChange(page - 1)} disabled={page === 1 || isLoading}>
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
