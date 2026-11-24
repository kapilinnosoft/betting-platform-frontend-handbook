# Admin Module A3: Member listing

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. There are two list pages:

- **Level list** `/members/{roleId}` (`pages/Downline/AllDownlineListing.tsx`, layout `pages/Downline/Downline.tsx`) lists every member of one role level under the logged-in account.
- **Drill-down list** `/members/{id}/{role}/{user}/{memberid}/{upline}` (`pages/Downline/SubUsers.tsx`) lists one agent's downline, with a tab per lower role.

## Level list (`AllDownlineListing`)

### When the list loads

The page loads only if `:id` is a role the logged-in account may manage (`AllDownlineListing.tsx:77-84`):

```text
allowed = roleNameToNextNameMap[loggedInRole]            e.g. MASTER → [USER]
valid   = (a role in /role/available whose name is in allowed AND whose id == :id)  OR  isRoleUser
```

If it is not valid, `getMembers` is skipped and the table is empty with 0 items (`:91-107`). Role users always pass.

### Request

`GET users/me/sub-users` (`getMembers`, [DL1](api-inventory.md#dl1-getmembers)), with:

| Param | Value | Source |
|---|---|---|
| `rollId` | `:id` (the role id; spelled `rollId` in code) | `AllDownlineListing.tsx:94` |
| `level` | `1` (always) | `:95` |
| `username` | search box, debounced 500 ms | `:70-71,93` |
| `status` | dropdown value; `All` → omitted | `:100` |
| `fromDate`, `toDate` | date range, only after **Apply** | `:96-97`; `Downline.tsx:112-120` |
| `page`, `limit` | pagination (default 1, **10**) | `:54-55,98-99` |
| `ts` | `Date.now()` | `store/api/DownlineApi.ts:65` |

What `level: 1` means together with `rollId` (direct children only, or the whole subtree at that role) is `BACKEND CONFIRMATION REQUIRED`. Team context: the level lists show the hierarchy-wise totals for each role.

### Page parts (`Downline.tsx`)

| Part | Behaviour | Source |
|---|---|---|
| Title | Role name from the id (Admin, Super Master, Sub Super Master, Master, User), else "Downline". Count text: "showing {rows on page} {title}" | `AllDownlineListing.tsx:911-919`; `Downline.tsx:70-74` |
| Refresh | 500 ms delay, then `refetch()` | `AllDownlineListing.tsx:109-116` |
| "+ Add {title}" | Shown when `canCreate` **and** the level is valid. Opens [Create member](create-member.md) | `Downline.tsx:75-77,192-199` |
| Balance strip | `components/common/BalanceSummary.tsx`: Total Balance, Total Avail. bal., Total Exposure (red), Balance (Downline), Total Users Balance, from `GET /users/summary` ([DL2](api-inventory.md#dl2-getsummary)) for the **logged-in** account | `Downline.tsx:79`; `BalanceSummary.tsx:10-16`; `AllDownlineListing.tsx:75` |
| Search | "Search by {title}...", resets to page 1 | `Downline.tsx:86-95` |
| Status | All, Active, Inactive, BetLock, Suspended. Resets to page 1 | `Downline.tsx:100-110` |
| Date range | Picker with **Apply**. Resets to page 1 | `Downline.tsx:112-120` |
| Table | `ResponsiveDataTable` (cards on mobile; `userName` and `status` pinned) | `Downline.tsx:132-141` |
| Icon legend | Profile, Sport Permission, D (Deposit), W (Withdraw), Change Status, Bet History | `Downline.tsx:143-175`; `utils/constent.ts:6-49` |
| Pagination | sizes 10, 25, 50, 100 | `Downline.tsx:179-189` |

### Columns: agent levels (Admin … Master)

`administratorsColumns` (`AllDownlineListing.tsx:145-558`). Used whenever `:id` is not the USER role id (`:968`).

| Column | Field | Display | Notes |
|---|---|---|---|
| S. No. | — | `(page − 1) × size + row + 1` | |
| New User Access | `isVerified` | checkbox | Owner and role users only. See [member actions](member-actions.md#new-user-access) |
| userName | `role`, `username` | role badge (AD, SM, SSM, MA, PL, BA, OW) + underlined link | opens the drill-down list |
| Credit Reference | `creditAmount` | number | edit button commented out |
| Balance | `availableBalance` | number | |
| Exposure | `exposure` | `(n)` in red | |
| Partnership % | `partnership` | as is | |
| Downline Bal. | `downlineBalance` | green | |
| Total Bal. | `totalBalance` | number | |
| User Bal. | `playerBalance` | number | |
| Point W/L | `referance` | green above 0, red below 0, black at 0 | the field is spelled `referance` |
| Upline P/L | `downlinePlInPercent` | coloured by sign | the header says "Upline P/L", the field is `downlinePlInPercent` |
| Status | `status` | coloured pill (`active`, `inactive`, `bet_lock`, `suspended`) | |
| Actions | — | D, W, Profile, Sport Permission, Change Status | [member actions](member-actions.md) |
| Login As | — | button | Owner only |

### Columns: USER level

`userColumns` (`AllDownlineListing.tsx:560-909`).

| Column | Field | Display |
|---|---|---|
| S. No. | — | as above |
| userName | `username` | plain text (users have no downline) |
| Credit Reference | `creditAmount` | number |
| Balance | `availableBalance` | number |
| Exposure | `exposureAmount` | `(n)` in red. Users use `exposureAmount`, agents use `exposure` |
| Coin | `coinAmount` | number |
| Locked Bonus | `lockedbonus` | number |
| Locked Bal. | `lockedAmount` | number |
| Withdrawal Bal. | `withdrawalBalance` | number |
| Total P/L | `referance` | coloured by sign |
| Lifetime P/L | `lifetimePl` | coloured by sign |
| Total Deposit | `totalDepositAmount` | number |
| Total Withdraw | `totalWithdrawAmount` | number |
| Status | `status` | pill |
| Phone No. | `mobile` | `-` when empty |
| Created At | `createdAt` | `MMM DD, YYYY h:mm A` (moment) |
| Actions | — | D, W, Coin, Profile, Sport Permission, Change Status, Bet History |

The field meanings (for example how `referance` "Point W/L" differs from `lifetimePl`) are not defined in the frontend. They are `BACKEND CONFIRMATION REQUIRED`. The response type is `Member` (`types/index.ts:445-477`).

## Drill-down list (`SubUsers`)

Opened by clicking an agent's username. It shows that agent's downline, one role per tab.

| Item | Behaviour | Source |
|---|---|---|
| Request | `GET /users/sub-users/{memberid}` (`getSubMembers`, [DL3](api-inventory.md#dl3-getsubmembers)) with `rollId` = active tab, `level: 1`, `upline` from the URL, `username` (debounced 500 ms), `status`, dates (after Apply), `page`, `limit` | `SubUsers.tsx:97-108` |
| Tabs | Roles below the **clicked member's** role (from `:role`), shown deepest first (`.reverse()`). Example for a Super Master: User, Master, Sub Super Master | `SubUsers.tsx:58-76` |
| Default tab | id `6` (hard-coded), reset to `6` whenever the path changes. If the USER role id is not 6, the first request uses another role's id | `SubUsers.tsx:78,93-95` |
| Title | `:user` (the username) with a back button | `SubUsers.tsx:713-719` |
| Balance strip | `GET /users/summary`: the **logged-in** account's totals, not the viewed agent's | `SubUsers.tsx:51,721` |
| Columns (USER tab) | same as the USER level list, minus Coin and D/W actions. The only action is Profile (needs `detailedView`) | `SubUsers.tsx:112-434` |
| Columns (agent tabs) | same as agent levels, without New User Access and Login As. Actions: Profile (no permission check) plus two decorative icons for USER rows with no click handler | `SubUsers.tsx:436-697` |
| Status filter | does **not** reset to page 1 (the level list does) | `SubUsers.tsx:738-742` |
| Loader | full-screen loader while fetching | `SubUsers.tsx:710` |

No action that changes data is available on this page (F7 in the [overview](overview.md#findings)).
