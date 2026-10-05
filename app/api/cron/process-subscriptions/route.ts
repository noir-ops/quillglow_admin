import { processExpiredSubscriptions } from "@/app/admin/(protected)/subscriptions/actions"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Optional: Add authentication check here
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await processExpiredSubscriptions()

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error in cron job:", error)
    return NextResponse.json({ error: "Failed to process subscriptions" }, { status: 500 })
  }
}

// Manual trigger: same secret as the scheduled run. This handler used to run
// with no authentication at all.
export async function POST(request: Request) {
  return GET(request)
}
