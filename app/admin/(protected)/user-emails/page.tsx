import { Suspense } from "react"
import { getUsersWithEmails } from "./actions"
import { UserEmailsClient } from "@/components/user-emails-client"

interface PageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    q?: string
  }>
}

export default async function UserEmailsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number.parseInt(params.page || "1")
  const limit = Number.parseInt(params.limit || "25")
  const searchQuery = params.q || ""

  const initialData = await getUsersWithEmails(page, limit, searchQuery)

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">User Emails</h1>
          <p className="text-muted-foreground mt-1">View and export user email addresses for communication</p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <UserEmailsClient initialData={initialData} />
      </Suspense>
    </div>
  )
}