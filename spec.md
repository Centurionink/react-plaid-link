# Spec: ACH Payments & Remittances Extension

Extends `examples/oauth-app/` with full ACH payment and remittance flows using Plaid Link,
a Vite mock server, and a SQLite database for transfer state.

Both `centurion.ink` and `bsia.space` are supported as OAuth redirect URIs.

---

## Problem Statement

The existing `examples/oauth-app/` demonstrates OAuth-based Plaid Link initialization but
stops at bank account connection. This spec extends it into a complete ACH payment and
remittance application covering:

- Bank account verification via Instant Auth
- ACH debit (pull funds from user)
- ACH credit (push funds to user)
- Plaid Transfer API (hosted transfer product)
- Payment confirmation UI (receipt after transfer initiates)
- International remittance flow
- Remittance data (memo/reference on transfers)
- Remittance history with status tracking (SQLite-backed)

---

## Domain Configuration

Both domains must be added to `vite.config.ts` `server.allowedHosts` and referenced as
valid `receivedRedirectUri` bases:

- `https://centurion.ink` (existing)
- `https://bsia.space` (new)

The active redirect base is determined at runtime from `window.location.hostname`:

```ts
const REDIRECT_BASE = window.location.hostname.includes('bsia.space')
  ? 'https://bsia.space'
  : 'https://centurion.ink';
```

Both domains must be registered in the Plaid Dashboard under allowed redirect URIs.

---

## Architecture

```
examples/oauth-app/
  vite.config.ts          # proxy + mock handlers + allowedHosts for both domains
  server/
    index.ts              # Express server (real Plaid API when env vars set)
    db.ts                 # SQLite setup via better-sqlite3
    routes/
      linkToken.ts        # POST /api/create_link_token
      exchangeToken.ts    # POST /api/exchange_token
      transfer.ts         # POST /api/transfer/debit, /api/transfer/credit
      plaidTransfer.ts    # POST /api/plaid_transfer (Plaid Transfer API)
      remittance.ts       # POST /api/remittance, GET /api/remittance/history
  src/
    App.tsx               # Tab shell: Auth | Debit | Credit | Transfer | Remittance
    types.ts              # Shared frontend types
    tabs/
      AuthTab.tsx         # Plaid Link Instant Auth flow
      DebitTab.tsx        # ACH pull (debit) form + status
      CreditTab.tsx       # ACH push (credit) form + status
      TransferTab.tsx     # Plaid Transfer API flow
      RemittanceTab.tsx   # International remittance + history
    components/
      LogPanel.tsx        # (moved from src/, unchanged)
      ReceiptPanel.tsx    # Payment confirmation / receipt display
      HistoryTable.tsx    # Remittance history list with status badges
```

---

## Backend: Vite Mock Server + Express

### Mock mode (default)

When `PLAID_CLIENT_ID` is not set, Vite plugin middleware intercepts all `/api/*` requests
and returns realistic mock responses directly in `vite.config.ts`.

Mock responses:

| Endpoint | Mock response |
|---|---|
| `POST /api/create_link_token` | `{ link_token: 'mock-link-token-...' }` |
| `POST /api/exchange_token` | `{ access_token: 'mock-access-...', item_id: 'mock-item-...' }` |
| `POST /api/transfer/debit` | `{ transfer_id: 'mock-debit-...', status: 'pending' }` |
| `POST /api/transfer/credit` | `{ transfer_id: 'mock-credit-...', status: 'pending' }` |
| `POST /api/plaid_transfer` | `{ transfer_id: 'mock-plaid-...', status: 'pending' }` |
| `POST /api/remittance` | `{ remittance_id: 'mock-rem-...', status: 'pending' }` |
| `GET /api/remittance/history` | Array of mock remittance records |

### Real mode

When `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV` are set, Vite proxies `/api/*`
to the Express server at `http://localhost:3001`. Run the server with:

```
PLAID_CLIENT_ID=xxx PLAID_SECRET=yyy PLAID_ENV=sandbox npx ts-node server/index.ts
```

### Database (SQLite via better-sqlite3)

Schema — `transfers` table:

