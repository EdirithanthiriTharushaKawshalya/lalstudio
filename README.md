# LAL STUDIO

An editorial photography website and staff workspace built in the existing **Next.js 16.4 App Router / React 19 / TypeScript / Tailwind 4** project. Uses npm, Supabase PostgreSQL/Auth/Storage, Zod, Lucide, Sharp, Manrope and Inter.

## Run locally

Use Node.js 24 for the included test suite, which imports the typed image-processing helper with Node’s native TypeScript support.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://localhost:3000`. On shells without the Windows execution-policy restriction, use `npm` instead of `npm.cmd`.

With no Supabase credentials, the application is a **read-only sample preview**: public sample portfolio and equipment photographs (including the replacement wedding hero), empty operational records, and a labeled admin preview at `/admin`. Public forms return an explicit unsaved-preview message. There are no fake saved bookings, fabricated clients, prices, testimonials, opening hours or financial records. Preview is never a fallback for a failed live database query; live errors show an error state.

## Connect the database and storage

1. Create a Supabase project. Run the SQL files in `supabase/migrations/` **in numeric order**, using the Supabase SQL editor or `supabase db push` after linking the project. Start with an empty application schema. Do not run `tests/bootstrap.sql` in Supabase.
   Alternatively, run `node scripts/prepare-supabase-sql.mjs` and paste the generated `supabase/setup.sql` into the Supabase SQL Editor. It combines all six migrations inside one transaction and is intended to run once against a fresh project. `node scripts/check-supabase.mjs` verifies API access, the studio settings table and required bucket presence without printing credentials; it does not apply migrations. For agent-applied migrations, provide the PostgreSQL connection URI in the ignored `SUPABASE_DB_URL` environment field, rather than in chat or shell arguments.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` or the deployment environment. The service key is used only in server-only modules. Never expose it through a public variable.
3. Generate independent random `APP_SECRET` and `CRON_SECRET` values. `APP_SECRET` must have at least 32 characters. For example, run `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` twice and store the outputs securely.
4. Set `NEXT_PUBLIC_SITE_URL` to the actual origin, without a trailing slash. Restart/rebuild after changing environment values; preview/live mode is selected from these values at build and runtime.

Migrations create relationships, checks, indexes, RLS, audit triggers, service records, transaction functions and three Storage buckets:

| Bucket           | Visibility | Purpose                          |
| ---------------- | ---------- | -------------------------------- |
| `portfolio`      | Public     | Portfolio and catalog thumbnails |
| `verification`   | Private    | Rental ID front/back and selfies |
| `gallery-covers` | Private    | Client delivery covers           |

Browser clients have no write policies. Mutations run through server actions after validation; staff operations recheck the authenticated user and `admins` membership. Privileged RPCs are executable only by the service role and also validate the supplied staff actor. Database functions lock shared resources, and a GiST exclusion constraint independently prevents overlapping active reservations. Pending rentals never reserve units. An overdue collected unit stays unavailable until staff record its return.

Images must be JPEG, PNG or WebP, at most 5 MB and 24 megapixels. Sharp decodes and re-encodes uploads, strips EXIF/GPS and uses random object names. Admin document viewing checks authorization and issues a 60-second signed URL. Client cover links last five minutes and are issued only after gallery access succeeds. Failed intake uploads are removed; failed record replacements preserve the existing image.

## Provision the first admin

Disable public signup in Supabase Auth. In the Supabase dashboard, invite/create a staff user and complete their password setup. Copy the user UUID, then run this as the database owner:

```sql
insert into public.admins(user_id) values ('STAFF_AUTH_USER_UUID');
```

Staff sign in at `/admin/login`. There is no public admin registration or default password. Provision further staff using the same process. Delete their `admins` row to revoke application access; terminate sessions in Supabase Auth as appropriate. `src/proxy.ts` refreshes auth cookies; server authorization remains mandatory on every private data read and mutation. Use HTTPS in production.

The public footer includes **Admin sign in**, so staff do not need to type `/admin` manually. Existing Supabase passwords are checked by Supabase without imposing account-creation strength rules at login. Email addresses are trimmed and normalized; passwords are preserved exactly. Auth-changing server actions persist HttpOnly, SameSite=Lax session cookies and use Secure cookies in production; cookie-write errors are not silently ignored during sign-in. On Vercel, incomplete configuration cannot expose the read-only admin preview.

For hosted sign-in, configure `NEXT_PUBLIC_SUPABASE_URL`, either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and either `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in the Vercel **Production** environment, then redeploy. Both naming conventions are supported. Set `NEXT_PUBLIC_SITE_URL` to the production origin. `APP_SECRET` is still required for passcode-protected client gallery cookies, but missing it no longer blocks staff login or public requests: durable rate-limit identifiers are HMACs scoped by operation and keyed with the private Supabase server key. They contain no raw IP addresses. The sign-in page reports missing deployment variable names without exposing values. Database-service errors are distinguished from actual rate-limit exhaustion.

