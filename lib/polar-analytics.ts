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

    // ---- Subscription counts ----
    // Polar's list endpoint is paged. This used to request it with no paging
    // at all and so only ever saw the FIRST page — every card on the
    // Subscriptions page (active, trial, churn, new this month, scheduled
    // cancellations) was computed from that sliver. Every page is read now.
    const subscriptions: any[] = []
    const PAGE_LIMIT = 100
    for (let page = 1; page <= 200; page++) {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) })
      if (organizationId) params.set("organization_id", organizationId)
      const response = await fetch(`https://api.polar.sh/v1/subscriptions?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        cache: "no-store",
      })
      if (!response.ok) {
        console.error(`Polar API error: ${response.status} ${response.statusText}`)
        if (page === 1) return getDefaultAnalytics()
        break
      }
      const data = await response.json()
      const items = data.items || data.result || data.data || []
      subscriptions.push(...items)
      const maxPage = Number(data.pagination?.max_page ?? 1)
      if (items.length < PAGE_LIMIT || page >= maxPage) break
    }

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const at = (v: any) => (v ? new Date(v) : null)
    const startedAt = (sub: any) => at(sub.started_at) ?? at(sub.created_at)

    const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === "active")
    const trialingSubscriptions = subscriptions.filter((sub: any) => sub.status === "trialing")
    const canceledSubscriptions = subscriptions.filter((sub: any) => sub.status === "canceled")

    // Still paying but set to end at period end (Polar: cancel_at_period_end).
    const scheduledCancellations = subscriptions.filter(
      (sub: any) => (sub.status === "active" || sub.status === "trialing") && sub.cancel_at_period_end,
    ).length

    const newThisMonth = subscriptions.filter((sub: any) => (startedAt(sub) ?? new Date(0)) >= monthStart).length

    // When the learner cancelled (Polar: canceled_at) — not updated_at, which
    // changes for many unrelated reasons.
    const canceledThisMonth = subscriptions.filter((sub: any) => {
      const c = at(sub.canceled_at)
      return !!c && c >= monthStart
    }).length

    // Churn = subscriptions whose access ENDED this month (ended_at) out of
    // those that were live at the start of the month.
    const liveAtMonthStart = subscriptions.filter((sub: any) => {
      const s = startedAt(sub)
      const e = at(sub.ended_at)
      return !!s && s < monthStart && (!e || e >= monthStart)
    }).length
    const endedThisMonth = subscriptions.filter((sub: any) => {
      const e = at(sub.ended_at)
      return !!e && e >= monthStart
    }).length
    const churnRate = liveAtMonthStart > 0 ? (endedThisMonth / liveAtMonthStart) * 100 : 0

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