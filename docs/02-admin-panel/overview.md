# Phase 2: Admin Panel (overview)

**Scope approved 2026-11-24.** The first approved Admin Panel modules are Login and layout shell (including the sidebar), Dashboard, and Downline. Account Statement, Export Report History, and Change Password / Activity Log / Logout followed on 2026-11-25. Other admin modules (Sport Analysis, Bet Control, My Reports, Event Management, Casino Control, Content Management, Bonus, Banking, Roles and Privileges, Commission, Coin Management, General Settings) are **not** documented yet. They appear here only as sidebar links.

**Reference.** `rsplay/rsplay-admin@12f0054` (2026-11-20, branch `staging`), read at `HEAD` with `git show HEAD:<path>`. The working tree was clean when it was read. Paths in the admin docs are relative to `src/`, and citations use `path:line (Name)`.

**One codebase, two panels.** The same build serves the **admin panel** (Owner and staff accounts) and the **agent panel** (agents). Login checks which URL the browser is on against `VITE_ADMIN_URL` / `VITE_AGENT_URL` (`pages/auth/LoginPage.tsx:27-28,69-86 (Login.onSubmit)`). Inside the app, role checks decide which menu, routes and columns a user sees. See [Login and layout](01-login-and-layout/overview.md).

## Modules in this phase

Modules are listed (and shown in the portal) in this order. The `#` is a fixed ID, not a position: new modules get the next free ID and are added **below Casino Control**.

| # | Module | Files | Status |
|---|---|---|---|
| A1 | [Login and layout shell](01-login-and-layout/overview.md): login, MFA, "Login as", session, route guards, header, notifications, [sidebar](01-login-and-layout/sidebar.md) | overview, sidebar, api-inventory, polling-and-frequency | DOCUMENTATION COMPLETE |
| A2 | [Dashboard](02-dashboard/overview.md): balance bar, live events, user management, analytics cards, charts, login summary | overview, api-inventory, polling-and-frequency | DOCUMENTATION COMPLETE |
| A3 | [Downline](03-downline/overview.md): hierarchy listing, create member, member actions, account details, settlement | overview, member-listing, create-member, member-actions, account-details, settlement, api-inventory, polling-and-frequency | DOCUMENTATION COMPLETE |
| A7 | [Event Management](07-event-management/overview.md): Events, Fixtures and [Bet Config](07-event-management/bet-config.md); what each control changes on the User Panel | overview, bet-config, api-inventory, polling-and-frequency | DOCUMENTATION COMPLETE (awaiting review) |
| A8 | [Casino Control](08-casino-control/overview.md): category list, provider and game switches, Edit Game; what each control changes on the User Panel | overview, api-inventory, polling-and-frequency | DOCUMENTATION COMPLETE (awaiting review) |
| A4 | [Account Statement](04-account-statement/overview.md): Deposit/Withdraw and Game Transaction tabs, filters, export | overview, api-inventory, polling-and-frequency | DOCUMENTATION COMPLETE (awaiting review) |
| A5 | [Export Report History](05-export-history/overview.md): export list, status, download, registry of every export request | overview, api-inventory, polling-and-frequency | DOCUMENTATION COMPLETE (awaiting review) |
| A6 | [Change Password, Activity Log and Logout](06-settings-and-activity-log/overview.md): `/settings` password form, own login history, logout (linked to A1) | overview, api-inventory, polling-and-frequency | DOCUMENTATION COMPLETE (awaiting review) |

## Roles and the hierarchy

### Team explanation (2026-11-24)

This is the team's description of the business model. It is recorded here as context. Code behaviour is in the next section.

- The platform works **hierarchy-wise**. There is always one **Owner** with full control.
- Below the Owner is a chain of agent levels, ending with **User**: the end user (player) who actually bets on the platform.
- The number of levels is **dynamic per client**. Some clients want 3 levels and some want 5.
- A logged-in account can create the **immediately next** level, or **any lower** level, depending on the client's requirement.
- The Owner panel and the agent panel are the **same panel**, with validations and checks. Agents are every level below the Owner except User, because a User is the end player.
- The hierarchy is created on a **percentage** basis. If the Owner creates a lower-level account at 10 %, that account can only create accounts at **more than** 10 %. The percentage difference between levels decides how commission or profit is distributed, according to the platform's business rules.
- The figures in the dashboard balance bar mean the following. **Total Balance** is the logged-in account's total balance. **Balance Down** is the balance distributed to the downline. **Available Credit** is the balance left after distributing to the downline. **Player Balance** is the balance held by players (end users). **Net Exposure** is the amount in exposure.

### What the code defines at this commit

