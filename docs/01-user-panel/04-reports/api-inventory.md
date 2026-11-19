# Module 4: Reports (API inventory)

These are the APIs behind the four reports. rsplay `@810884b`; paths relative to `src/`. All endpoints inject into the single RTK Query `apiSlice` (`store/api/apiSlice.ts`), which adds `authorization: Bearer <access token>` and retries once after `POST /auth/refresh` on a 401 (see [application architecture §2.3](../../00-overview/application-architecture.md#23-authentication-and-tokens)).

Response shapes come from the TypeScript types and the fields the pages read. They are not captured backend responses. Where the two disagree, both are listed.

## Summary

| # | Endpoint name | Request | Trigger | Frequency | Consumer |
|---|---|---|---|---|---|
| S1 | `getMyTransactions` | `GET /users/me/transactions` | `ON_MOUNT`, `ON_STATE_CHANGE` (context, search, page, size), `ON_INTERACTION` (Go, Reset) | Once per argument set | Account statement |
| S2 | `exportGameTransactions` (lazy) | `POST /users/transactions/export-userTransaction` (query params, no body) | `ON_INTERACTION` (CSV / PDF button) | Once per click | Account statement |
| S3 | `getBetHistory` | `GET /bet/history` | `ON_MOUNT`, `ON_STATE_CHANGE` (search, page, size), `ON_INTERACTION` (Go, Reset) | Once per argument set; dropped after a bet is placed (`BetPlace` tag) | Bet history (`PAST`); also `CurrentBets` and Unsettled bets (`CURRENT`) |
| S4 | `exportBetHistory` (lazy) | `POST /bet/export-history` (query params, no body) | `ON_INTERACTION` (CSV / PDF button) | Once per click | Bet history |
| S5 | `getProfitLoss` | `GET /bet/profit-loss` | `ON_MOUNT`, `ON_STATE_CHANGE` (page, size), `ON_INTERACTION` (Go, Reset) | **Two** subscriptions per visit; dropped after a bet is placed (`BetPlace` tag) | Profit & loss |
| S6 | `getCasinoRoundHistory` | `GET /casino/round/history` | `ON_MOUNT`, `ON_STATE_CHANGE` (page, size), `ON_INTERACTION` (Go, Reset) | Once per argument set | Casino bet history |

Every request adds `t=<Date.now()>` inside the query function, the deliberate cache-buster (Q-06). Because it is added there, it is not part of the RTK cache key. None of these endpoints is polled; see [polling-and-frequency.md](polling-and-frequency.md).

Common pagination object (`store/api/transactionApi.ts:21-26`, `betReportApi.ts:32-37`, `types/casino.ts:69-74`): `{ totalItems, currentPage, limit, totalPage }`. The pages read only `totalItems`.

Deferred, not documented here: `getExportReports` (`GET /exports/report/me`, Export report history), and the other report endpoints listed in [the module map](../overview.md#module-4-reports--statements).

---

## S1 `getMyTransactions`

| Item | Value |
|---|---|
| Definition | `store/api/transactionApi.ts:62-83` |
| Call | `pages/Reports/AccountStatement.tsx:45-52` |
| Cache tags | none |

**Request.** Only truthy values are added (`transactionApi.ts:65-75`), then `t` (`:80`).

| Param | Sent by the page | Notes |
|---|---|---|
| `page`, `limit` | yes | default 1, 25 |
| `fromDate`, `toDate` | yes | UTC ISO strings |
| `context` | when not ALL | one of `Won`, `Lost`, `Bonus`, `Rollback`, `Deposit`, `Withdrawal`, `CasinoBet`, `CasinoWin`, `CasinoBetRefund`, `CoinConversion` |
| `search` | when not empty | |
| `type`, `walletType`, `recordType` | **never** by this page | accepted by the query builder |

**Response** `TransactionsResponse` (`transactionApi.ts:28-31`): `{ data: Transaction[], pagination }`.

| `Transaction` field (`transactionApi.ts:3-19`) | Used by the page |
|---|---|
| `id` | row key |
| `amount` | Credit or Debit column |
| `type` | `credit` / `debit` (case-insensitive) chooses the column |
| `availableBalance` | Balance column; opening and closing balance (F1) |
| `timestamp` | Date column |
| `narration`, `context` | Description (`narration ?? context`) |
| `walletId`, `entityId`, `meta`, `nonce`, `status`, `remark`, `isCommissionSettled`, `currencyId` | not used |

**UI mapping:** [account statement](account-statement.md#table-columns).

## S2 `exportGameTransactions`

| Item | Value |
|---|---|
| Definition | `store/api/transactionApi.ts:85-111` (`build.query`, used through `useLazyExportGameTransactionsQuery`) |
| Call | `AccountStatement.tsx:54,97-112` |
| Response handling | `responseHandler: response.blob()`, `cache: 'no-cache'`; the page ignores the result |

**Request.** `POST` with everything in the query string, no body. The page sends `context` (if not ALL), `fromDate`, `toDate`, `search` (if not empty), `exportFormat` (`Csv` or `Pdf`; the type also allows `Excel`) and `fileName` (`account-statement-YYYYMMDD-HHmmss`). Accepted but not sent: `page`, `limit`, `type`, `walletType`, `searchByUserId`, `timezone` (Q-30: team-confirmed defect, `timezone` will be sent).

**Result.** Success → toast "Export started. Track its progress in Export Report History."; error → "Failed to export transactions". `INFERRED`: the backend queues a file that appears in `GET /exports/report/me`.

## S3 `getBetHistory`

| Item | Value |
|---|---|
| Definition | `store/api/betReportApi.ts:101-108` |
| Calls | `pages/Reports/BetHistory.tsx:35-46` (`betTime: 'PAST'`); also `components/common/CurrentBets.tsx:21-33` (`betTime: 'CURRENT'`, game detail) and `pages/Reports/UnsettledBet.tsx:35-43` (deferred) |
| Cache tags | provides `BetPlace`; `placeBet` invalidates `BetPlace` (`store/api/betPlaceApi.ts:19`) |

**Request.** `params: { ...params, t }`, so every argument is sent as given, including an empty `search=` (`betReportApi.ts:102-106`).

| Param (`BetHistoryParams`, `betReportApi.ts:73-82`) | Bet history page | `CurrentBets` |
|---|---|---|
| `betTime` | `PAST` | `CURRENT` |
| `page`, `limit` | page, 25/50/100 | 1, 10 |
| `fromDate`, `toDate` | applied range | yesterday start … today end (`getApiDate`) |
| `sport` | when not All (`Cricket`, `Soccer`, `Tennis`, `Greyhound`, `HorseRacing`) | — |
| `search` | always (may be empty) | — |
| `eventId` | — | the open event |

**Response.** Declared as `ProfitLossResponse` (`betReportApi.ts:25-30`): `{ success?, message?, bets?: ProfitLossItem[], pagination? }`. The declared item fields do not match what the page reads (F9):

| Field read by the bet history page | Declared in `ProfitLossItem`? |
|---|---|
| `id` | yes |
| `placedAt` | no |
| `competition`, `event.competition`, `event.name`, `sport` | no (`eventName` is declared instead) |
| `marketName` | yes |
| `selection` | yes |
| `betOn` | yes (`'BACK' \| 'LAY'`) |
| `line` | no |
| `odds`, `amount` | yes |
| `payout` | no. Net profit/loss of the bet (team-confirmed, Q-28) |
| `status` | no |

**UI mapping:** [bet history](bet-history.md#table-columns).

## S4 `exportBetHistory`

| Item | Value |
|---|---|
| Definition | `store/api/betReportApi.ts:119-145` (lazy query) |
| Call | `BetHistory.tsx:52,87-103` |
| Response handling | `response.blob()`, `cache: 'no-cache'`; ignored by the page |

**Request.** `POST` with query params only (truthy values, `betReportApi.ts:122-135`). The page sends `betTime=PAST`, `fromDate`, `toDate`, `sport` (if not All), `search` (if not empty), `exportFormat` (`Csv`/`Pdf`) and `fileName` (`bet-history-YYYYMMDD-HHmmss`). Accepted but not sent: `page`, `limit`, `status`, `eventId`, `timezone`.

**Result.** Toasts "Export started. Track its progress in Export Report History." or "Failed to export bet history".

## S5 `getProfitLoss`

| Item | Value |
|---|---|
| Definition | `store/api/betReportApi.ts:110-117` |
| Calls | `pages/Reports/BetProfitLoss.tsx:36-43` (table) and `:47-53` (header total) |
| Cache tags | provides `BetPlace` (see S3) |

**Request.** `params: { ...params, t }`.

| Param (`ProfitLossQueryParams`, `betReportApi.ts:64-71`) | Table call | Total call |
|---|---|---|
| `page`, `limit` | page, 25/50/100 | 1, 1 |
| `sport` | applied sport (`Cricket` default; `Soccer`, `Tennis`, `Greyhound`, `HorseRacing`, `Casino`) | `Cricket` (fixed) |
| `fromDate`, `toDate` | applied range | applied range |
| `search` | never (commented out) | — |

On first load both calls ask for Cricket with different `page`/`limit`, so they are two cache entries and two HTTP requests.

**Response** `BetProfitLossResponse` (`betReportApi.ts:55-62`):

| Field | Used for |
|---|---|
| `bets` | rows: `ProfitLossItem[]` for sports, `CasinoProfitLossItem[]` for `Casino` |
| `pagination.totalItems` | page count |
| `filteredProfitLoss` | Total row (table call) |
| `totalProfitLossAllSports` | "P&L" chip (total call only). All sports regardless of `sport`; team-confirmed (Q-29) |

Sport rows read `sport ?? sportName`, `marketName` and `payout ?? pl ?? amount`. Casino rows read `status`, `gameName`, `totalWins`, `totalBets`, `createdAt` (`CasinoProfitLossItem`, `betReportApi.ts:39-53`, also declares `id`, `gameId`, `roundId`, `txnId`, `userId`, `totalLosses`, `completed`, `updatedAt`).

**UI mapping:** [profit and loss](profit-and-loss.md).

## S6 `getCasinoRoundHistory`

| Item | Value |
|---|---|
| Definition | `store/api/casinoApi.ts:74-96` |
| Call | `pages/Reports/CasinoBetHistory.tsx:25-30` (also the unrouted `OLDCasinoBetHistory.tsx:21`) |
| Cache tags | none (`providesTags` is commented out, `casinoApi.ts:95`) |

**Request.** The query function builds the query string with `URLSearchParams`: `search`, `provider`, `status`, `fromDate`, `toDate` when truthy, then always `page` (default 1) and `limit` (default 10). `t` is added through `params` (`casinoApi.ts:78-93`). The page sends `page`, `limit`, `fromDate`, `toDate` only.

**Response.** Declared `CasinoRoundHistoryResponse` (`types/casino.ts:76-80`): `{ success, rounds: CasinoRound[], pagination }`.

| Field | Declared in `CasinoRound` (`types/casino.ts:57-67`)? | Read by the page |
|---|---|---|
| `id` | yes | "Bet ID" column, row key |
| `gameName` | no | Game Name |
| `gameId` | no | "Game Round ID" column (F8) |
| `txnId` | no | Transaction ID (copyable) |
| `totalBets`, `totalWins` | no | Bet Amount, P/L = `totalWins − totalBets` |
| `status` | yes | Bet Outcome badge |
| `createdAt` | no | Date/Time |
| `username`, `provider`, `game`, `betAmount`, `winAmount`, `startTime`, `endTime` | yes | not read |

**Backend response (team-provided, 2026-11-19, Q-26).** Sanitised; values are placeholders:

```json
{
  "success": true,
  "message": "Round history fetched successfully",
  "rounds": [
    {
      "id": 2, "gameId": 3026, "gameName": "<game name>",
      "roundId": "<uuid>", "txnId": "<uuid>", "userId": "<user id>",
      "status": "Lost", "exchangeRate": "1",
      "totalBets": "80", "totalWins": "0", "totalLosses": "0",
      "completed": false,
      "createdAt": "<ISO date>", "updatedAt": "<ISO date>",
      "isTurnOverCalculated": false, "isPlCalculated": true,
      "user": { "id": "<user id>", "username": "<username>" },
      "casinoGame": { "id": 3026, "name": "<game name>" }
    }
  ],
  "pagination": { "currentPage": 1, "totalPage": 1, "totalItems": 1, "limit": 10 }
}
```

Every field the page reads is present. Amounts are strings; the page converts them with `Number()`. `status` is capitalised (`Lost`); the badge lower-cases it before matching (`CasinoBetHistory.tsx:57-68`). `roundId`, `userId`, `exchangeRate`, `totalLosses`, `completed`, `updatedAt`, the two `is…Calculated` flags, `user` and `casinoGame` are not read. The declared `CasinoRound` type matches none of this beyond `id` and `status` (F9).

**Data safety.** No password, MFA or token fields are returned (team-confirmed, Q-26). See [casino bet history › data safety](casino-bet-history.md#data-safety-q-26).

**UI mapping:** [casino bet history](casino-bet-history.md#table-columns).