An optional full-stack check is available as `node scripts/verify-admin-auth.mjs --temporary-account` with the built application running on localhost port 3005 (or set `TEST_SITE_URL` to another local port). This explicitly creates one randomly named, confirmed temporary Supabase Auth user and staff role, verifies password sign-in, HttpOnly cookie persistence, protected dashboard access, incorrect-password errors and sign-out, then deletes the Auth user and cascading role. No emails are sent, the existing owner account is untouched, and credentials/tokens stay in process memory. The script refuses non-local target hosts and is not part of the default test suite.

## Routes and workflows

- Public: `/`, `/portfolio`, `/services`, `/about`, `/bookings`, `/rentals`, `/privacy`.
- Client delivery: footer-only `/event-gallery` access page and `/event-gallery/[token]`. Tokens are 256-bit random values. Galleries support draft/published, expiry, revocation, optional bcrypt passcodes, token regeneration, private covers and validated Facebook/Google Drive links. Passcode sessions are signed HttpOnly cookies, expire after one hour and are invalidated by a changed token/passcode. No gallery details are sent before access is granted. Facebook and Drive enforce their own photo permissions.
- `/admin`: pending requests, upcoming confirmed sessions, rental desk, overdue returns, low-stock counts and monthly finances.
- `/admin/portfolio`: upload/replace thumbnails; edit, publish, feature and reorder cards. Only complete albums live on Facebook. Shared thumbnail references are checked before cleanup.
- `/admin/bookings`: search/filter; scheduling, conflict warning/acknowledgment, status, venue, quote and internal notes. Public submissions save as Pending and return their database-generated reference. Times use Asia/Colombo and are stored as UTC timestamps.
- `/rentals`: a card catalog without a public availability checker. Clicking a card opens the request form for that item, with quantity defaulting to one. After submitting, clients call the studio with their reference to confirm availability. A saved request remains Pending Review until staff approve it; submission does not reserve equipment.
- `/admin/rentals`: manual identity review, dates, unit assignment, condition and notes. The dedicated workflow panel provides **Approve after phone confirmation -> Mark ready for pickup -> Record handover to client -> Record equipment return**. Each step requires staff acknowledgment; handover and return require a condition report and save the responsible staff UUID and actual timestamp. No step requires payment or creates financial entries automatically. Approval and date changes call the same transaction. Optional comma-separated unit IDs select specific physical copies before collection; blank allocation retains eligible units or assigns available units. Collected physical units are preserved. Returned/cancelled rentals release reservations.
- `/admin/equipment` and `/admin/units`: manage listings separately from actual physical copies, serial/internal codes, maintenance and retirement. A reserved unit cannot enter maintenance or retire until reservations are resolved.
- `/admin/calendar`: month/week/day/agenda, source filters, pending/confirmed sessions, approved rental spans/pickups/returns and manual appointments/blocks. Entries link back to their source editors. Select a date to add studio time.
- `/admin/inventory`: stock definitions, low-stock alerts, atomic restock/usage/sale/damage/adjustment movements and history. New items start at zero; add a restock movement to establish opening stock. Negative balances are rejected. Snapshot and movement CSV exports are available.
- `/admin/finances`: optional manual bookkeeping. Record only the income, expenses or deposits you need to keep. All figures cover entered records only, not the studio's complete accounts; missing entries do not mean a client has not paid. No booking, approval, handover or return requires a financial entry. Exact PostgreSQL numeric amounts, period filters, category totals, outstanding quoted fees and deposits held. Link payments to a booking/rental or stock movement. Deposits/refunds require a rental, are excluded from earned income and cannot refund more than is held. Repeated submissions with the same retry key create one ledger entry. Correct entries by voiding with a reason and recording a replacement; original/audit records are retained. Booking/rental status changes never create payments automatically. Enter stock-purchase expenses and frame/print sales explicitly so they reflect actual money received/spent.
- `/admin/galleries`: client display details, cover, delivery links, publish/access controls, share link and staff preview. The preview intentionally allows staff to inspect drafts.
- `/admin/settings`: shared contact details, address/map query, social links, hours, booking guidance, homepage copy and retention/expiry policy. The linked **Service descriptions & prices** editor controls each service’s price; unset prices display “Contact us for pricing”.

