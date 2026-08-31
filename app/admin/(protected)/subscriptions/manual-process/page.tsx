import { processExpiredSubscriptions } from "@/app/admin/(protected)/subscriptions/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default function ManualProcessPage() {
  async function handleProcess() {
    "use server"
    await processExpiredSubscriptions()
    redirect("/admin/subscriptions")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Process Expired Subscriptions</CardTitle>
          <CardDescription>
            Manually trigger the process to downgrade expired subscriptions to the Scholar plan. This is normally done
            automatically via a cron job.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleProcess}>
            <Button type="submit">Process Now</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
