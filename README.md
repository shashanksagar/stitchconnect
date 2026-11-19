# Stitch Connect

A local-first tailoring marketplace MVP: discover independent ateliers, compare up to three, create a custom order, chat with its tailor, and coordinate both doorstep shipment legs.

**Payments, courier assignments, addresses, ratings, and portfolios are demo data. No real money is charged, held in escrow, or paid out.** All bundled garment artwork is original generated SVG illustration.

## Run locally (PowerShell)

Use Node.js 22.18+ with native TypeScript support and npm. Verified on Node 26.11.1. No Docker or external accounts are required.

```powershell
npm ci
npm run setup
npx prisma migrate deploy
npx prisma generate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. Use the exact origin in `NEXTAUTH_URL`; opening an alternative host/IP can cause mutation and chat-origin checks to reject requests. The server binds to loopback only by default.

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

Seeded accounts share the **private `DEMO_PASSWORD` in your local `.env`**. Do not publish that file. Passwords are hashed in SQLite. Signup creates a new CUSTOMER with its own password; it cannot assign a privileged role.

The seed creates five tailors and two example orders: one stitching and one ready for its final payment. Reseeding does not duplicate them or reset workflow/payment state. Seeded workshop address fields are refreshed to the current fictional fixtures. Changing `DEMO_PASSWORD` after seeding does not change existing password hashes.

### Production-mode local verification

```powershell
npm run build
npm start
```

Both development and production-mode local execution use `server.ts`, which hosts Next.js and Socket.io together. Do not replace this with `next start`: chat requires the custom server. Production-mode execution is still a **local demo**, not a deployment certification.

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
- JPEG, PNG, and WebP only; up to 5 MB per file, checked by MIME and file signature.
- Uploaded files use random storage keys outside `public/`; authenticated reads check owner/order access. Admin can read order references but not chat attachments.
- Remove unused wizard/chat attachments with their remove buttons. Attached order images are immutable. There is no background deletion of customer uploads.
- SQLite defaults to `prisma/dev.db`; private images default to `storage/uploads/`. Back up both together if keeping demo data. Neither belongs in version control.

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

`npm test` exercises money, persistent checkout, role boundaries, payment retry/idempotency/concurrency, shipment transitions, ledger reconciliation, and private text/image chat. It provisions a unique temporary SQLite database using the real migrations.

`npm run test:e2e` requires a current production build. It provisions another isolated temporary database and upload directory, launches the custom server on loopback port 3100, and tests browser signup/checkout, comparison/mobile layouts, real two-context Socket.io messaging, tailor production, admin dispatch, final payment, and access denials. A second batch restarts the server against the same test data and verifies persisted order, payments, chat, and private image bytes. Tests never change the normal demo database. The test server is stopped and temporary data removed on completion. Port 3100 must be free. Playwright failure traces and screenshots are under ignored `test-results/`.

The lockfile includes targeted `postcss` and `deepmerge-ts` overrides to avoid the advisories affecting the framework/tooling's transitive versions. Validate both migrations and the production build when changing them.

## MVP boundaries

Not ready for public hosting. SQLite and local files target one local server; Socket.io has no distributed adapter. Login throttling is process-local. There is no password recovery/email verification, public tailor onboarding, real payment provider, regulated escrow, carrier API, shipping quote/customs handling, refunds, cancellation, disputes, or real payout processing. Global locations and addresses are supported as text, but international fulfillment is manually simulated. Tailor ratings are curated seed values, not a review system.
