# Module 2: In-Play Fixtures (polling and frequency)

Global RTK Query behavior (1.9.7, background polling, cache retention, hidden tabs) is documented in the [polling inventory](../../../inventory/polling-and-frequency-inventory.md#global-facts-both-repos). Team-confirmed 1 s and 2 s polling is intentional; the 3 s vishnu7 hook default is recorded as source behavior.

## rsplay (`810884b`)

| Route / data | Endpoint and arguments | Frequency | Start, stop and effect |
|---|---|---|---|
| `/inplay` match list | `getEvents({inplay:true,status:'ACTIVE'})` | 2 s | `rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:41-57 (useFixtureData)`; starts on mount and ends on unsubscribe (`INFERRED`, RTK Query). Refreshes in-play status and runner prices. |
| `/sports/:sport[/:competitionId]` | `getEvents({sport,competitionId?,status:'ACTIVE'})`; no in-play filter | 2 s | `rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:24-57 (useFixtureData)`; route args select another cache entry; no sport-tab UI is rendered (`rsplay:src/pages/Inplay/index.tsx:19-37`, `Inplay`). |
| `/inplay` racing lists | `getRaces({sportName:'HorseRacing'|'Greyhound',inplay:true})` | 10 s | `rsplay:src/pages/Inplay/index.tsx:36-46 (Inplay)`; both queries run only without `sportName`; unmount stops subscriptions (`INFERRED`, RTK Query). |
| `/racing/:sportName[/:competitionId]` | `getRaces({sportName,seriesId?})` | 10 s | `rsplay:src/pages/Racing/index.tsx:19-44 (Racing)`; one race query for the route sport; optional competition narrows it. |

`getEvents` is also polled by Home with different arguments and used by `useSidebar` with another argument set; those are separate cache entries. Exact same endpoint and serialized arguments share an RTK Query entry (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:41-57`, `useFixtureData`; [Module 1 R5](../01-home-page/api-inventory.md#r5-getevents-canonical-shared-with-module-2)).

The hook's `activeTab` and search state can affect arguments, but `Inplay` does not render a tab/search control or call the returned setters. In this snapshot the default `In-Play` state and empty search remain in effect on the page (`rsplay:src/pages/Inplay/Hooks/useFixtureData.ts:20-53,150-183`, `useFixtureData`; `rsplay:src/pages/Inplay/index.tsx:19-37`, `Inplay`).

## vishnu7 (`6f3b811`)

| Route / data | Endpoint and arguments | Frequency | Start, stop and effect |
|---|---|---|---|
| `/inplay` | `getMatchesGroupedByCompetition({sortBy:'time',inplay:true})` | 3 s | `vishnu7:src/pages/Inplay/index.tsx:11-18 (Inplay)`; starts on mount; ends on unsubscribe (`INFERRED`, RTK Query). View-mode changes do not change query args. |
| `/all-sports/:sportName` | `getMatchesGroupedByCompetition({sportName,sortBy:'time'})` | 3 s | `vishnu7:src/pages/Sports/index.tsx:11-19 (Sports)`; same hook default; upcoming routes set `skip` and make no fixture request. |

In-Play's time/competition selector only changes rendering. The `/inplay` page also mounts `TopGames` and `CasinoGames`; their one-shot requests are documented in Module 1 (`vishnu7:src/pages/Inplay/index.tsx:13-30`, `Inplay`; `vishnu7:src/pages/Home/components/TopGames.tsx:7-20`, `TopGames`).

For both repos, a poll continues in a hidden tab under the documented RTK Query version. It stops when the last subscriber for that exact cache entry unmounts or `skip` becomes true (`INFERRED`, RTK Query semantics; see global polling inventory). No socket dependency is used for these fixture lists.