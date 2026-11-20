import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCommunityReports, getStudyRoomReports } from "./actions"
import { ReportsTable } from "@/components/reports-table"
import { AlertCircle, MessageSquare } from "lucide-react"

export const dynamic = "force-dynamic"

async function ReportsPageContent() {
  const [communityReports, studyRoomReports] = await Promise.all([getCommunityReports(), getStudyRoomReports()])

  const totalReports = communityReports.length + studyRoomReports.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-balance">Reports Management</h1>
        <p className="text-muted-foreground mt-2">Review and take action on reported messages from the community</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{totalReports}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending review</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Community Reports</CardTitle>
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{communityReports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">From community channels</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Room Reports</CardTitle>
            <MessageSquare className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{studyRoomReports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">From study rooms</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Card className="relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Reported Messages</CardTitle>
          <CardDescription>Review and take action on reported content</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="community" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="community">Community ({communityReports.length})</TabsTrigger>
              <TabsTrigger value="study-rooms">Study Rooms ({studyRoomReports.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="community" className="mt-6">
              <ReportsTable reports={communityReports} type="community" />
            </TabsContent>

            <TabsContent value="study-rooms" className="mt-6">
              <ReportsTable reports={studyRoomReports} type="study-room" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-sm text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  )
}