Search/filter tables paginate at 25 records. Server data reads fetch database pages rather than silently truncating exports or totals at the API row limit. This implementation is designed for a studio-sized workload; large archives should move list pagination and aggregates fully into SQL.

## Project structure and shared styles

```text
src/app/(public)/              Public route composition and layout
src/app/admin/login/           Staff authentication
src/app/admin/(protected)/     Admin layout, sections, private routes
src/app/api/retention/         Authenticated scheduled document cleanup
src/components/ui/            Button, forms, fields, badges
src/components/layout/        Public header/footer and admin sidebar
src/features/                 Bookings, rentals, portfolio, galleries, calendar, admin
src/lib/                      Server-only data/auth/storage/security and shared studio types
src/proxy.ts                  Auth refresh and private response headers
supabase/migrations/          Schema, RLS, storage and business transactions
tests/                        HTTP, database, concurrency and asset checks
public/photos/                Labeled illustrative Unsplash photographs
```

Change design tokens in `src/app/globals.css`. `src/components/layout/studio-logo.tsx` provides the single footer-style wordmark for the header, footer, staff sidebar, login and loading screen; its typography is styled by `.studio-logo` and scaled with `--logo-size`. Public typography uses `--font-manrope`; admin typography uses `--font-inter`, both configured through `next/font/google` in the root layout. All controls use `components/ui/button.tsx` and its primary/secondary/light/destructive variants. Form submissions share pending, validation, error and saved states through `components/ui/form.tsx`. Status definitions and studio defaults live in `lib/studio.ts`; admin editor fields live in `features/admin/config.ts`. Domain mutations live in feature actions and SQL transaction functions rather than route components.

Public photography uses monochrome hero/brand sections and original-color portfolio thumbnails. Images are optimized by `next/image`. Replace the files referenced by `photos` in `lib/studio.ts` with authentic studio assets before launch. Sample portfolio cards have no fabricated Facebook destinations and cannot masquerade as real linked client work. Photo sources can be reproduced with `node scripts/download-samples.mjs` (network access required); they are from `images.unsplash.com` and are illustrative, not studio photographs.

The homepage hero can also be replaced directly at **Admin → Studio Settings → Homepage hero photograph**. Upload a JPEG, PNG or WebP landscape image (maximum 5 MB; minimum 1600 × 900 pixels), add its short description and save. A 2400-pixel-wide image is recommended. The saved photo is used on desktop and mobile with the existing monochrome treatment and 45% dark overlay. Leave the file field empty to keep the current photo, or select “Restore the default hero photograph” to reset it. Uploads are staff-authorized, decoded/re-encoded, stripped of metadata and stored under a new opaque key in the existing public `portfolio` bucket. Replaced images are removed only if neither settings nor portfolio/catalog records reference them. No additional migration is needed: the values use the existing settings JSON record and storage bucket. Saving remains disabled in read-only preview mode.

## Retention and deployment

