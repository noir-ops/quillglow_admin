# Admin panel — applicant tracking update

20 November 2026

This ZIP contains the complete updated Admin panel codebase. It does not contain the other portal. The Impact Partner codebase retains its existing Month 1–5 implementation and integration patches.

## Deployment

1. Use this folder as the source for the corresponding existing repository. Keep your deployment environment variables.
2. Run database/check_application_tracking.sql against the shared QuillGlow database to reconcile the affected opportunity's real status totals. The screenshot's 49 includes saved and application records; its live breakdown remains unverified.
3. Apply database/20261120_preserve_application_history.sql through the existing migration process. This same shared script is included with both portal ZIPs. Apply it once to the shared database.
4. Run npm ci and npm run build, then deploy through the existing repository connection.
5. Check Admin → Opportunities → View application records and the owning partner's Applications & Reviews screen. Reconcile totals, test filters and pagination, check missing-profile and missing-submission-date records, and confirm another partner cannot access the owner's records. Populated opportunities must have deletion disabled.

## Changes

Applications default to all owners and statuses, fetch all database pages, and show pages of 50. Learner and application references remain visible when profile data is unavailable. Load errors are explicit. Review actions recheck authorization, state and payment status. Opportunity deletion preserves application history.

## Validation and limits

Both production builds passed. The combined correction passed 143 local automated checks across tracking/database regression, admin browser, partner routes, partner browser and partner unit suites. Partner TypeScript passed. Admin retains 18 existing TypeScript diagnostics from the supplied baseline, with no new diagnostics from this change; its original build configuration skips type checking.

No hosted deployment or live database changes have been performed. The real 49-record breakdown still requires the read-only database check.