| column | type | notes |
|---|---|---|
| id | TEXT PRIMARY KEY | UUID |
| type | TEXT | `'debit'` / `'credit'` / `'plaid_transfer'` / `'remittance'` |
| amount | REAL | in source currency |
| currency | TEXT | ISO 4217 (e.g. `'USD'`, `'EUR'`) |
| status | TEXT | `'pending'` / `'posted'` / `'settled'` / `'failed'` / `'cancelled'` |
| memo | TEXT | optional reference / remittance data |
| recipient_name | TEXT | for remittance flows |
| recipient_country | TEXT | ISO 3166-1 alpha-2 |
| access_token | TEXT | Plaid access token for the linked account |
| plaid_transfer_id | TEXT | Plaid-assigned transfer ID |
| created_at | TEXT | ISO 8601 |
| updated_at | TEXT | ISO 8601 |

DB file: `server/data/transfers.db` (gitignored).

---

## Frontend Flows

### Tab Shell (`App.tsx`)

Replace the current single-flow `App.tsx` with a tabbed layout:

```
[ Auth ] [ Debit ] [ Credit ] [ Transfer ] [ Remittance ]
```

- Active tab rendered below the tab bar
- `LogPanel` rendered at the bottom of every tab (shared `usePlaidLinkLog` instance)
- Header shows active domain resolved from `window.location.hostname`
- `LinkedAccount` state lifted to `App.tsx` and passed down to tabs that require it

---

### Tab 1: Auth (`AuthTab.tsx`)

Verify a bank account via Plaid Link Instant Auth and store the access token.

Flow:
1. "Connect bank account" button triggers `usePlaidLinkLog` with `products: ['auth']`
2. On `onSuccess`: POST `public_token` to `/api/exchange_token`, store `access_token` in state and `sessionStorage`
3. Show connected account details from `onSuccess` metadata
4. "Disconnect" button clears state

Acceptance criteria:
- Button disabled until `ready === true`
- Connected state persists across tab switches within the session
- Displays: institution name, account name, account mask

---

### Tab 2: Debit (`DebitTab.tsx`)

Initiate an ACH pull (debit) from the linked account.

Flow:
1. Requires Auth tab completed — shows prompt if not
2. Form: Amount (USD), Memo (optional)
3. Submit → POST `/api/transfer/debit` with `{ access_token, amount, memo }`
4. On success: render `ReceiptPanel`
5. Transfer saved to SQLite

Acceptance criteria:
- Amount: positive number, max 2 decimal places, min $0.01
- Submit disabled while request in flight
- Error message shown on API failure
- Receipt: transfer ID, type "ACH Debit", amount, status badge, `created_at`

---

### Tab 3: Credit (`CreditTab.tsx`)

Initiate an ACH push (credit) to the linked account.

Flow:
1. Requires Auth tab completed
2. Form: Amount (USD), Memo (optional)
3. Submit → POST `/api/transfer/credit` with `{ access_token, amount, memo }`
4. On success: render `ReceiptPanel`
5. Transfer saved to SQLite

Acceptance criteria:
- Same validation as Debit tab
- Receipt: transfer ID, type "ACH Credit", amount, status badge, `created_at`

---

### Tab 4: Transfer (`TransferTab.tsx`)

Initiate a transfer via Plaid's hosted Transfer API product.

Flow:
1. Requires Auth tab completed
2. Form: Amount (USD), Transfer type toggle (debit / credit), Description
3. Submit → POST `/api/plaid_transfer`
4. On success: render `ReceiptPanel`
5. Transfer saved to SQLite

Acceptance criteria:
- Transfer type toggle defaults to "debit"
- Receipt: Plaid transfer ID, type, amount, status, authorization ID if present

---

### Tab 5: Remittance (`RemittanceTab.tsx`)

International remittance — send money cross-border with memo/reference data and view history.

Flow:
1. Requires Auth tab completed
2. Form fields:
   - Amount
   - Currency (dropdown: USD, EUR, GBP, MXN, PHP, INR, NGN — minimum 7)
   - Recipient name
   - Recipient country (ISO country dropdown, minimum 20 common remittance destinations)
   - Memo / reference number (optional)
