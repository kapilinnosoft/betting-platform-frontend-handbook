# Admin Module A7: Event Management (polling and frequency)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/pages/EventManagement/`.

**Nothing in this module polls.** No query sets `pollingInterval`, and no page uses `setInterval` or a socket (`OBSERVED`). The lists change only when the admin acts or presses Refresh. The layout's own polls still run ([A1 polling](../01-login-and-layout/polling-and-frequency.md)).

On the User Panel, changes made here are picked up by the user app's existing polls. The event page catalogue refreshes every 1 s in play and every 2 s otherwise (`rsplay-user:src/pages/GameDetails/Hooks/useCatalogData.ts:30-33,111-113`). Fixture lists refresh every 2 s ([Module 2](../../01-user-panel/02-inplay/polling-and-frequency.md)).

## When each request runs

| Request | When it runs | Source |
|---|---|---|
| EM1 `GET /events` | Page open; tab change (route); game change; search (500 ms debounce); page or size change; Refresh (500 ms after the click); after EM2, EM3 or EM4 (`Event` tag); after EM5 (explicit `refetch`) | `hooks/useEventManagement.ts:39-46,102-145`; `hooks/debounce.tsx:3` |
| EM2 `PATCH /events/:id` | Status switch click | `useEventManagement.ts:69-76` |
| EM3 `PATCH /events/inplay/:id` | Inplay checkbox click | `useEventManagement.ts:60-67` |
| EM4 `PATCH /events/bet-suspended/:id` | BS modal Confirm or Remove | `useEventManagement.ts:78-86` |
| EM5 `PATCH /events/multiple/status` | Activate / Deactivate selected, with at least one row selected | `useEventManagement.ts:102-121` |
| EM6 `GET /market?eventId` | A row is expanded (each expanded row has its own request); again for every expanded row after EM5 or EM7 (`Market` tag) | `hooks/useEventMarkets.ts:5` |
| EM7 `PATCH /market/status/:id` | Market switch click | `useEventMarkets.ts:8-15` |
| EM8 `GET /fixture` | Page open; game or status change; search (500 ms); Refresh (500 ms); after EM9 (`Fixture` tag). Paging sends nothing | `hooks/useFixtures.ts:25-39,96-111` |
| EM9 `PATCH /fixture/status` | On/Off click; Inactive (selection); Close confirm | `useFixtures.ts:53-84` |
| EM10 `GET /betconfig/dynamic` | Each time the form mounts: page open, each sport or market tab (the form is keyed by sport and market), opening the event-level modal; after EM11 or EM12 (`BetConfig` tag) | `BetSetting.tsx:41-48`; `components/BetConfigModal.tsx:23-30`; `hooks/useBetConfigForm.ts:24` |
| EM11 `PUT /betconfig/dynamic` | Confirm and update | `useBetConfigForm.ts:67-81` |
| EM12 `PATCH /betconfig/dynamic/reset-stake` | Reset stakes confirm | `useBetConfigForm.ts:83-92` |

## Cache behaviour

- EM1, EM6, EM8 and EM10 set `forceRefetch: () => true`, and the slice sets `refetchOnMountOrArgChange: true` and `keepUnusedDataFor: 0` (`api/eventManagementApi.ts:45-47,66-68,92-94,165-167`; `store/api/apiSlice.ts:40-41`). Every visit and every remount requests again.
- `ts` is added inside each query function, so it does not split the cache.

## Request volume

| Action | Requests |
|---|---|
| Open Events | 1 EM1 |
| Expand a row | 1 EM6 |
| Click a Status or Inplay switch | 1 EM2 or EM3 + 1 EM1 |
| Suspend or un-suspend betting | 1 EM4 + 1 EM1 |
| Activate / deactivate N selected events | 1 EM5 + 1 EM1 + 1 EM6 per expanded row |
| Switch a market | 1 EM7 + 1 EM6 per expanded row |
| Open Fixtures | 1 EM8 |
| Change page on Fixtures | 0 |
| Switch a fixture, mark N inactive, or close N | 1 EM9 + 1 EM8 |
| Open Bet Config or change sport or market tab | 1 EM10 |
| Save a config | 1 EM11 + 1 EM10 (only on the default page; the event modal closes) |
| Reset stakes | 1 EM12 + 1 EM10 |
