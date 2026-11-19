# Stitch Connect

A tailoring marketplace MVP backed by Neon PostgreSQL: discover independent ateliers, compare up to three, create a custom order, chat with its tailor, and coordinate both doorstep shipment legs.

**Payments, courier assignments, addresses, ratings, and portfolios are demo data. No real money is charged, held in escrow, or paid out.** All bundled garment artwork is original generated SVG illustration.

## Run locally (PowerShell)

Use Node.js 22.18+ with native TypeScript support, npm, and a linked Neon PostgreSQL project. Verified on Node 26.11.1.

```powershell
npm ci
npm run setup
neon env pull
npx prisma generate
npm run db:migrate
npm run db:seed
npm run dev
```

`neon env pull` populates `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) in `.env`. The app and migration runner use Neon-compatible direct TLS negotiation and prefer IPv4. The migration runner applies the checked-in SQL transactionally and records checksums in Prisma's `_prisma_migrations` table; this is used here because Prisma's separate Windows schema-engine executable cannot reach Neon on this network. Open **http://localhost:3000**. Use the exact origin in `NEXTAUTH_URL`; opening an alternative host/IP can cause mutation and chat-origin checks to reject requests. The server binds to loopback only by default.

`npm run setup` generates a private `.env` only if none exists, using cryptographically random session/payment secrets and a demo password. It also generates the six original garment illustrations. It never replaces an existing environment file.

If Prisma downloads fail under a corporate certificate authority, enable Node's system certificate trust for that PowerShell process and retry:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npx prisma generate
```

Do not disable TLS certificate validation.

### Accounts

| Role | Email |
|---|---|
| Customer | `customer@stitch.local` |
| Tailor / Amara Atelier | `tailor1@stitch.local` |
| Tailor / Luca & Thread | `tailor2@stitch.local` |
| Other seeded tailors | `tailor3@stitch.local` through `tailor5@stitch.local` |
| Admin / logistics | `admin@stitch.local` |

Seeded accounts share the **private `DEMO_PASSWORD` in your local `.env`**. Do not publish that file. Passwords are hashed in Neon PostgreSQL. Signup creates a new CUSTOMER with its own password; it cannot assign a privileged role.

The seed creates five tailors and two example orders: one stitching and one ready for its final payment. Reseeding does not duplicate them or reset workflow/payment state. Seeded workshop address fields are refreshed to the current fictional fixtures. Changing `DEMO_PASSWORD` after seeding does not change existing password hashes.

### Production-mode local verification

```powershell
npm run build
npm start
```

Both development and production-mode local execution use `server.ts`, which hosts Next.js and Socket.io together. Socket.io mode requires this custom server; Vercel instead uses the polling mode below. Production-mode local execution is not a deployment certification.

### Public Vercel demo

Vercel uses Next.js route handlers, not the custom Socket.io server. Set `NEXT_PUBLIC_CHAT_TRANSPORT=polling` at build time to refresh chat every three seconds. Local execution defaults to Socket.io. Both modes use the same authenticated chat API and message persistence.

`vercel.json` generates Prisma before building and places functions in Singapore alongside the existing Neon project. Use Node.js 24 and Fluid compute. Configure these Vercel production environment variables privately: `DATABASE_URL` (pooled), `NEXTAUTH_URL` (the canonical HTTPS demo URL), `NEXTAUTH_SECRET`, `PAYMENT_SECRET`, `DEMO_MODE=true`, and `NEXT_PUBLIC_CHAT_TRANSPORT=polling`. Session and payment secrets must be random; never place them in client-side environment variables. `DEMO_PASSWORD` is only needed locally for seeding and must be shared privately with demo participants. Do not publish admin credentials on the login screen.

`next.config.ts` explicitly includes Prisma's generated `query_compiler_bg.wasm` in server function file traces. Keep this setting when changing deployment configuration; otherwise database-backed routes can fail with `ENOENT` after a successful build.

Apply migrations with `npm run db:migrate` and seed before deploying. Builds do not run migrations or reset demo data. The direct migration URL is not required in the deployed runtime. New image uploads are private database rows limited to 3 MB each, below Vercel's request/response limit. This small-demo storage approach is not a substitute for object storage at production scale. Legacy local image files remain readable only on the original local server.

