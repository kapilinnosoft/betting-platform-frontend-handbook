# Admin Module A1: Sidebar

`components/common/EnhancedSidebar.tsx` (`rsplay/rsplay-admin@12f0054`). `DashboardLayout` renders it on every page after login (`layouts/DashboardLayout.tsx:166`).

## Which menu an account sees

There are two hard-coded menus. The choice depends only on the role group (`EnhancedSidebar.tsx:670-679`):

```text
isDownlineUser (ADMIN / SUPER MASTER / SUB SUPER MASTER / MASTER)  →  agentNavigation   (shown as is)
everyone else (OWNER, role users)                                     →  navigation        (filtered)
```

Filtering of `navigation`:

1. An item with `onlyOwner` is hidden unless the account is the Owner.
2. An item with no `permissionKey` is always shown.
3. Otherwise it is shown when `hasModuleAccess(permissionKey, 'read')` is true. That is always true for the Owner. For role users it comes from their role privileges.

The source comment says "Show only if at least one action is true", but the code checks `read` only (`EnhancedSidebar.tsx:677-678`).

### Owner and role users: `navigation` (`EnhancedSidebar.tsx:287-522`)

| Menu item | Route(s) | `permissionKey` | Extra rule | Documented |
|---|---|---|---|---|
| Dashboard | `/dashboard` | `Dashboard` | | [A2](../02-dashboard/overview.md) |
| Downline ▸ (role levels, Settlement) | `/members/{roleId}`, `/settlement` | `Users` | children filtered by role (below) | [A3](../03-downline/overview.md) |
| Sport Analysis | `/sport-analysis` | `RiskManagement` | | not yet |
| Bet Control | `/bet-control` | `BetControl` | | not yet |
| My Reports ▸ Bet List, Casino Bet List, P/L Report By Downline, By Event, By Player, By Casino Downline, By Casino Players, Business Report | `/bet-list`, `/casino-bet-list`, `/pl-by-downline`, `/pl-by-event`, `/pl-by-player`, `/casinopl-by-downline`, `/casinopl-by-player`, `/business-reports` | `MyReport` | | not yet |
| Event Management ▸ Events, Fixtures, Bet Config | `/event-management`, `/fixtures`, `/bet-setting` | `EventManagement` | routes are `ownerOnly` | not yet |
| Casino Control | `/casino-management` | `CasinoControl` | route is `ownerOnly` | not yet |
| Content Management | `/content-management` | `ContentManagement` | | not yet |
| Firebase Notifications | `/firebase-notifications` | `FirebaseNotifications` | `onlyOwner` | not yet |
| Bonus Management ▸ Policy Management, Bonus Statement | `/bonus/policy-management`, `/bonus/statement` | `Bonus` | routes are `ownerOnly` | not yet |
| Manual Bonus ▸ Config, Report | `/manual-bonus/config`, `/manual-bonus/report` | — | `onlyOwner` | not yet |
| Banking Management ▸ Deposit/Withdraw Request, Manage Accounts, Crypto Conversion Settings | `/requests`, `/manage-account`, `/crypto-conversion` | `BankingManagement` | | not yet |
| Roles And Privileges | `/roles-and-privileges` | `Roles Privileges` | | not yet |
| Commision (spelled this way in the UI) ▸ Setting, Report | `/match-odds-commission-setting`, `/match-odds-commission-report` | `Commission` | routes are `ownerOnly` | not yet |
| Account Statement | `/rolewise-account-statement` | `Account Statement` | | [A4](../04-account-statement/overview.md) |
| Coin Management | `/coin-management` | `CoinManagement` | | not yet |
| Export Report History | `/export` | `Export History` | | [A5](../05-export-history/overview.md) |
| Change Password | `/settings` | — | always shown | [A6](../06-settings-and-activity-log/overview.md#change-password) |
| General Settings | `/general-settings` | `General Settings` | route is `ownerOnly` | not yet |
| Activity Log | `/activity-logs` | `Activity Logs` | | [A6](../06-settings-and-activity-log/overview.md#activity-log) |

"Risk Management" (`/risk`) is commented out of both menus (`EnhancedSidebar.tsx:304-311,538-544`), but its routes still exist (`App.tsx:297-300`).

### Agents: `agentNavigation` (`EnhancedSidebar.tsx:523-657`)

Dashboard, Downline ▸, Sport Analysis, My Reports ▸ (same eight reports), Account Statement, Coin Management, **Content Management (only when the account is not the "master owner")**, Banking Management ▸ (same three), Manual Bonus ▸ (Config, Report), Export Report History, Change Password, Activity Log.

| Rule | Detail | Source |
|---|---|---|
| No permission filtering | Agents see every item in this list. `hasModuleAccess` returns `true` for agents anyway (`context/PermissionContext.tsx:44`) | `EnhancedSidebar.tsx:670-671` |
| Content Management | Added only when `GET /users/is/master-owner/user` returns falsy | `EnhancedSidebar.tsx:250,584-594`; [L17](api-inventory.md#l17-getismasterowner) |
| Not offered to agents | Bet Control, Event Management, Casino Control, Firebase Notifications, Bonus Management, Roles And Privileges, Commission, General Settings | compare the two lists |

## Downline children per role

The Downline menu lists one entry per role level below the logged-in role, plus Settlement (`EnhancedSidebar.tsx:258-285`):

| Logged-in role | Downline ▸ children |
|---|---|
| `OWNER` (and role users, treated as `OWNER` here, `:267`) | Admin, Super Master, Sub Super Master, Master, User, Settlement |
| `ADMIN` | Super Master, Sub Super Master, Master, User, Settlement |
| `SUPER MASTER` | Sub Super Master, Master, User, Settlement |
| `SUB SUPER MASTER` | Master, User, Settlement |
| `MASTER` | User, Settlement |

Each level links to `/members/{roleId}`. The id comes from `GET /role/available` by role name (`utils/index.ts:148-166 (useRoleIds)`). Settlement is tagged with role `USER`, so it appears whenever User does (`EnhancedSidebar.tsx:284`).

A level that `GET /role/available` does not return still appears in the menu. Its link becomes `/members/null`, because only the visibility table filters children (`EnhancedSidebar.tsx:273-285`). Team (Q-38): the predefined roles are kept static on purpose so every possible role is listed, and ids come from `/role/available`; the `null` link is a **confirmed defect**.

## Behaviour

| Behaviour | Detail | Source |
|---|---|---|
| Open or collapsed | Open: 288 px (`w-72`) with labels. Collapsed: 64 px (`w-16`) icons only on large screens, hidden off-screen on small screens | `EnhancedSidebar.tsx:703-707`; `DashboardLayout.tsx:169` |
| Mobile | Opens with a backdrop. Tapping the backdrop or any link below 768 px closes it | `EnhancedSidebar.tsx:34,698-700,150-154,191-194,220-223` |
| Groups | One group open at a time (`activeMenu`). A group whose child matches the current path opens by itself while the sidebar is open | `EnhancedSidebar.tsx:49,63-67,71-75,694` |
| Collapsed fly-out | Hovering a group while collapsed shows its children in a floating panel (rendered into `document.body`), which hides 150 ms after the pointer leaves | `EnhancedSidebar.tsx:77-89,133-170` |
| Active state | Exact path match for single links. A group is highlighted when the path **starts with** one of its children's paths | `EnhancedSidebar.tsx:53-56` |
| Icons | Image from `VITE_IMAGEKIT_URL/sidebar/*.svg` when set, else a Lucide icon | `EnhancedSidebar.tsx:114-118,238-240` |
| Logout | Bottom row. See [session and logout](overview.md#session-and-logout) | `EnhancedSidebar.tsx:681-693,753-759` |

## APIs used by the sidebar

| Name | Request | When it runs | Detail |
|---|---|---|---|
| `getIsMasterOwner` | `GET /users/is/master-owner/user` | Once each time the layout mounts (no skip) | [L17](api-inventory.md#l17-getismasterowner) |
| `logout` | `POST /auth/logout` | Logout click | [L9](api-inventory.md#l9-logout) |

The sidebar reads `user` and `roles` from Redux. Those are filled by the layout's `/users/me` and `/role/available` calls ([L6](api-inventory.md#l6-getuser), [L7](api-inventory.md#l7-availbleroles)).

## Findings

| # | Finding | Where |
|---|---|---|
| S1 | **The number of levels is fixed in the frontend.** Two separate copies of the role ladder exist (`DOWNLINE_ROLE_VISIBILITY` in the sidebar and `roleNameToNextNameMap` in `utils/constants.ts`). A client with fewer levels still gets every menu entry, with `null` ids for missing roles (Q-38: the static list is intended; the `null` ids are a confirmed defect) | `EnhancedSidebar.tsx:258-285`; `utils/constants.ts:11-18` |
| S2 | **Agents' menu has no permission filtering.** Any per-agent restriction must come from the backend | `EnhancedSidebar.tsx:670-671` |
| S3 | **Two items share `id: 17`** (Bet Control and Coin Management). React keys use `item.name`, so there is no visible effect | `EnhancedSidebar.tsx:320,477` |
| S4 | **The menu shows "Commision"** (spelling) | `EnhancedSidebar.tsx:461` |
