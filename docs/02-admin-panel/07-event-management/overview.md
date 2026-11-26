# Admin Module A7: Event Management

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. User-side references are `rsplay/rsplay-user@7a89e53` unless marked otherwise.

Event Management controls which matches and markets players can see and bet on, and the limits that apply to each bet. **Every change here affects the User Panel**, so this module records what each switch does on the user side. The admin code shows the requests; the user-side effect is either seen in the user app's code (`OBSERVED`), stated by the team (team, 2026-11-26), or deduced (`INFERRED`).

| Page | Route | Menu | Detail |
|---|---|---|---|
| Events | `/event-management/:status?` | Event Management ▸ Events | [below](#events) |
| Fixtures | `/fixtures` | Event Management ▸ Fixtures | [below](#fixtures) |
| Bet Config | `/bet-setting` (page title "Default Setting") | Event Management ▸ Bet Config | [bet-config.md](bet-config.md) |

APIs: [api-inventory.md](api-inventory.md). Request timing: [polling-and-frequency.md](polling-and-frequency.md).

## Who can open it

| Rule | Detail | Source |
|---|---|---|
| Intended | **Owner only** (team, 2026-11-26) | — |
| Route | All three routes sit under `ModuleRoute moduleName="EventManagement"` and `ownerOnly(...)`. `ownerOnly` allows the Owner **and role users** (custom roles), so a role user with `EventManagement` access can open the pages ([F1](#findings), Q-67) | `App.tsx:92-96 (ownerOnly)`, `:246-250` |
| Menu | One group, children Events, Fixtures, Bet Config, `permissionKey: 'EventManagement'`. Not in the agents' menu | `components/common/EnhancedSidebar.tsx:350-361`; [A1 sidebar](../01-login-and-layout/sidebar.md) |
| Changing anything | Every switch, checkbox and button is disabled unless `hasModuleAccess('EventManagement', 'update')`. That is always true for the Owner; role users need the `update` flag | `pages/EventManagement/hooks/useEventManagement.ts:19-20`; `hooks/useFixtures.ts:11-12`; `BetSetting.tsx:12-13`; `context/PermissionContext.tsx:43-49 (hasModuleAccess)` |

## What each control does on the User Panel

This is the summary for anyone changing a setting. Details follow in each page's section.

| Admin control | Request | Effect on the User Panel | Label |
|---|---|---|---|
| Fixtures ▸ **On/Off** switch Off | `PATCH /fixture/status` `{ eventIds, status: "Inactive" }` | The match is hidden from the User Panel lists. Switching it On shows it again. The user lists ask for `status=ACTIVE` ([Module 2](../../01-user-panel/02-inplay/api-inventory.md)) | Team, 2026-11-26; request `OBSERVED` |
| Fixtures ▸ **Close** | `PATCH /fixture/status` `{ eventIds, status: "Closed" }` | The match is removed from the User Panel and from the admin Fixtures list. Used for events or leagues that do not close automatically. **Cannot be undone.** A user who has the event page open is sent to Bet History 1 s after the catalogue reports `closed` | Team; redirect `OBSERVED` (`rsplay-user:src/pages/GameDetails/Hooks/useCatalogData.ts:118-124`) |
| Bets on a closed event | — | Close does not settle bets. If bets are still open, the Owner settles or voids them separately | Team, 2026-11-26 |
| Events ▸ **Status** switch, or **Activate/Deactivate selected** | `PATCH /events/:eventId` or `PATCH /events/multiple/status` | Whether this is the same flag as the Fixtures switch is not confirmed ([F2](#findings), Q-66) | `BACKEND CONFIRMATION REQUIRED` |
| Events ▸ **Inplay** checkbox | `PATCH /events/inplay/:eventId` | Overrides the feed's in-play flag. The in-play or off-play stake limits apply according to this flag. The User Panel In-Play list asks for `inplay=true`, so the match is expected to move in or out of that list | Team (override, limits); list `INFERRED` |
| Events ▸ **BS** (bet suspended) | `PATCH /events/bet-suspended/:eventId` `{ status: "SUSPENDED" }` | The user still sees the match and its odds; there is **no** suspended overlay. When the user places a bet, the backend rejects it with "Bet not allowed", which the bet slip shows as an error toast | Team; toast `OBSERVED` (`rsplay-user:src/hooks/useBetSlip.ts:63-64`) |
| Events ▸ market switch Off (expanded row) | `PATCH /market/status/:marketId` `{ status: "INACTIVE" }` | The backend stops sending that market or session, so it disappears from the event page at the next catalogue poll (1 s in-play, 2 s otherwise) | Team; poll `OBSERVED` (`useCatalogData.ts:30-33,111-113`) |
| Bet Config ▸ Update | `PUT /betconfig/dynamic` | Bets placed afterwards must fall inside the stake range (in-play or off-play) and the odds range, and wait for the bet delay. Event-level settings win over the sport default | Team; see [bet-config.md](bet-config.md#what-the-user-panel-sees) |
| Mark event popular | `PATCH /events/popular/:eventId` | Not called by any page at this commit; kept for future use. A user app with a popular-events section reads `GET events/popular` ([Module 1 V7](../../01-user-panel/01-home-page/api-inventory.md)); the primary user app has no such section | Team; `OBSERVED` |

## Events

`/event-management/:status?` (`EventManagement.tsx`, `hooks/useEventManagement.ts`).

### Tabs and filters

| Control | Values | Sent to `GET /events` | Source |
|---|---|---|---|
| Tab (route parameter) | **InActive Matches** (`/event-management` or `/import`), **InPlay** (`/inplay`), **Upcoming** (`/upcoming`) | `status=INACTIVE`, `ACTIVE` or `UPCOMING`; `inplay=true` only on InPlay | `constants.ts:5-9`; `utils.ts:13-17 (getGameStatus)`; `useEventManagement.ts:22-24,39-46` |
| Game | Cricket (default), Soccer, Tennis, Grey hound, Horse Racing | `sport` = `Cricket`, `Soccer`, `Tennis`, `Greyhound`, `HorseRacing` | `constants.ts:11`; `utils/constent.ts:339-350 (getSportValue)` |
| Search | Header search box, 500 ms debounce, resets to page 1 | `search` (omitted when empty) | `components/common/Header.tsx:215-220`; `hooks/debounce.tsx:3` |
| Page, page size | 10 (default), 25, 50, 100 | `page`, `limit` (server-side paging, total from `pagination.totalItems`) | `constants.ts:13`; `useEventManagement.ts:162` |
| Refresh | Clears the selection and refetches after 500 ms | — | `useEventManagement.ts:123-129` |

Changing the tab clears the selection and goes to page 1. Changing the game goes to page 1 but keeps the selection ([F5](#findings)).

### Columns

| Column | Shows | Action | Source |
|---|---|---|---|
| Checkbox | Row selection; header box selects every row on the current page | — | `components/eventColumns.tsx:35-55`; `useEventManagement.ts:88-100` |
| S. No. | Running number across pages | — | `eventColumns.tsx:56-64` |
| Market Info | Event name and `[competition name]`; the row expands to list its markets ([below](#markets-of-an-event)) | — | `eventColumns.tsx:66-77`; `EventManagement.tsx:110-117` |
| Status | Switch, on when `status !== 'Inactive'` | On → `ACTIVE`, Off → `INACTIVE` (`PATCH /events/:eventId`), toast "Status Update Successfully" | `eventColumns.tsx:79-91`; `useEventManagement.ts:69-76` |
| Inplay | Checkbox, ticked when `inplay` is true | Sends the **opposite** of the current value: ticked → `INACTIVE`, unticked → `ACTIVE` (`PATCH /events/inplay/:eventId`), toast "Inplay Update Successfully" | `eventColumns.tsx:93-109`; `useEventManagement.ts:60-67` |
| Time | `startTime` as `DD MMM YYYY h:mm A` | — | `eventColumns.tsx:111-118` |
| User Played | `userOnline` | — | `eventColumns.tsx:120-123` |
| No of bets | `totalBets` | — | `eventColumns.tsx:125-128` |
| Bet Config | Button | Opens the event-level bet settings ([bet-config.md › event level](bet-config.md#event-level-settings)) | `eventColumns.tsx:130-141`; `useEventManagement.ts:147-150` |
| Actions | **BS** button, red when `isBetSuspended`, blue otherwise | Opens the bet-suspend confirmation ([below](#bet-suspended-bs)) | `eventColumns.tsx:143-175` |

The Status switch, Inplay checkbox and market switches act on click, with no confirmation ([F6](#findings)).

### Activate or deactivate several events

The toggle next to the tabs is labelled **Activate selected** on InActive Matches and **Deactivate selected** on InPlay and Upcoming (`EventManagement.tsx:86-94`).

1. With no row selected, it shows "Please select at least one event" and sends nothing.
2. Otherwise it sends `PATCH /events/multiple/status` with `{ status: "ACTIVE" | "INACTIVE", eventIds: number[] }`, shows "Status updated successfully", clears the selection and refetches the list (`useEventManagement.ts:102-121`).

### Bet suspended (BS)

| Step | Detail | Source |
|---|---|---|
| Open | Modal titled "Bet Suspended- {event name}" | `EventManagement.tsx:132-149` |
| Text | Not suspended: "Are you sure you want to suspend betting for the {name} event?", button **Confirm**. Suspended: "…remove bet suspension for the {name} event?", button **Remove** | `components/BetSuspendedModal.tsx:16-20` |
| Request | `PATCH /events/bet-suspended/:eventId` with `{ status: "SUSPENDED" }` to suspend, `{ status: "ACTIVE" }` to remove | `useEventManagement.ts:78-86` |
| After | Toast "Bet Suspended  Successfully" in both directions ([F7](#findings)), modal closes, list refetches (`Event` tag) | same |
| User side | No visible change; bets are rejected with "Bet not allowed" (team, 2026-11-26) | [summary](#what-each-control-does-on-the-user-panel) |

### Markets of an event

Expanding a row mounts `MarketAccordionRow`, which requests `GET /market?eventId=…` for that event (`components/MarketAccordionRow.tsx:9-40`; `hooks/useEventMarkets.ts:4-17`).

- "Loading markets..." while loading; "No Markets Available" when the list is empty.
- One line per market: market `name` and a switch, on when `status === 'Active'`.
- Switching sends `PATCH /market/status/:marketId` with `ACTIVE` or `INACTIVE`, then "Status Update Successfully". The `Market` tag makes every expanded row refetch its markets.
- On the user side the backend stops sending a switched-off market or session (team).

## Fixtures

`/fixtures` (`Fixtures.tsx`, `hooks/useFixtures.ts`). This is the control the team uses to hide a match from players or to close it.

### Filters and list

| Control | Values | Sent to `GET /fixture` | Source |
|---|---|---|---|
| Status | All (default), Active, Inactive | All → `status=Active,Inactive,Upcoming,Live,Open`. **Closed is never requested**, so closed fixtures do not appear in the admin list | `constants.ts:86-91`; `useFixtures.ts:25-30` |
| Game | Cricket (default), Soccer, Tennis, Grey hound, Horse Racing | `sport` as in Events | `useFixtures.ts:14,26` |
| Search | Header search, 500 ms debounce, page 1 | `search` | `Fixtures.tsx:58-66` |
| Paging | 10 (default), 25, 50, 100 | none. The API returns the full list and the page slices it in the browser | `useFixtures.ts:34-39` |
| Refresh | Clears the selection, refetches after 500 ms | — | `useFixtures.ts:96-99`; `utils/index.ts:221-232 (useRefresh)` |

Changing the game or status clears the selection and goes to page 1 (`useFixtures.ts:101-111`).

| Column | Shows | Source |
|---|---|---|
| Checkbox | Selection; disabled for closed fixtures. The header box selects the non-closed rows on the current page | `components/fixtureColumns.tsx:33-53`; `useFixtures.ts:44-48,86-91` |
| S. No., Internal ID, External ID | Running number, `id`, `externalId` | `fixtureColumns.tsx:54-68` |
| Fixture | Name, `[competition]`, and badges: Live (`inplay`), Fancy, Bookmaker, Premium Fancy, Match Odds, and E-Sport when the name contains "srl" for cricket, soccer or tennis | `fixtureColumns.tsx:69-95`; `utils.ts:58-78 (getFixtureBadges)` |
| Sport, Time | `sport`; `startTime` as `DD MMM YYYY h:mm A` | `fixtureColumns.tsx:96-109` |
| Status | Coloured pill: Active, Inactive, Upcoming, Live, Open, Suspended, Closed (grey for anything else) | `fixtureColumns.tsx:110-126`; `constants.ts:93-105` |
| On / Off | Switch, on only when status is `ACTIVE` | `fixtureColumns.tsx:127-141` |
| Close | Button; reads "Closed" and is disabled for a closed fixture | `fixtureColumns.tsx:142-158` |

### On / Off

Switching sends `PATCH /fixture/status` with `{ eventIds: [id], status: "Active" | "Inactive" }` at once, with no confirmation. While the request runs, that row's switch and Close button are disabled. Success: "Fixture marked active successfully" (or "inactive"). The `Fixture` tag refetches the list (`useFixtures.ts:53-74`; `fixtureColumns.tsx:132`).

A fixture whose status is Upcoming, Live or Open shows the switch **off** (only `ACTIVE` counts as on). Turning it on sends `Active`.

### Close

1. **Close** on a row, or **Close** above the table for the selected rows, opens "Close Fixture".
2. The text reads "Are you sure you want to close {name | N selected fixtures}? This cannot be undone." and lists the names when several are selected (`components/FixtureCloseModal.tsx:17-37`).
3. **Close** sends `PATCH /fixture/status` with `{ eventIds, status: "Closed" }`. The dialog cannot be dismissed while the request runs (`Fixtures.tsx:132-146`; `useFixtures.ts:78-84`).
4. On success: "Fixture marked closed successfully" (or "N fixtures marked closed successfully"). The fixture leaves the list, because the list never asks for Closed.

**Inactive** above the table sends `Inactive` for every selected fixture, with no confirmation (`useFixtures.ts:76`).

Team intent (2026-11-26): fixtures and leagues that do not close automatically are closed here, for control in an emergency or when needed. Close removes the event from both panels. Open bets are not settled by Close; the Owner settles or voids them.

## Findings

| # | Finding | Where |
|---|---|---|
| F1 | **Access is wider in code than intended.** The team says Owner only; `ownerOnly` also admits role users, and the menu is shown to role users with `EventManagement` read access (Q-67) | `App.tsx:92-96,246-250`; `EnhancedSidebar.tsx:350-361` |
| F2 | **Two ways to switch a match off.** Fixtures uses `PATCH /fixture/status` (`Active`/`Inactive`/`Closed`); Events uses `PATCH /events/:id` and `PATCH /events/multiple/status` (`ACTIVE`/`INACTIVE`). Whether both change the same flag, and so hide the match from the User Panel in the same way, is not confirmed (Q-66) | `api/eventManagementApi.ts:72-82,118-125,148-155` |
| F3 | **Closed fixtures cannot be viewed in the admin panel.** The "All" filter leaves out `Closed` and the Status filter offers only Active and Inactive. This matches the team's intent (Close removes the event from both lists). The "Closed" pill and disabled controls exist only for a closed row that the API still returns | `constants.ts:86-91`; `fixtureColumns.tsx:20,142-158` |
| F4 | **Event-level "Reset stakes" text does not say it is event-only.** It reads "Clear saved stakes for {sport} · {market}?", the same as on the sport default page, although the request includes `eventId` and resets only that event (Q-69) | `components/StakeResetConfirm.tsx:19-25`; `hooks/useBetConfigForm.ts:83-92` |
| F5 | **Events selection survives a game change and paging.** Changing the game or page keeps the selected ids, so **Activate/Deactivate selected** can change events that are no longer on screen, and the header checkbox can stay ticked on a page whose rows are not selected (Q-69) | `useEventManagement.ts:88-100,137-140` |
| F6 | **Events switches have no confirmation and no busy lock.** Status, Inplay and market switches send at once and stay clickable while the request runs. The Fixtures switch is locked while its request runs (Q-69) | `eventColumns.tsx:79-109`; `MarketAccordionRow.tsx:31-35`; compare `fixtureColumns.tsx:132` |
| F7 | **BS success message is the same both ways.** Removing a suspension also shows "Bet Suspended  Successfully" (double space in the source) (Q-69) | `useEventManagement.ts:81` |
| F8 | **Users get no warning of a bet suspension.** The match and odds stay visible; the user finds out only when a bet is rejected with "Bet not allowed" (team description, 2026-11-26) | [summary](#what-each-control-does-on-the-user-panel) |
| F9 | **Two endpoints are defined but never called.** `updatePopular` (`PATCH /events/popular/:id`) is kept for a future popular-events section (team). `updateMarket` (`PATCH /market/:id`) writes the old per-market limit fields (`inPlayMinBetAmount`, `inPlayMaxBetAmount`, `offPlayMinBetAmount`, `offPlayMaxBetAmount`, `minRate`, `maxRate`, `potentialProfit`); the team says these old fields are **no longer in use** (2026-11-26). Limits now come from [Bet Config](bet-config.md) | `api/eventManagementApi.ts:98-105,190-197` |

Bet Config findings are in [bet-config.md](bet-config.md#findings).