The public demo permits customer signup. Only use fictional names, measurements, addresses, and images; seeded accounts share data with anyone given those account credentials. Payments and logistics remain simulated. Process-local throttling is not a distributed abuse-control system; take the demo offline when no longer needed.

#### Manual deployment (Vercel dashboard only)

No Vercel CLI or desktop app is required.

1. Open Vercel and select the existing `lets-train/stitchconnect` project, which is already connected to `shashanksagar/stitchconnect`. If deploying in another Vercel account, import that GitHub repository instead.
2. In **Settings > Build and Deployment**, select **Next.js**, root directory `.`, Node.js **24.x**, and install command `npm ci`. Keep the build command from `vercel.json`: `prisma generate && next build`. Leave output directory at the Next.js default. Enable Fluid compute if it is not already enabled. Do not use `npm start` or `server.ts` as a Vercel build/start command.
3. Connect the existing Neon project `young-snow-59210795` / branch `production`, or copy its pooled connection string into the Vercel `DATABASE_URL` variable. Do not accidentally provision a new empty database. The existing database is already migrated and seeded with five tailors and two example orders.
4. In **Settings > Environment Variables**, verify every row below for **Production**. Do not assume a partially configured variable list is complete.

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Existing Neon's pooled PostgreSQL connection URL |
   | `NEXTAUTH_URL` | Canonical HTTPS production URL, e.g. `https://stitchconnect-sooty.vercel.app`, with no trailing slash |
   | `NEXTAUTH_SECRET` | A fresh random secret, at least 32 bytes |
   | `PAYMENT_SECRET` | A different fresh random secret, at least 32 bytes |
   | `DEMO_MODE` | `true` |
   | `NEXT_PUBLIC_CHAT_TRANSPORT` | `polling` |

   Generate each secret separately using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and paste it directly into Vercel. Never commit or share the output. `DATABASE_URL_UNPOOLED` is only used for local migration commands, not runtime. `DEMO_PASSWORD` is not needed in Vercel: login checks the hashes already stored in Neon.
5. In **Settings > Deployment Protection**, turn off Vercel Authentication for the production deployment if you want the selected public demo. App login still protects private routes. The already-created project's production domain is `stitchconnect-sooty.vercel.app`; verify the domain in your dashboard before setting `NEXTAUTH_URL`.
6. Under **Deployments**, deploy the latest `main` commit (or redeploy it after changing environment variables). Confirm the build is **Ready**. Polling is selected at build time, so environment changes require a new deployment.
7. Open the canonical production URL, not a deployment-specific preview URL. Verify `/explore` shows five tailors, then create a fictional customer or use the seeded accounts with the private password from local `.env`. Use separate browser profiles for customer and tailor: place an order, upload an image under 3 MB, simulate the upfront payment, and confirm a message appears in the other profile within a few seconds. Use admin and tailor accounts to demonstrate logistics, production status, and final payment.

If a new/empty Neon database was connected deliberately, first set its pooled and direct URLs in local `.env`, then run `npx prisma generate`, `npm run db:migrate`, and `npm run db:seed` locally before deploying. Do not run these against an unrelated database. To check a deployed failure: use Vercel's build/runtime logs; login or mutation-origin failures usually mean `NEXTAUTH_URL` does not match the URL being opened. WebSocket connection attempts mean the app was built without `NEXT_PUBLIC_CHAT_TRANSPORT=polling`.

## Routes

| Route | Access |
|---|---|
| `/`, `/explore` | Public landing, filtering, comparison |
| `/signup`, `/login` | Customer signup and credential login |
| `/order/new/[tailorId]` | Customer guided checkout |
| `/orders`, `/orders/[orderId]` | Own customer orders; detail also available to assigned tailor/admin |
| `/orders/[orderId]/chat` | Order's customer and tailor only |
| `/dashboard/tailor` | Assigned paid commissions |
| `/dashboard/admin` | Confirmed shipments and financial ledger |

