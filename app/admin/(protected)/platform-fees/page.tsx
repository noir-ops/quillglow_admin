import { createAdminClient } from "@/lib/supabase/admin"
import { PlatformFeeSettingsForm } from "@/components/platform-fee-settings-form"

export const revalidate = 0

/**
 * Platform Fees — the rates added to every scholarship a benefactor funds.
 *
 * The `platform_fee_settings` table and the benefactor app's checkout have
 * been live since migration 041; this page is the missing admin UI for it.
 * Until now the only way to change a rate was a manual SQL update.
 */
export default async function PlatformFeesPage() {
  const admin = createAdminClient()
  const { data: settings } = await admin.from("platform_fee_settings").select("*").eq("id", "global").maybeSingle()

  // Defaults mirror migration 041 and the benefactor app's lib/fees fallback,
  // so a missing row renders the same numbers that would actually be charged.
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Fees</h1>
        <p className="text-muted-foreground">
          The technology and processing fees added to every scholarship a benefactor funds, plus the payment provider
          fee disclosure shown alongside them.
        </p>
      </div>

      <PlatformFeeSettingsForm
        initialSettings={{
          techFeePct: String(settings?.tech_fee_pct ?? 1.5),
          processingFeePct: String(settings?.processing_fee_pct ?? 1.0),
          providerName: settings?.provider_name ?? "Polar",
          providerFeePctEstimate: String(settings?.provider_fee_pct_estimate ?? 4.0),
          providerFeeFixedEstimate: String(settings?.provider_fee_fixed_estimate ?? 0.4),
          disclosureNote:
            settings?.disclosure_note ??
            "Polar, our payment processor, deducts its own processing fee from this transaction. The estimate above is approximate and may vary by card type, currency, and region — see polar.sh/resources/pricing for current rates.",
        }}
        lastUpdated={settings?.updated_at ?? null}
      />
    </div>
  )
}
