# Admin Module A2: Dashboard (API inventory)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. Dashboard endpoints are defined in `store/api/dashboardApi.ts`, with types in `types/dashboard.ts`. Unlike most admin queries, **none of them adds `ts`**. Each one provides its own tag, which the page's Refresh button invalidates.

Response shapes come from the TypeScript types and the fields the page reads, not from captured responses. Every response type also has `success` and `message`, which the page does not read.

## Summary

| # | Name | Request | Parameters sent | When it runs | Repeats | Consumer |
|---|---|---|---|---|---|---|
| D1 | `getBalanceSummary` | `GET /dashboard/balance-summary` | none | page open, Refresh | once | `pages/dashboard/DashboardPage.tsx:93` |
| D2 | `getLiveGames` | `GET /dashboard/live-games[?sport=…]` | `sport` (omitted for All) | page open, sport change, Refresh | **every 60 s** | `components/common/InPlay.tsx:38-41` |
| D3 | `getUserManagement` | `GET /dashboard/user-management` | `fromDate`, `toDate` | page open, filter change, Refresh | once | `components/DashboardComponents/UserManagementMetrics.tsx:21-23` |
| D4 | `getGameAnalytics` | `GET /dashboard/game-analytics` | `fromDate`, `toDate`, `sport` (not for All) | page open, filter or sport change, Refresh | once | `DashboardPage.tsx:95-98` |
| D5 | `getCasinoAnalytics` | `GET /dashboard/casino-analytics` | `fromDate`, `toDate` | page open, filter change, Refresh | once | `DashboardPage.tsx:100-102` |
| D6 | `getBusinessAnalytics` | `GET /dashboard/business-analytics` | `fromDate`, `toDate` | same | once | `DashboardPage.tsx:104-106` |
| D7 | `getDeviceBreakdown` | `GET /dashboard/device-breakdown` | `fromDate`, `toDate` | same | once | `DashboardPage.tsx:122-124` |
| D8 | `getTopUsers` | `GET /dashboard/top-users` | `category` (`SPORTS`/`CASINO`), `fromDate`, `toDate` | same, category change | once | `DashboardPage.tsx:108-111` |
| D9 | `getTopCategories` | `GET /dashboard/top-categories` | `fromDate`, `toDate` | same | once | `DashboardPage.tsx:118-120` |
| D10 | `getTopPlUsers` | `GET /dashboard/top-pl-users` | `category` (`Sports`/`Casino`), `fromDate`, `toDate` | same, category change | once | `DashboardPage.tsx:113-116` |
| D11 | `getLoginSummary` | `GET /dashboard/login-summary` | `fromDate`, `toDate` | same | once | `DashboardPage.tsx:130-132` |
| D12 | `getBonusAnalytics` | `GET /dashboard/bonus-analytics` | `fromDate`, `toDate` | same (all roles) | once | `DashboardPage.tsx:126-128` |
| D13 | `getIsMasterOwner` | `GET /users/is/master-owner/user` | `ts` | page open | once | `DashboardPage.tsx:35`; canonical [A1 L17](../01-login-and-layout/api-inventory.md#l17-getismasterowner) |
| D14 | `getSystemSettings` | `GET /system` | `ts` | page open | once | `DashboardPage.tsx:36` |

`fromDate` / `toDate` are UTC ISO strings from `resolveDateRange` (`utils/helper.ts:242-257`). The default is start of (today − 6 days) to end of today. See [date filters](overview.md#date-filters-shared-pattern).

---

## D1 `getBalanceSummary`

`store/api/dashboardApi.ts:23-26`. Provides `BalanceSummary`. Response `BalanceSummaryResponse` (`types/dashboard.ts:6-18`):

| Field (`balanceSummary.*`) | Shown as |
|---|---|
| `totalBalance` | Total Balance |
| `totalDownlineBalance` | Balance Down |
| `availableBalance` | Available Credit |
| `playerBalance` | Player Balance |
| `playerExposure` | Net Exposure (red) |

## D2 `getLiveGames`

`dashboardApi.ts:118-124`. The URL is built by string: `/dashboard/live-games?sport=<value>` when a sport is chosen, so the value is not URL-encoded by RTK. Provides `LiveGames`. Response `LiveGamesResponse` (`types/dashboard.ts:248-252`) → `events: LiveGameEvent[]` (`:227-246`).

| Field read | Use |
|---|---|
| `id` | card key; link `/sport-analysis/event/{id}` |
| `sport` | card title; client filter drops `HorseRacing` and `GrayHound` |
| `competition.name` | sub-title |
| `runners[].runnerName`, `runners[].selectionId` | runner rows |
| `runners[i].backPrice1`, `layPrice1` (i = 0, 2, 1) | three odds pairs |
| `exposures[].selectionId`, `exposures[].totalExposure` | platform position per runner, sign flipped |
| not read | `externalId`, `startTime`, `status`, `inplay`, `isFancy`, `isBookmaker`, `isPremiumFancy`, `isPopular`, `marketId`, `marketExternalId`, `runners[].back/lay` arrays |

## D3 `getUserManagement`

`dashboardApi.ts:28-35`. Provides `UserManagement`. Response `userManagement` (`types/dashboard.ts:20-30`): `admin`, `superMaster`, `subSuperMaster`, `master`, `user`, `newUser`, `activeUser`, `idleUser` (all shown, filtered by role), plus `superAdmin` (not shown).

## D4 `getGameAnalytics`

`dashboardApi.ts:37-44`. Provides `GameAnalytics`. `sport` values sent: `Cricket`, `Soccer`, `Tennis`, `Greyhound`, `HorseRacing`. Response `gameAnalytics` (`types/dashboard.ts:43-50`): `betCount`, `stake`, `settleBet`, `unsettleBet`, `profitLoss` ("User P/L"), `platformProfitLoss` ("Platform PL").

## D5 `getCasinoAnalytics`

`dashboardApi.ts:46-53`. Provides `CasinoAnalytics`. The response key is **`gameAnalytics`** (`types/dashboard.ts:69-73`), with fields `betCount`, `stake`, `profitLoss` ("User Winning"), `rollbackAmount`, `platformProfitLoss`, and, shown to the Owner only, `assignedCredit` and `remainingCredit` (`:59-67`).

## D6 `getBusinessAnalytics`

`dashboardApi.ts:55-62`. Provides `BusinessAnalytics`. Response `businessAnalytics` (`types/dashboard.ts:76-84`): `firstDepositAmount`, `refillDepositAmount`, `firstDepositsUsers`, `refillDepositsUsers`, `totalWithdrawsUsers`, `totalDeposits`, `totalWithdraws`.

## D7 `getDeviceBreakdown`

`dashboardApi.ts:91-98`. Provides `DeviceBreakdown`. Response `deviceBreakdown: { device, count }[]` (`types/dashboard.ts:145-154`). `count` is a string and is converted with `Number()`.

## D8 `getTopUsers`

`dashboardApi.ts:64-71`. Provides `TopUsers`. Response `topUsers: { userId, username, totalBets, profitLoss }[]` (`types/dashboard.ts:97-108`). `totalBets` and `profitLoss` are strings.

## D9 `getTopCategories`

`dashboardApi.ts:82-89`. Provides `TopCategories`. Response `topCategories: { category, matchCount (string|null), totalBets, profitLoss }[]` (`types/dashboard.ts:131-142`).

## D10 `getTopPlUsers`

`dashboardApi.ts:73-80`. Provides `TopPlUsers`. Response `topUsers: { topWinners: TopPlUser[], topLosers: TopPlUser[] }`, where `TopPlUser = { id, username, totalPl }` (`types/dashboard.ts:115-128`).

## D11 `getLoginSummary`

`dashboardApi.ts:109-116`. Provides `LoginSummary`. Response `loginSummary` (`types/dashboard.ts:170-180`): shown are `admin`, `superMaster`, `subSuperMaster`, `master`, `user`; not shown are `whitelabel`, `subAdmin`, `superAdmin`, `affiliate`.

## D12 `getBonusAnalytics`

`dashboardApi.ts:100-107`. Provides `BonusAnalytics`. Response `bonusAnalytics` (`types/dashboard.ts:157-167`): `totalBonusAmount`, `uniqueApplicants`, `activeBonusCount`. Requested for every role, displayed for the Owner only.

## D14 `getSystemSettings`

`store/api/systemSettingApi.ts:11-20`. `GET /system?ts=<now>`, provides `SystemSettings`. The dashboard reads only `masteranalytics.selection`, which decides whether a master-owner account sees Game and Casino analytics (`DashboardPage.tsx:36-39`). The User Panel calls the same path for other settings ([User Panel Module 1 R9](../../01-user-panel/01-home-page/api-inventory.md#r9-getsystemsettings-canonical)). Whether the response is the same object is `INFERRED (shared backend template)`.

## Not used by the Dashboard

`components/common/BalanceSummary.tsx` (a different five-figure strip) is **not** used on the Dashboard. It is used on the Downline pages with `GET /users/summary` ([A3 DL2](../03-downline/api-inventory.md#dl2-getsummary)). `components/ui/DashBoardCards.tsx` is imported by no file at HEAD.