Choose verification retention days in Studio Settings **before collecting live identity documents**. Schedule a daily or hourly GET to `/api/retention` with `Authorization: Bearer CRON_SECRET` through your hosting scheduler. The endpoint deletes up to 100 expired documents per run, measured from upload, then marks records as deleted. Without a configured retention policy it skips deletion. Run again if a backlog exceeds the batch. Manual document deletion is available in each rental record. Confirm that backup-retention practices match the owner’s policy; deleting active storage does not retroactively erase independent backups.

Deploy on a Node.js-capable Next.js host; this app is not a static export. Configure all environment variables in the host, apply migrations, provision staff, then run `npm run build` and `npm start`. The build needs Google Fonts network access. Set Supabase Auth Site URL and allowed redirect origins for the deployed domain. Preserve trusted proxy IP headers for rate limiting and prevent untrusted clients from forging them at the hosting edge. Rate counters are durable in PostgreSQL and fail closed. Periodically remove stale rate-limit rows as operational housekeeping.

Keep private endpoints uncached. Admin/gallery responses set private/no-store, noindex and no-referrer headers. The sitemap contains only public pages. Configure host/CDN access-log redaction for gallery URL tokens and disable request body logging on authentication, request and upload endpoints. Application audits omit gallery tokens/hashes, document storage keys, names and contact details. Review staff access and backups periodically.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# With the built app running:
npm.cmd run test:http
```

For database verification, use a **disposable isolated PostgreSQL database**, never production. The bootstrap file creates minimal Supabase `auth`/`storage` test shims; it is not a Supabase replacement. Apply it once, then apply all six migrations. Set the standard `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` variables to that database and run `npm run test:db`. SQL assertions run in a rollback transaction; concurrency checks create uniquely identified fixtures and clean up their records afterward. These tests cover rental allocation and conflicts, released reservations, maintenance, status transitions, staff handover/return timestamps and condition requirements, optional finance independence, stock idempotency/nonnegative balances, exact amounts, payment retries/void audits, gallery passcodes/expiry/revocation/token rotation, rate limits, settings and anonymous RLS. The concurrency script launches independent PostgreSQL connections to race rental approvals and payment retries.

Verified during implementation:

- ESLint, TypeScript, production build and local HTTP route smoke checks.
- Migrations applied to isolated PostgreSQL 18; transaction/RLS tests passed.
- Simultaneous approvals for one unit: exactly one succeeds. Simultaneous payment retries: exactly one ledger entry.
- Sample files are present locally; all requested public/admin routes respond; gallery/admin sitemap exclusions, unauthenticated retention rejection and preview export rejection passed.

Not verified against a live Supabase project: real staff authentication/email provisioning, Storage upload/signed URL delivery, and complete browser-to-backend submission flows. Browser automation and the native browser connection were unavailable, so desktop/mobile visual QA, keyboard traversal and interactive form checks remain to be performed in a browser. Responsive layouts include mobile navigation, stacked content, scrollable admin tables/calendar, visible focus and reduced-motion styles; these are implemented, not claimed as visually verified.

The hero now uses one even tint instead of overlapping directional gradients, with `next/image` quality 90 explicitly allowed in the image configuration. The mobile pass covers narrow layouts down to 320 px: fluid hero typography/height, stacked forms and footer, 16 px form controls to avoid iOS focus zoom, larger touch targets, wrapping record details, and keyboard-focusable table/calendar scrolling regions. The admin navigation becomes a labeled drawer with Escape dismissal, focus containment/return and background scroll locking. HTTP checks verify viewport metadata and delivery/markup; they do not measure layout. Before launch, visually check every public page, selected rental form, staff login, dashboard, lists, editors, settings and all calendar views at 320, 375, 390, 430, 768, 1024 and 1440 px, plus landscape and 200% text zoom. Confirm there is no page-wide horizontal scrolling; only tables and multi-day calendars should scroll within their own regions.

## Owner inputs before launch

Supply authentic studio photography and portfolio Facebook links; equipment models/units, accessories and rates; staff credentials; real domain and Supabase credentials. Confirm opening hours, service prices, map destination, social URLs, booking availability, gallery expiry, document/client-record retention, publication consent, identity checks, deposits/refunds, late-return and cancellation terms. Review the privacy page against actual studio practice. No awards, testimonials or customer counts have been invented.
