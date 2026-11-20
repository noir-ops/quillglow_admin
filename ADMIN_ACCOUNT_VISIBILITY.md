# Admin account visibility update

Prepared 24 October 2026. This updates only the admin codebase and includes the
previous gated pricing/conversion release. It does not activate that release.

## User Management

- New User type column: Learner, Guide, or Impact partner. A registered guide
  who also has an impact-partner account shows both labels.
- Guide identity comes from trusted_adults; impact identity comes from
  benefactors. The automatic learner profile alone is not used to mislabel
  those accounts. User-editable auth metadata never decides these labels.
- New Family / guide links column: active family and mentor relationships from
  guardian_links. Mentor is displayed as Guide. Expand a row's badges to see
  the linked people's names. Revoked links and pending invitations do not count.
- Lookups are restricted to the visible 50-profile page. Link reads paginate so
  an API row limit does not silently hide additional links. Name lookups batch.
- Failed lookups show Unavailable rather than falsely saying Learner/unlinked.
  The original user actions, search, pagination and activity columns remain.

## Partnership Management

- Registered impact partner accounts appear in a separate section on this page.
- Organization, account contact/email, organization type, verification status,
  joined date and expandable account ID are shown.
- Pending, verified, rejected and suspended accounts remain visible. This change
  never verifies an account, grants a role or publishes a public directory entry.
- Search by organization/contact/email and paginate 50 accounts at a time.
- Existing directory partners and their add/edit/delete/featured actions remain.
  Directory search now submits its existing filter. “Review organizations” links
  to the existing verification workflow.
- The two pages check the signed-in admin role before service-role reads, in
  addition to the existing admin middleware. No new public endpoint is added.

## Deploy

1. Replace your admin source with this updated admin ZIP and deploy normally.
2. Keep its existing Supabase URL, anon/publishable key, server-only service-role
   key and admin access configuration. No additional key or environment variable
   is needed for this update.
3. No new SQL migration, data backfill, role edit or main-app deployment is
   required for these account-display changes. The existing profiles,
   trusted_adults, guardian_links and benefactors tables must already exist in
   the shared project. If one is unavailable, the page reports that explicitly;
   do not rerun old bootstrap SQL to try to clear the message.
4. Sign in as an admin and verify a learner, a guide and an impact-partner
   account. Confirm an active family/guide link, a revoked link's exclusion,
   and impact partner search/pagination. Expanding badges shows names only;
   this feature does not fetch messages, permissions, study documents or funds.

The preceding Phases 2/3 release has its own deployment prerequisites in
PHASES_2_3_DEPLOYMENT.md. Those still apply if you have not deployed that release;
this account-display update adds no migration to that list.

## Validation

- Admin production build passed with build-only placeholder credentials.
- Account-directory tests exercise the actual loaders, server page rendering,
  dual roles, user-metadata spoofing, active/revoked links, 1,201 linked accounts,
  visible-page scoping, unavailable states, pending/suspended partners, search
  query construction and authorization before private reads.
- Chromium tests exercise the actual new components at 390px and 1440px,
  expandable names/account IDs, verification labels and horizontal table scroll.
- Existing admin API setup regression tests passed.
- Full TypeScript check retains the same 20 pre-existing diagnostics. No
  diagnostics occur in changed/new TypeScript files. Existing build settings and
  package dependencies are unchanged.
- No live database, user account or hosting deployment was changed here.

Local checks from the admin project:

```text
node scripts/test-account-directory.cjs
node scripts/test-api-setup.cjs
npm run build
TEST_NODE_MODULES=/ABSOLUTE/TEST-DEPS/node_modules TEST_CHROMIUM_PATH=/ABSOLUTE/chromium node scripts/test-account-directory-browser.cjs
```

Browser test dependencies (esbuild and Playwright 1.51.1) belong in an external
test directory, not production dependencies. Build the admin app first so its
actual CSS is available. TEST_OUTPUT_DIR optionally controls internal test output.