3. Submit → POST `/api/remittance`
4. On success: render `ReceiptPanel` with remittance-specific fields
5. `HistoryTable` below the form — auto-refreshes after each submission
6. History fetched from GET `/api/remittance/history`

Acceptance criteria:
- Currency dropdown: USD, EUR, GBP, MXN, PHP, INR, NGN (minimum)
- Country dropdown: minimum 20 common remittance destinations
- History table columns: Date, Recipient, Amount, Currency, Country, Memo, Status
- Status badge colors: pending=yellow, posted=blue, settled=green, failed=red, cancelled=grey
- Empty state shown when no history

---

## Shared Components

### `ReceiptPanel.tsx`

```ts
interface ReceiptPanelProps {
  transferId: string;
  type: 'debit' | 'credit' | 'plaid_transfer' | 'remittance';
  amount: number;
  currency: string;
  status: string;
  memo?: string;
  recipientName?: string;
  recipientCountry?: string;
  createdAt: string;
  onDismiss: () => void;
}
```

### `HistoryTable.tsx`

```ts
interface HistoryTableProps {
  records: TransferRecord[];
  loading: boolean;
}
```

---

## Shared Types (`src/types.ts`)

```ts
export interface TransferRecord {
  id: string;
  type: 'debit' | 'credit' | 'plaid_transfer' | 'remittance';
  amount: number;
  currency: string;
  status: 'pending' | 'posted' | 'settled' | 'failed' | 'cancelled';
  memo?: string;
  recipient_name?: string;
  recipient_country?: string;
  plaid_transfer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LinkedAccount {
  access_token: string;
  institution_name: string;
  account_name: string;
  account_mask: string;
}
```

---

## New Dependencies (`examples/oauth-app/package.json`)

| Package | Purpose |
|---|---|
| `better-sqlite3` | SQLite driver |
| `@types/better-sqlite3` | TypeScript types |
| `express` | Real Plaid API server |
| `@types/express` | TypeScript types |
| `ts-node` | Run Express server without pre-compiling |
| `uuid` | Generate transfer IDs |
| `@types/uuid` | TypeScript types |

---

## Acceptance Criteria (top-level)

- `bsia.space` added to `allowedHosts`; `REDIRECT_BASE` resolves dynamically from hostname
- App runs with `yarn dev` in mock mode with no environment variables required
- All 5 tabs render without errors
- Auth tab completes Plaid Link flow and stores access token in `sessionStorage`
- Debit and Credit tabs require Auth and POST to `/api/transfer/*`
- Transfer tab uses `/api/plaid_transfer`
- Remittance tab submits with currency/country/memo and shows SQLite-backed history
- `ReceiptPanel` renders after every successful transfer
- `HistoryTable` shows all remittance records with color-coded status badges
- `tsc --noEmit` passes in `examples/oauth-app/`
- `make test` and `make lint` pass in repo root

---

## Implementation Order

1. Add `bsia.space` to `vite.config.ts` `allowedHosts`
2. Add new dependencies to `package.json` and install
3. Create `server/db.ts` — SQLite init, schema, typed query helpers
4. Create `server/routes/linkToken.ts`
5. Create `server/routes/exchangeToken.ts`
6. Create `server/routes/transfer.ts` — debit + credit routes
7. Create `server/routes/plaidTransfer.ts`
8. Create `server/routes/remittance.ts` — create + history routes
9. Create `server/index.ts` — Express app wiring all routes
10. Update `vite.config.ts` — mock middleware + conditional proxy
11. Create `src/types.ts`
12. Move `src/LogPanel.tsx` → `src/components/LogPanel.tsx`, update imports
13. Create `src/components/ReceiptPanel.tsx`
14. Create `src/components/HistoryTable.tsx`
15. Create `src/tabs/AuthTab.tsx`
16. Create `src/tabs/DebitTab.tsx`
17. Create `src/tabs/CreditTab.tsx`
18. Create `src/tabs/TransferTab.tsx`
19. Create `src/tabs/RemittanceTab.tsx`
20. Refactor `src/App.tsx` — tab shell, dynamic redirect base, shared log
21. Run `tsc --noEmit` in `examples/oauth-app/` — fix any errors
22. Run `make test` and `make lint` in repo root — verify no regressions