APIs live under `/api/orders`, `/api/uploads`, `/api/ledger`, `/api/signup`, `/api/auth`, and `/api/payments/callback`. Domain services enforce access and transitions independently of button visibility. Cookie-authenticated mutations require a matching `Origin` header.

## Order and payment rules

1. Pick a garment, optionally attach up to five references, enter chest/waist/length with cm or inches, and provide both addresses.
2. The tailor's base price is the fixed total quote for every offered garment in this MVP. No extra garment, shipping, tax, or currency conversion calculation is implemented.
3. Create the order, then use its clearly labeled simulator to pay the first half. Unpaid checkout records are not operational pickup orders.
4. Admin assigns and dispatches leg 1: customer fabric to the tailor's workshop. Confirm its arrival before the tailor starts stitching.
5. Assigned tailor progresses from stitching to ready. Only now can the customer simulate the balance payment.
6. Admin can dispatch leg 2 only after both installments are paid, then confirm customer delivery.

All amounts are integer USD cents. Upfront is `ceil(total / 2)`; the final installment is the remainder, so odd-cent totals reconcile exactly. The **10% platform fee is included**, rounded once from the quote and deducted from the tailor's net. Quote, fee, addresses, and workshop destination are frozen on the order.

The simulator supports failure/retry. It calls the same HMAC-verified settlement service as the mock callback endpoint. Unique installment/attempt/event identifiers and database transactions prevent double collection and stale callbacks. Browser input cannot set paid flags. Payment simulation and seeded privileged login require `DEMO_MODE=true`.

The five main tracker statuses remain:

```text
PENDING_PICKUP -> IN_TRANSIT_TO_TAILOR -> STITCHING -> READY_FOR_DELIVERY -> DELIVERED
```

Shipment records separately represent fabric arrival and final dispatch, which do not have their own main order status. The ledger distinguishes gross quote value, successful cash collections, unpaid balance, held funds, expected fees, fees recognized on delivery, and delivered net payouts owed. It does not execute payouts or track manual payout settlement.

## Chat and uploads

- Socket.io authenticates signed sessions and validates order membership before room joins.
- Messages are persisted before broadcast, deduplicated on retry, and caught up on reconnect.
- Text and one optional image per message; admin has no conversation access.
- JPEG, PNG, and WebP only; up to 3 MB per file, checked by MIME and file signature.
- New uploads persist in private Neon `UploadData` rows; authenticated reads check owner/order access. Admin can read order references but not chat attachments.
- Remove unused wizard/chat attachments with their remove buttons. Attached order images are immutable. There is no background deletion of customer uploads.
- Neon PostgreSQL stores application data and new image bytes. Keep `storage/uploads/` only for legacy local images. Neither `.env` nor private uploads belong in version control.

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

`npm test` exercises money, persistent checkout, role boundaries, payment retry/idempotency/concurrency, shipment transitions, ledger reconciliation, and private text/image chat. It provisions a unique temporary Neon schema using the real migrations, then drops it.

`npm run test:e2e` requires a current production build. It provisions another isolated temporary Neon schema and upload directory, launches the custom server on loopback port 3100, and tests browser signup/checkout, comparison/mobile layouts, real two-context Socket.io messaging, tailor production, admin dispatch, final payment, and access denials. A second batch restarts the server against the same test data and verifies persisted order, payments, chat, and private image bytes. Tests never change the normal demo database. The test schema and upload directory are removed on completion. Port 3100 must be free. Playwright failure traces and screenshots are under ignored `test-results/`.

The lockfile includes targeted `postcss` and `deepmerge-ts` overrides to avoid the advisories affecting the framework/tooling's transitive versions. Validate both migrations and the production build when changing them.

## MVP boundaries

Demo hosting only, not production commerce. Socket.io has no distributed adapter; the Vercel demo uses polling instead. Login throttling is process-local, and demo images consume database storage. There is no password recovery/email verification, public tailor onboarding, real payment provider, regulated escrow, carrier API, shipping quote/customs handling, refunds, cancellation, disputes, or real payout processing. Global locations and addresses are supported as text, but international fulfillment is manually simulated. Tailor ratings are curated seed values, not a review system.