`OBSERVED`. The frontend works with these role **names**. Ids come from the backend (`GET /role/available`, see [A1 API inventory](01-login-and-layout/api-inventory.md#l7-availbleroles)) and are looked up by name (`utils/index.ts:148-166 (useRoleIds)`).

| Role name | Group in code | Panel URL it must log in on (production) | Source |
|---|---|---|---|
| `OWNER` | Owner (`isOwner`) | admin | `utils/constent.ts:302-306,325 (ROLES, isOwner)` |
| `ADMIN`, `SUPER MASTER`, `SUB SUPER MASTER`, `MASTER` | Agent ("downline user", `isDownlineUser`) | agent | `utils/constent.ts:327-332 (isDownlineUser)`; `pages/auth/LoginPage.tsx:19-24 (isAgentRole)` |
| `USER` | End player | — (no panel menu, listed only as downline) | `utils/constants.ts:11-18 (roleNameToNextNameMap)` |
| any other name (custom roles made in Roles and Privileges, for example staff accounts) | "Role user" (`isRoleUser`): access is decided per module by permissions | admin | `utils/constent.ts:333-338 (isRoleUser)` |

The order of levels is fixed in code. `roleNameToNextNameMap` lists, for each role, **every** role below it:

```text
OWNER → ADMIN → SUPER MASTER → SUB SUPER MASTER → MASTER → USER
```

| Logged-in role | Roles it can list and create (`roleNameToNextNameMap`) |
|---|---|
| `OWNER` | ADMIN, SUPER MASTER, SUB SUPER MASTER, MASTER, USER |
| `ADMIN` | SUPER MASTER, SUB SUPER MASTER, MASTER, USER |
| `SUPER MASTER` | SUB SUPER MASTER, MASTER, USER |
| `SUB SUPER MASTER` | MASTER, USER |
| `MASTER` | USER |

Source: `utils/constants.ts:11-18 (roleNameToNextNameMap)`. The sidebar uses the same list in `DOWNLINE_ROLE_VISIBILITY` (`components/common/EnhancedSidebar.tsx:258-265`), and treats a role user as `OWNER` for this purpose (`:267`).

How the team's description maps to the code:

| Team statement | What the frontend does | Label |
|---|---|---|
| Hierarchy is dynamic (3 or 5 levels) | The five levels below `OWNER` are hard-coded. The frontend does not read a per-client level count. Links use role ids from `GET /role/available`. A role missing there gives a `null` id (`useRoleIds`), and the sidebar still renders its link. Team (Q-38): the static role list is intended so every possible role is listed; the `null` link is a confirmed defect. | `OBSERVED`; how a 3-level client is configured is `BACKEND CONFIRMATION REQUIRED` |
| Can create the next level or any lower level | The "+ Add" button appears on the list of **any** role below the logged-in role, not only the next one (`pages/Downline/AllDownlineListing.tsx:77-84`; `Downline.tsx:75-77`). Whether a client allows only the next level is not decided in the frontend. | `OBSERVED`; per-client restriction `BACKEND CONFIRMATION REQUIRED` |
| Child percentage must be greater than the parent's | Create Member: for a non-Owner, partnership must be `> own partnership` and `≤ 99`. For the Owner it must be 1–99. For a `USER` it is fixed at 100 (`utils/validation.tsx:392-419 (addMemberSchema)`). See [Create member](03-downline/create-member.md). | `OBSERVED` |
| Owner and agents share one panel | Same build, two URLs; menus, routes and columns differ by role (see [sidebar](01-login-and-layout/sidebar.md)). | `OBSERVED` |

## Permission model (three kinds of account)

| Account | Menu | Route checks | Button checks | Source |
|---|---|---|---|---|
| Owner | Full `navigation` list, filtered only by `onlyOwner` (always true for the Owner) | `ModuleRoute` and `ProtectedAdminRoutes` always allow | `hasModuleAccess` always returns `true` | `context/PermissionContext.tsx:43-49 (hasModuleAccess)`; `components/ModuleRoute.tsx:43-51` |
| Agent (`ADMIN` … `MASTER`) | Fixed `agentNavigation` list, **no** permission filtering | `ModuleRoute` always allows. `ownerOnly(...)` routes redirect to `/dashboard` | `hasModuleAccess` always `true` | same; `App.tsx:92-105 (ownerOnly, ownerOrAgent)` |
| Role user (custom role) | `navigation` filtered by `read` permission per module key. `onlyOwner` items hidden | `ModuleRoute` checks the listed access types and otherwise redirects to `/settings` (or, for Dashboard, the first allowed page) | `hasModuleAccess(module, action)` from `rolePrivileges[].updatedAccess` | `PermissionContext.tsx:41-49`; `ModuleRoute.tsx:16-63` |

Permissions come from `GET /privileges/subadmin/detail`, called once in `App` when a user id exists (`App.tsx:82-88`; [A1 L13](01-login-and-layout/api-inventory.md#l13-getuserrolesdetails)). Each module key, for example `Users` or `Dashboard`, has access flags: `read`, `create`, `update`, `delete`, `download` and `detailedView` (`types/rolesTypes.ts:110-116 (UpdatedAccess)`).

## How the admin app talks to the backend

| Fact | Value | Source |
|---|---|---|
| Client | One RTK Query `apiSlice`. Every `*Api.ts` file injects into it | `store/api/apiSlice.ts:37-98` |
| Base URL | `VITE_API_BASE_URL`, else `/api` | `apiSlice.ts:7` |
| Auth header | `authorization: Bearer <accessToken>` from Redux, except for `verifyLoginToken`, which is sent anonymously | `apiSlice.ts:8-20` |
| Token storage | Cookie `admin_authToken` (1 day, `secure`, `sameSite: strict`), read into Redux at start-up | `store/slices/authSlice.ts:13-23,39-52` |
| On HTTP 401 | Remove the cookie and the D/W auto-refresh flag, then after **2 s** go to `/login` (unless already there). There is **no** refresh-token call | `apiSlice.ts:23-35 (baseQueryWithReauth)` |
| Cache defaults | `refetchOnMountOrArgChange: true` and `keepUnusedDataFor: 0`: every mount refetches and nothing is kept after unmount | `apiSlice.ts:40-41` |
| Cache-buster | Most queries add `ts: Date.now()` to the params (same design intent as `t` in the User Panel, Q-06). The dashboard analytics queries do not | e.g. `store/api/authApi.ts:111,129`; `store/api/dashboardApi.ts` |
| Polling | RTK `pollingInterval` only. No WebSocket | see each module's polling page |
| RTK Query | `@reduxjs/toolkit` `^1.9.7` | `package.json` |

Because `keepUnusedDataFor` is `0` and `refetchOnMountOrArgChange` is `true`, opening a page always sends its requests again, even if the same data was loaded a moment before. `INFERRED` from RTK Query semantics.
