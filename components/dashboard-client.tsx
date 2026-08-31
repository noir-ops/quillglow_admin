'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, CreditCard, TrendingUp, type LucideIcon } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"

interface DashboardClientProps {
  stats: Array<{
    title: string
    value: string | number
    icon: "users" | "message-square" | "credit-card" | "trending-up"
    change: string
    changeType: "positive" | "negative"
  }>
  userGrowthData: Array<{ month: string; users: number }>
  contactStatusData: Array<{ status: string; count: number }>
  activityData: Array<{ day: string; activity: number }>
}

const iconMap: Record<DashboardClientProps["stats"][number]["icon"], LucideIcon> = {
  users: Users,
  "message-square": MessageSquare,
  "credit-card": CreditCard,
  "trending-up": TrendingUp,
}

export function DashboardClient({
  stats,
  userGrowthData,
  contactStatusData,
  activityData,
}: DashboardClientProps) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Welcome back! Here's what's happening with QuilGlow.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = iconMap[stat.icon]
          return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span
                  className={
                    stat.changeType === "positive"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {stat.change}
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">User Growth</CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground">Monthly new user registrations (last 12 months)</p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                users: {
                  label: "Users",
                  color: "#6B7280",
                },
              }}
              className="h-[250px] md:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30 dark:stroke-white/10" />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    stroke="currentColor"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    stroke="currentColor"
                    style={{ fontSize: "12px" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#6B7280"
                    fill="#6B7280"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Contact Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Contact Messages</CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground">Distribution of contact message statuses</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 px-2">
              <ChartContainer
                config={{
                  count: {
                    label: "Messages",
                    color: "#6B7280", // gray-500 Tailwind (same as user chart)
                  },
                }}
                className="h-[250px] md:h-[300px] min-w-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contactStatusData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30 dark:stroke-white/10" />
                    <XAxis
                      dataKey="status"
                      className="text-xs"
                      tick={{ fill: "currentColor" }}
                      stroke="currentColor"
                      style={{ fontSize: "11px" }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "currentColor" }}
                      stroke="currentColor"
                      style={{ fontSize: "12px" }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#6B7280" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
 
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Recent Activity</CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground">User signups over the last 7 days</p>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              activity: {
                label: "Activity",
                color: "#6B7280", // gray-500 in Tailwind (hsl(222.2, 10%, 62.4%)), for legend if used
              },
            }}
            className="h-[250px] md:h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30 dark:stroke-white/10" />
                <XAxis
                  dataKey="day"
                  className="text-xs"
                  tick={{ fill: "currentColor" }}
                  stroke="currentColor"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "currentColor" }}
                  stroke="currentColor"
                  style={{ fontSize: "12px" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="activity"
                  stroke="#6B7280"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
