# Admin Module A1: Login and layout shell (polling and frequency)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`.

The layout (`layouts/DashboardLayout.tsx`) wraps every page after login, so the requests below run on **every** admin page, whatever page is open. Page-specific requests are listed on each module's own polling page.

## Repeating requests (always on after login)

| Request | Repeats | Why it repeats (from the code) | Source |
|---|---|---|---|
| `GET /push-notification/unread` | every **10 s** | Shows new deposit/withdraw notifications quickly: the badge count, sound, bell animation and banner all depend on the count rising between two polls | `DashboardLayout.tsx:56-59,64-92` |
| `GET /users/me` | every **20 s** | Keeps role, `passwordChanged` and **status** current. An account switched to `inactive` or `suspended` is logged out within about 20 s | `DashboardLayout.tsx:94-97,111-123` |
| `GET /users/me/wallets` | every **20 s** | Keeps the header balance current | `DashboardLayout.tsx:100,106-108` |

`skip: !isAuthenticated` on all three means they stop after logout. `INFERRED` from RTK Query 1.9.7: polling continues while the tab is hidden, because there is no `skipPollingIfUnfocused` in this version. If several components subscribe to the same entry with different intervals, RTK polls once, at the shortest interval. For example, `SettlementModal` subscribes to `/users/me/wallets` without an interval, so the layout's 20 s applies.

## One-time requests (each layout mount)

| Request | When it runs | Source |
|---|---|---|
| `GET /mfa/status` | Mount; again after MFA is disabled (`refetch`) | `DashboardLayout.tsx:51-55,153-156` |
| `GET /role/available` | Mount | `DashboardLayout.tsx:99` |
| `GET /users/is/master-owner/user` | Sidebar mount (no `skip`) | `components/common/EnhancedSidebar.tsx:250` |
| `GET /privileges/subadmin/detail` | Once the user id is known (in `App`, outside the layout) | `App.tsx:82-88` |

The layout stays mounted while the user moves between pages, so these run once per full page load. They run again after a hard reload, or after logout and login.

## On user action

| Request | When it runs | Source |
|---|---|---|
| `POST /auth/login` | Login submit | `pages/auth/LoginPage.tsx:67` |
| `POST /auth/mfa/verify`, `POST /mfa/setup`, `POST /mfa/setup/confirm` | MFA steps | `features/mfa/*` |
| `GET /auth/gettoken/{userId}` | Login As click | `pages/Downline/AllDownlineListing.tsx:132` |
| `GET /auth/verify-token/{code}` | Agent panel opened with `?code=`, once per code | `layouts/AuthLayout.tsx:39-49` |
| `GET /push-notification` + `POST /push-notification/read` | Opening the notification panel (once per opening) | `components/common/NotificationSidebar.tsx:32-44` |
| `POST /auth/logout` | Logout, forced logout, after a password change | see [overview](overview.md#session-and-logout) |

## Non-API timers

| Timer | Delay | Purpose | Source |
|---|---|---|---|
| Bell animation reset | 3 s, once per new notification | stop the shake | `DashboardLayout.tsx:80-82` |
| 401 redirect | 2 s, once | delay before `/login` | `store/api/apiSlice.ts:29-32` |

## Request volume

| Situation | Requests |
|---|---|
| First page after login (layout only) | 7: `/mfa/status`, `/push-notification/unread`, `/users/me`, `/role/available`, `/users/me/wallets`, `/users/is/master-owner/user`, `/privileges/subadmin/detail` |
| Each minute while logged in | about 6 unread-notification + 3 profile + 3 wallet = **12** |
