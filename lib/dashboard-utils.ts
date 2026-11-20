export function processUserGrowth(users: { created_at: string }[], months = 12) {
  const now = new Date()
  const monthBuckets = Array.from({ length: months }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    return { key, label }
  })

  const usersByMonth = users.reduce(
    (acc, user) => {
      const date = new Date(user.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return monthBuckets.map(({ key, label }) => ({
    month: label,
    users: usersByMonth[key] || 0,
  }))
}

export function processContactStatus(contacts: { status: string | null }[]) {
  const statusCounts = contacts.reduce(
    (acc, contact) => {
      const status = contact.status || "pending"
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return Object.entries(statusCounts).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
  }))
}

export function processActivity(activity: { created_at: string }[]) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split("T")[0]
  })

  const activityByDate = activity.reduce(
    (acc, item) => {
      const date = new Date(item.created_at).toISOString().split("T")[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return last7Days.map((date) => ({
    day: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    activity: activityByDate[date] || 0,
  }))
}
