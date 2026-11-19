# Module 4: Casino bet history

Route `/casino-bet-history` → `pages/Reports/CasinoBetHistory.tsx` (`CasinoBetHistory`). rsplay `@810884b`; paths relative to `src/`. Shared date, Go/Reset and paging behaviour: [overview](overview.md#the-shared-page-pattern). This page has **no search, no status filter and no export**.

API: [S6 `getCasinoRoundHistory`](api-inventory.md#s6-getcasinoroundhistory).

## Filters and the request

| Filter | Sent as | When |
|---|---|---|
| From / To (default display `now − 7 days` / `now`; applied start of that day / end of today) | `fromDate`, `toDate` (UTC ISO) | On Go or Reset |
| Page, size (25/50/100) | `page`, `limit` | On change |

Query call: `CasinoBetHistory.tsx:25-30`. The endpoint also accepts `search`, `provider` and `status` (`store/api/casinoApi.ts:78-85`), but this page never sends them.

Example request (sanitised):

```http
GET /casino/round/history?fromDate=2026-11-11T18:30:00.000Z&toDate=2026-11-19T18:29:59.999Z&page=1&limit=25&t=1763540000000
Authorization: Bearer <access-token>
```

## Table columns

Rows are `data.rounds`, read as `any` (`CasinoBetHistory.tsx:32`). Mapping at `CasinoBetHistory.tsx:175-243`:

| Column label | Field actually shown | Display |
|---|---|---|
| Game Name | `gameName` | truncated at 140 px, full name in `title` tooltip |
| Game Round ID | **`gameId`** | (F8) |
| Transaction ID | `txnId` | truncated, with a copy button → "Copied to clipboard!" |
| Bet ID | **`id`** (the round record id) | (F8) |
| Bet Amount | `totalBets` | 2 decimals |
| P/L | `totalWins − totalBets` | see below |
| Bet Outcome | `status` | upper-cased badge: green `won`, red `lost`, yellow `pending`, grey otherwise (`CasinoBetHistory.tsx:57-68`) |
| Date/Time | `createdAt` | `DD MMM YYYY, hh:mm A`, browser time zone |

The labels "Game Round ID" and "Bet ID" do not match the fields shown. The record also has a `roundId` (declared in `CasinoProfitLossItem`, `betReportApi.ts:43`), which is not displayed.

## P/L formula

`CasinoBetHistory.tsx:176`:

```ts
const pl = Number(round?.totalWins ?? 0) - Number(round?.totalBets ?? 0);
```

| Case | Shown |
|---|---|
| `pl > 0` | value to 2 decimals, green |
| `pl < 0` | value to 2 decimals, red |
| `pl === 0` | `-` (a break-even round and a round with no amounts look the same) |

This is computed in the browser (F7). There is no total row on this page.

## Data safety (Q-26)

`OBSERVED`: rsplay's `CasinoRound` type (`types/casino.ts:57-67`) declares only `id`, `username`, `provider`, `game`, `status`, `betAmount`, `winAmount`, `startTime`, `endTime`. It has no password, MFA or token fields, and the page reads only the fields in the table above. Another implementation's type for the same endpoint declares such fields. **Resolved (Q-26, 2026-11-19):** the team provided the backend response; it has no secret fields, and `user` carries only `id` and `username`. See [S6 › backend response](api-inventory.md#s6-getcasinoroundhistory).
