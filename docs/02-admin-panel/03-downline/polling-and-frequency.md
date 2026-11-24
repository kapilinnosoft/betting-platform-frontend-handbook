# Admin Module A3: Downline (polling and frequency)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`.

**Nothing in Downline polls.** No Downline query sets `pollingInterval`, and the pages use no `setInterval` or socket (`OBSERVED`, search at HEAD). Data changes when the page opens, when a filter or page changes, when Refresh is pressed, or when a mutation invalidates `Members`. The layout's polls still run on these pages ([A1](../01-login-and-layout/polling-and-frequency.md)).

## When each request runs

| Request | When it runs | Source |
|---|---|---|
| `GET users/me/sub-users` (level list) | open; search 500 ms after typing stops; status change; date Apply; page or size change; Refresh (after 500 ms); any mutation that invalidates `Members` | `AllDownlineListing.tsx:91-116`; `Downline.tsx` |
| `GET /users/summary` | open of a level list or drill-down; after a **deposit** (tag `BalanceSummaryDataApi`) | `AllDownlineListing.tsx:75`; `SubUsers.tsx:51`; `commonApi.ts:105` |
| `GET /users/sub-users/{id}` | open; tab change; search (500 ms debounce); status; Apply; page; Refresh | `SubUsers.tsx:97-108,699-706` |
| `GET users/me/sub-users?settlement=true` | open; **every keystroke** in search; page or size change; after a settlement | `Settlement/useSettlementHook.ts:29-39` |
| `GET /users/me/wallets` (Settlement popup) | the page opens (both popups are mounted at once); then it shares the layout's 20 s poll | `Settlement/modal/SettlementModal.tsx:32` |
| `GET /sports-permission/{id}` | Sport Permission modal opened | `Modal/SportPermission.tsx:23` |
| `GET /users/account/summary/{id}/{path}` | Account Summary opened | `AccountDetails/AccountSummary.tsx:77` |
| Account-details tab queries (DL16–DL24) | tab opened; filter, Apply or page change; Refresh icon | [account details](account-details.md) |
| Mutations (DL4–DL12, DL15, DL25, exports) | on submit only | [member actions](member-actions.md) |

## Cache rules that matter here

- `refetchOnMountOrArgChange: true` and `keepUnusedDataFor: 0` (`store/api/apiSlice.ts:40-41`): going back to a list always refetches it.
- `ts: Date.now()` is added inside each query function, so it is not part of the cache key. Identical filters reuse the same entry while it is mounted.
- Mutations that invalidate `Members` (create, deposit, withdraw, coin, sport permission, status, user access, settlement) refetch every mounted list query that provides `Members`: `getMembers`, and `getLoginHistory` on Activity Log. `getSubMembers` provides **no** tag, but no mutation can run on the drill-down page anyway.
- Withdraw does not invalidate `BalanceSummaryDataApi`, so the balance strip keeps the old totals after a withdraw until the page is opened again.

## Request volume

| Action | Requests |
|---|---|
| Open a level list | 2 (`sub-users`, `summary`) |
| Open a drill-down list | 2 (`sub-users/{id}`, `summary`) |
| Deposit from a level list | 1 mutation + 2 refetches (`sub-users`, `summary`) + 1 wallet refetch |
| Type "agent" in Settlement search | 5 list requests (no debounce) |
| Open Account Summary | 1 |
