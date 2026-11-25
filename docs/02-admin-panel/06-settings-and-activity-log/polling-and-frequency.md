# Admin Module A6: Change Password, Activity Log and Logout (polling and frequency)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`.

**Nothing in this module polls.** `getActivityLogs` sets no `pollingInterval`, and neither page uses `setInterval` or a socket (`OBSERVED`). The layout's polls (unread notifications 10 s, profile 20 s, wallet 20 s) still run. See [A1 polling](../01-login-and-layout/polling-and-frequency.md).

## When each request runs

| Request | When it runs | Source |
|---|---|---|
| `POST /admin/change-password` or `POST /users/me/change-password` | Change Password submit, after the form passes validation | `components/common/ChangePassword.tsx:64-78` |
| `GET /users/me` (layout) | Refetched after a password change, because both password requests invalidate `User` | `store/api/authApi.ts:166,177` |
| `POST /auth/logout` | Right after a successful password change; sidebar Logout | `ChangePassword.tsx:82`; [A1](../01-login-and-layout/overview.md#session-and-logout) |
| `GET activity-log` | Page open; date picker closed (page 1); page or size change; Refresh (after 500 ms); any mutation that invalidates `Members` while the page is open | `pages/ActivityLogs/index.tsx:32-37,206,244-252,275-285`; `store/api/reportsApi.tsx:303` |
| `POST /activity-log/export` | Excel, PDF or CSV click, when the page has rows and a `localStorage.accountSummary` entry exists | `index.tsx:209-221` |

No mutation that invalidates `Members` (Downline actions) can run from the Activity Log page itself, so in practice the list changes only on the events above.

## Cache behaviour

- `refetchOnMountOrArgChange: true` and `keepUnusedDataFor: 0` (`store/api/apiSlice.ts:40-41`): every visit to Activity Log requests the list again.
- `ts` is added inside the query function, so it is not part of the cache key.
- The eye icon (masking) and the expandable detail row are display only and send no request.

## Request volume

| Action | Requests |
|---|---|
| Open Change Password | 0 |
| Submit a valid password change | 1 change + 1 logout (+ 1 `GET /users/me` from the `User` tag, if the layout is still mounted) |
| Open Activity Log | 1 |
| Apply a date range, change the page or page size | 1 |
| Press Refresh | 1 (after 500 ms) |
| Export | 1 `POST`, or 0 when "No Data To Export" or no stored member |
