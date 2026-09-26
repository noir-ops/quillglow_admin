import "server-only"

export interface SubscriptionAnalytics {
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
  scheduledCancellations: number
  monthlyRecurringRevenue: number
  previousMonthMRR: number
  mrrGrowthPercentage: number
  churnRate: number
  newSubscriptionsThisMonth: number
  canceledThisMonth: number
}

interface PolarMetricPeriod {
  timestamp: string
  monthly_recurring_revenue?: number
  [key: string]: unknown
}

interface PolarMetricsResponse {
  periods: PolarMetricPeriod[]
  totals?: Record<string, unknown>
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

/**
 * Fetches real-time MRR data directly from Polar's Metrics API
 * (GET /v1/metrics). This returns actual recurring revenue figures
 * per period bucket, rather than an estimate derived from subscription
 * counts. Currency values from this endpoint are returned in cents.
 */
async function getPolarMRRMetrics(
  apiKey: string,
  organizationId: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<PolarMetricPeriod[]> {
  const params = new URLSearchParams({
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    interval: "month",
    metrics: "monthly_recurring_revenue",
  })

  if (organizationId) {
    params.append("organization_id", organizationId)
  }

  const response = await fetch(`https://api.polar.sh/v1/metrics?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Polar Metrics API error: ${response.status} ${response.statusText}`)
  }

  const data: PolarMetricsResponse = await response.json()
  return data.periods || []
}

export async function getPolarSubscriptionAnalytics(): Promise<SubscriptionAnalytics> {
  try {
    const apiKey = process.env.POLAR_API_KEY
    if (!apiKey) {
      console.warn("POLAR_API_KEY is not set")
      return getDefaultAnalytics()
    }

    const organizationId = process.env.POLAR_ORGANIZATION_ID

    // Get current date and previous month date
    const now = new Date()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // ---- Subscription counts: unchanged from before ----
    const response = await fetch("https://api.polar.sh/v1/subscriptions", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Polar API error: ${response.status} ${response.statusText}`)
      return getDefaultAnalytics()
    }

    const data = await response.json()
    const subscriptions = data.result || data.items || data.data || []

    // Parse subscription statuses
    const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === "active" || sub.status === "ongoing")
    const canceledSubscriptions = subscriptions.filter(
      (sub: any) => sub.status === "canceled" || sub.status === "ended"
    )
    const trialingSubscriptions = subscriptions.filter((sub: any) => sub.status === "trialing")

    // Count scheduled cancellations (Polar uses cancel_at field)
    const scheduledCancellations = activeSubscriptions.filter((sub: any) => sub.cancel_at).length

    // Count new subscriptions this month
    const newThisMonth = subscriptions.filter((sub: any) => {
      const createdAt = new Date(sub.created_at)
      return createdAt >= startOfCurrentMonth
    }).length

    // Count canceled this month
    const canceledThisMonth = canceledSubscriptions.filter((sub: any) => {
      const canceledAt = sub.cancel_at ? new Date(sub.cancel_at) : new Date(sub.updated_at || sub.created_at)
      return canceledAt >= startOfCurrentMonth
    }).length

    // Calculate churn rate (based on subscription counts, as before)
    const activeAtStartOfMonth = activeSubscriptions.length + canceledThisMonth
    const churnRate = activeAtStartOfMonth > 0 ? (canceledThisMonth / activeAtStartOfMonth) * 100 : 0

    // ---- MRR: now pulled live from Polar's Metrics API ----
    let currentMRR = 0
    let previousMonthMRR = 0

    try {
      const periods = await getPolarMRRMetrics(apiKey, organizationId, startOfPreviousMonth, now)

      if (periods.length > 0) {
        const sortedPeriods = [...periods].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )

        const latestPeriod = sortedPeriods[sortedPeriods.length - 1]
        currentMRR = (latestPeriod.monthly_recurring_revenue ?? 0) / 100 // cents -> currency units

        if (sortedPeriods.length > 1) {
          const previousPeriod = sortedPeriods[sortedPeriods.length - 2]
          previousMonthMRR = (previousPeriod.monthly_recurring_revenue ?? 0) / 100
        }
      }
    } catch (metricsError) {
      console.error("Error fetching Polar MRR metrics:", metricsError)
      // currentMRR / previousMonthMRR remain 0 if the metrics call fails
    }

    // Calculate MRR growth percentage from real MRR figures
    const mrrGrowthPercentage = previousMonthMRR > 0 ? ((currentMRR - previousMonthMRR) / previousMonthMRR) * 100 : 0

    return {
      activeSubscriptions: activeSubscriptions.length,
      trialingSubscriptions: trialingSubscriptions.length,
      canceledSubscriptions: canceledSubscriptions.length,
      scheduledCancellations,
      monthlyRecurringRevenue: currentMRR,
      previousMonthMRR,
      mrrGrowthPercentage,
      churnRate,
      newSubscriptionsThisMonth: newThisMonth,
      canceledThisMonth,
    }
  } catch (error) {
    console.error("Error fetching Polar analytics:", error)
    return getDefaultAnalytics()
  }
}

function getDefaultAnalytics(): SubscriptionAnalytics {
  return {
    activeSubscriptions: 0,
    trialingSubscriptions: 0,
    canceledSubscriptions: 0,
    scheduledCancellations: 0,
    monthlyRecurringRevenue: 0,
    previousMonthMRR: 0,
    mrrGrowthPercentage: 0,
    churnRate: 0,
    newSubscriptionsThisMonth: 0,
    canceledThisMonth: 0,
  }
}