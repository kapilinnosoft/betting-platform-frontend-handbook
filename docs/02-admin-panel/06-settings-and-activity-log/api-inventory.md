# Admin Module A6: Change Password, Activity Log and Logout (API inventory)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. Response shapes come from TypeScript types and the fields the pages read, not from captured responses.

## Summary

| # | Name | Request | Parameters sent | When it runs | Repeats | Consumer |
|---|---|---|---|---|---|---|
| ST1 | `changePassword` / `OwnerChangePassword` | `POST /users/me/change-password` (agents) / `POST /admin/change-password` (Owner, role users) | body `{ oldPassword, newPassword }` | Change Password submit | once per submit | `components/common/ChangePassword.tsx:64-78` |
| ST2 | `logout` | `POST /auth/logout` | none | after a successful password change; sidebar Logout | once per action | `ChangePassword.tsx:82`; `components/common/EnhancedSidebar.tsx:681-693` |
| ST3 | `exportActivityLog` | `POST /activity-log/export` (query parameters, no body) | `exportFormat`, `timezone`, `searchByUserId`, and when set: `fromDate`, `toDate` | Excel / PDF / CSV click | once per click | `pages/ActivityLogs/index.tsx:207-221` |
| ST4 | `getActivityLogs` | `GET activity-log` | `ts`, and when set: `page`, `limit`, `fromDate`, `toDate` | Page open; date range; page or size change; Refresh | once per argument set | `index.tsx:32-37` |

---

## ST1 `changePassword` / `OwnerChangePassword`

Documented in full in [A1 L8](../01-login-and-layout/api-inventory.md#l8-changepassword--ownerchangepassword) (`store/api/authApi.ts:157-178`). The `/settings` page uses the same form and the same requests as the forced "Create Password" modal. Both requests invalidate `User`, which refetches the layout's `GET /users/me`.

Example body (sanitised):

```json
{ "oldPassword": "<current>", "newPassword": "<new, 8-20 characters>" }
```

`confirmPassword` is checked in the browser and not sent.

## ST2 `logout`

Documented in [A1 L9](../01-login-and-layout/api-inventory.md#l9-logout) (`authApi.ts:122-127`). `POST /auth/logout`, no body.

## ST3 `exportActivityLog`

`store/api/ExportApi.ts:552-588`. `POST /activity-log/export`. Every value goes in the query string, each only when truthy. No cache tags.

| Parameter | Value from the Activity Log page |
|---|---|
| `exportFormat` | `Excel`, `Pdf` or `Csv` |
| `timezone` | browser time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) |
| `fromDate`, `toDate` | applied range, `toISOString()` (omitted when no range) |
| `searchByUserId` | `localStorage.accountSummary.id`: the **last-viewed Downline member**, not the logged-in account ([F4](overview.md#findings-activity-log), Q-54). Team: with an id the backend exports that user's log; without one it exports the logged-in account's log |
| defined, not sent here | `page`, `limit`, `userId` |

Response `ExportResponse` (`types/index.ts:1823-1828`); the page reads `success` and `message`. The file appears in [Export Report History](../05-export-history/overview.md).

The Downline account-details Activity Log calls the same request with `searchByUserId` set to the member being viewed (`pages/Downline/AccountDetails/ActivityLog.tsx:53-58`; [A3 DL26](../03-downline/api-inventory.md#dl26-exports-from-account-details)).

## ST4 `getActivityLogs`

`store/api/reportsApi.tsx:283-304`. `GET activity-log` (no leading slash; `fetchBaseQuery` joins it to the base URL). Provides `Members`.

| Parameter | Value from this page |
|---|---|
| `page`, `limit` | current page; page size 10 / 25 / 50 / 100 |
| `fromDate`, `toDate` | applied range, `toISOString()` (start and end of day from the picker); omitted on page open |
| `ts` | `Date.now()` (cache-busting, design intent as Q-06) |

Example (sanitised):

```
GET activity-log?page=1&limit=10&ts=1764063000000
```

Response `ActivityLogsResponce` (spelled this way, `types/index.ts:80-84`): `message`, `pagination` (`totalItems` read), `data: LoginActivity[]` (`types/index.ts:85-119`).

| Field | Shown as |
|---|---|
| `loginAt` | Date/Time |
| `loginStatus` | Login Status (`Success` / `Failed` / other) |
| `ipAddress` | IP Address (table and detail row) |
| `isp` | ISP (masked in the table) |
| `city`, `state`, `country` | City / State / Country (masked in the table) |
| `anonymous.is_tor`, `is_vpn`, `is_proxy`, `is_relay` | Security badges; detail-row flags |
| `isHosting` | Connection ("Hosting" / "Mobile"); detail row "Hosting Provider" |
| `continent`, `timezone`, `postalCode`, `longitude`, `latitude` | detail row (Owner and role users) |
| `as.asn`, `as.domain`, `as.type` | detail row |
| `isAnonymous`, `isSatellite`, `isAnycast`, `mobile.name` | detail row flags |
| not read | `id`, `remark`, `device` |

The string flags (`isHosting`, `isAnonymous`, `isSatellite`, `isAnycast`) are compared with the text `'true'`, not a boolean (`types/index.ts:101-104`; `index.tsx:171`; `Infocard.tsx`).

The User Panel has its own activity log page (`/user/activity-logs`, `getActivityLog`, not documented). Whether it calls the same backend path is not checked here.
