"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Award, Target, BookOpen, Calendar, Clock, TrendingUp, CheckCircle2, CreditCard } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface UserDetailsDialogProps {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UserProfile {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  xp: number
  level: number
  streak_days: number
  last_activity_date: string | null
  created_at: string
}

interface UserStats {
  totalTasks: number
  completedTasks: number
  totalNotes: number
  totalFlashcards: number
  totalStudyPlans: number
  pomodoroSessions: number
  achievements: number
}

export function UserDetailsDialog({ userId, open, onOpenChange }: UserDetailsDialogProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails()
    }
  }, [open, userId])

  const fetchUserDetails = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single()

      setProfile(profileData)

      // Fetch stats in parallel
      const [
        { count: totalTasks },
        { count: completedTasks },
        { count: totalNotes },
        { count: totalFlashcards },
        { count: totalStudyPlans },
        { count: pomodoroSessions },
        { count: achievements },
      ] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
        supabase.from("notes").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from("flashcards")
          .select("flashcard_decks!inner(user_id)", { count: "exact", head: true })
          .eq("flashcard_decks.user_id", userId),
        supabase.from("study_plans").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from("pomodoro_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("completed", true),
        supabase.from("user_achievements").select("*", { count: "exact", head: true }).eq("user_id", userId),
      ])

      setStats({
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        totalNotes: totalNotes || 0,
        totalFlashcards: totalFlashcards || 0,
        totalStudyPlans: totalStudyPlans || 0,
        pomodoroSessions: pomodoroSessions || 0,
        achievements: achievements || 0,
      })

      // Fetch subscription
      const { data: subData } = await supabase.from("subscriptions").select("*").eq("user_id", userId).single()

      setSubscription(subData)
    } catch (error) {
      console.error("Error fetching user details:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">{profile.display_name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-2xl font-bold">{profile.display_name || "Anonymous User"}</h3>
                      <p className="text-muted-foreground">{profile.bio || "No bio provided"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Level {profile.level}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Award className="h-3 w-3" />
                        {profile.xp} XP
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <span className="text-orange-500">🔥</span>
                        {profile.streak_days} day streak
                      </Badge>
                      {subscription && (
                        <Badge className="gap-1 bg-gradient-to-r from-blue-500 to-cyan-500">
                          <CreditCard className="h-3 w-3" />
                          {subscription.plan_type || "Pro"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs with detailed info */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
                      <p className="text-xs text-muted-foreground">{stats?.completedTasks || 0} completed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Notes</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalNotes || 0}</div>
                      <p className="text-xs text-muted-foreground">Created notes</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Flashcards</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalFlashcards || 0}</div>
                      <p className="text-xs text-muted-foreground">Total flashcards</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Study Plans</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalStudyPlans || 0}</div>
                      <p className="text-xs text-muted-foreground">Active plans</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Pomodoro</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.pomodoroSessions || 0}</div>
                      <p className="text-xs text-muted-foreground">Sessions completed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">Achievements</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.achievements || 0}</div>
                      <p className="text-xs text-muted-foreground">Unlocked</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>User Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">User ID</p>
                        <p className="text-sm font-mono mt-1">{profile.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Joined</p>
                        <p className="text-sm mt-1">
                          {new Date(profile.created_at).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Active</p>
                        <p className="text-sm mt-1">
                          {profile.last_activity_date
                            ? new Date(profile.last_activity_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Never"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Streak</p>
                        <p className="text-sm mt-1">{profile.streak_days} days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4">
                {subscription ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Subscription Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Plan Type</p>
                          <p className="text-sm font-medium mt-1 capitalize">{subscription.plan_type || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className="mt-1" variant={subscription.status === "active" ? "default" : "secondary"}>
                            {subscription.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current Period Start</p>
                          <p className="text-sm mt-1">
                            {new Date(subscription.current_period_start).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current Period End</p>
                          <p className="text-sm mt-1">
                            {new Date(subscription.current_period_end).toLocaleDateString()}
                          </p>
                        </div>
                        {subscription.stripe_customer_id && (
                          <div>
                            <p className="text-sm text-muted-foreground">Stripe Customer ID</p>
                            <p className="text-sm font-mono mt-1">{subscription.stripe_customer_id}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">No active subscription</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">User not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
