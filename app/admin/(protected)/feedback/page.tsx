import { getFeatureFeedback, getFeedbackStats, getFeatureFeedbackBreakdown } from "./actions"
import { FeedbackTable } from "@/components/feedback-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, MessageSquare, ThumbsUp, ThumbsDown, Meh } from "lucide-react"

export default async function FeedbackPage() {
  const [feedback, stats, breakdown] = await Promise.all([
    getFeatureFeedback(),
    getFeedbackStats(),
    getFeatureFeedbackBreakdown(),
  ])

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold">Feature Feedback</h1>
        <p className="mt-2 text-muted-foreground">View and manage user feedback on features</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">From all users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.byOption["positive"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">Users liked it</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Neutral</CardTitle>
            <Meh className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.byOption["neutral"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">Users are unsure</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative</CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.byOption["negative"] || 0}</div>
            <p className="text-xs text-muted-foreground">Users disliked it</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feedback by Feature</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byFeature)
              .sort(([, a], [, b]) => b - a)
              .map(([feature, count]) => (
                <div key={feature} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span className="font-medium capitalize">{feature.replace(/_/g, " ")}</span>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold">{count}</span>
                </div>
              ))}
            {Object.keys(stats.byFeature).length === 0 && (
              <p className="text-center text-muted-foreground py-4">No feedback received yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Sentiment Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">See how users feel about each feature</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {breakdown.map((feature) => (
              <div key={feature.feature_name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold capitalize">{feature.feature_name.replace(/_/g, " ")}</h3>
                  <span className="text-sm text-muted-foreground">{feature.total} responses</span>
                </div>

                {/* Poll bars */}
                <div className="space-y-2">
                  {/* Positive bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24">
                      <ThumbsUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">Positive</span>
                    </div>
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-end pr-2 transition-all duration-500"
                        style={{
                          width: `${feature.total > 0 ? (feature.positive / feature.total) * 100 : 0}%`,
                          minWidth: feature.positive > 0 ? "30px" : "0",
                        }}
                      >
                        <span className="text-xs font-bold text-white">{feature.positive}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {feature.total > 0 ? Math.round((feature.positive / feature.total) * 100) : 0}%
                    </span>
                  </div>

                  {/* Neutral bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24">
                      <Meh className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Neutral</span>
                    </div>
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-end pr-2 transition-all duration-500"
                        style={{
                          width: `${feature.total > 0 ? (feature.neutral / feature.total) * 100 : 0}%`,
                          minWidth: feature.neutral > 0 ? "30px" : "0",
                        }}
                      >
                        <span className="text-xs font-bold text-white">{feature.neutral}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {feature.total > 0 ? Math.round((feature.neutral / feature.total) * 100) : 0}%
                    </span>
                  </div>

                  {/* Negative bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24">
                      <ThumbsDown className="h-3 w-3 text-red-500" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">Negative</span>
                    </div>
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-end pr-2 transition-all duration-500"
                        style={{
                          width: `${feature.total > 0 ? (feature.negative / feature.total) * 100 : 0}%`,
                          minWidth: feature.negative > 0 ? "30px" : "0",
                        }}
                      >
                        <span className="text-xs font-bold text-white">{feature.negative}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {feature.total > 0 ? Math.round((feature.negative / feature.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {breakdown.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No feedback data available yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <FeedbackTable feedback={feedback} />
    </div>
  )
}
