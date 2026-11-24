# Admin Module A2: Dashboard (polling and frequency)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`.

Only **one** dashboard request repeats on a timer: Live Events every 60 s. Everything else runs when the page opens, when a card's filter changes, or when Refresh is pressed. The layout's own polls (unread notifications 10 s, profile 20 s, wallet 20 s) also run on this page. See [A1 polling](../01-login-and-layout/polling-and-frequency.md).

## Repeating

| Request | Repeats | Why (from the code) | Source |
|---|---|---|---|
| `GET /dashboard/live-games[?sport=…]` | every **60 s** while the dashboard is open | Keeps the live-event cards' odds and platform positions current | `components/common/InPlay.tsx:38-41` |

Changing the sport creates a new cache entry with its own 60 s poll. The old entry stops, because `keepUnusedDataFor` is `0` (`store/api/apiSlice.ts:41`).

## When each request runs

| Request | Page open | Card filter change | Other | Refresh button |
|---|---|---|---|---|
| `balance-summary` | ✓ | — (no filter) | — | ✓ |
| `live-games` | ✓ | sport dropdown | 60 s poll | ✓ |
| `user-management` | ✓ | its date filter | — | ✓ |
| `game-analytics` | ✓ | its date filter; Game dropdown | — | ✓ |
| `casino-analytics` | ✓ | its date filter | — | ✓ |
| `business-analytics` | ✓ | its date filter | — | ✓ |
| `device-breakdown` | ✓ | its date filter | — | ✓ |
| `top-users` | ✓ | its date filter; Category dropdown | — | ✓ |
| `top-categories` | ✓ | its date filter | — | ✓ |
| `top-pl-users` | ✓ | its date filter; Category dropdown | — | ✓ |
| `login-summary` | ✓ | its date filter | — | ✓ |
| `bonus-analytics` | ✓ (every role) | its date filter (Owner only, since only the Owner sees the card) | — | ✓ |
| `/users/is/master-owner/user` | ✓ | — | — | — |
| `/system` | ✓ | — | — | — |

Sources: queries at `pages/dashboard/DashboardPage.tsx:35-36,93-132`, `UserManagementMetrics.tsx:21-23`, `InPlay.tsx:38-41`; Refresh at `DashboardPage.tsx:192-210`.

A CustomRange pick sends a request as soon as the date changes. Picking a start date and then an end date can therefore send **two** requests for that card (`components/common/DropdownWithDate.tsx:112-119`, `INFERRED` from the picker's change events).

## Cache behaviour

- `refetchOnMountOrArgChange: true` and `keepUnusedDataFor: 0` (`apiSlice.ts:40-41`): every visit to the dashboard sends all 14 requests again, even right after leaving it.
- Dashboard queries have no `ts` parameter. Their cache key is the date range plus the filters. `resolveDateRange` rounds to start and end of day, so the key is stable within a day.
- No mutation in this module invalidates dashboard tags. Only the Refresh button does.

## Request volume

| Action | Requests |
|---|---|
| Open the dashboard | 14 (plus the layout's 7 on a fresh load) |
| Each minute while open | 1 live-games, plus the layout's 12 |
| Press Refresh | 12 (every dashboard tag) |
| Change one card's date filter | 1 |
