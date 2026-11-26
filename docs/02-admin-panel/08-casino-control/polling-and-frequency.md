# Admin Module A8: Casino Control (polling and frequency)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/pages/CasinoManagement/` unless stated.

**Nothing in this module polls.** No query sets `pollingInterval`, and no page uses `setInterval` or a socket (`OBSERVED`). The layout's own polls still run ([A1 polling](../01-login-and-layout/polling-and-frequency.md)).

The user casino lobbies do not poll either. They request games on open, on filter change and when the user scrolls, so a change made here reaches a player the next time their list loads ([Module 8 polling](../../01-user-panel/08-casino/polling-and-frequency.md)). Launching is checked by the backend at the moment of launch (team).

## When each request runs

| Request | When it runs | Source |
|---|---|---|
| CC1 `GET /casino/category` | Casino Control opens; again when Category Level, Game Control or Edit Game mounts (each subscription remounts with `refetchOnMountOrArgChange`); Refresh on Category Level (500 ms) | `CasinoControl.tsx:26,36-39`; `CategoryControl.tsx:9`; `GameControl.tsx:50`; `Modal/EditGame.tsx:38` |
| CC2 `GET /casino/providers` | Casino Control opens; Provider Level or Game Control mounts; Refresh on Provider Level (500 ms) | `CasinoControl.tsx:27,40-43`; `ProviderControl.tsx:16`; `GameControl.tsx:51` |
| CC3 `GET /casino/games` | Casino Control opens (page 1, 10, every tab); Game Control filter (search after 500 ms), page or size change; category or provider grid opens or pages; Refresh (Game Control: the parent's page-1 query; grid: its own query); after CC4 or CC7 (`Casino` tag) | `CasinoControl.tsx:28-31,44-48`; `GameControl.tsx:37-44`; `FilteredGames.tsx:23-38` |
| CC4 `PATCH casino/status/:id` | Game Status switch | `GameControl.tsx:56-66`; `FilteredGames.tsx:41-51` |
| CC5 `PATCH /casino/provider/status` | Provider switch (no refetch afterwards) | `ProviderControl.tsx:27-52` |
| CC6 `GET casino/:id` | Edit Game opens (the dialog's content mounts only while open) | `Modal/EditGame.tsx:23` |
| CC7 `PATCH casino/:id` | Edit Game ▸ Update after validation | `EditGame.tsx:82-99` |
| CC8 `POST /upload` | A thumbnail file is chosen | `EditGame.tsx:65-79` |

## Request volume

| Action | Requests |
|---|---|
| Open Casino Control (Category Level) | 1 CC1 + 1 CC2 + 1 CC3 from the parent, + 1 CC1 from the tab |
| Open Provider Level | 1 CC2 |
| Open Game Control | 1 CC3 (own arguments) + 1 CC1 + 1 CC2 |
| Change a Game Control filter or page | 1 CC3 |
| Switch a game | 1 CC4 + 1 CC3 for each mounted games query |
| Switch a provider | 1 CC5 |
| Open Edit Game | 1 CC6 + 1 CC1 |
| Choose a thumbnail | 1 CC8 |
| Save a game | 1 CC7 + 1 CC3 for each mounted games query |
