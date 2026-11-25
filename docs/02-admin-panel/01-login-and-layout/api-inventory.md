# Admin Module A1: Login and layout shell (API inventory)

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. Every endpoint injects into the single `apiSlice` (`store/api/apiSlice.ts`). Base URL, auth header, 401 handling and cache defaults are described in the [phase overview](../overview.md#how-the-admin-app-talks-to-the-backend).

Response shapes come from TypeScript types and the fields the code reads. No live responses were captured. These are the admin frontend's contracts. The User Panel uses some of the same paths (for example `POST /auth/login`) with **different** request bodies. Do not treat one panel's body as the other's contract.

## Summary

| # | Name | Request | When it runs | Repeats | Consumer |
|---|---|---|---|---|---|
| L1 | `login` | `POST /auth/login` | Login submit | once per submit | `pages/auth/LoginPage.tsx` |
| L2 | `setupMfa` | `POST /mfa/setup` | MFA setup (login or header switch); MFA disable (header) | once per action | `features/mfa/MfaChallenge.tsx`, `features/mfa/MfaSettingsModal.tsx` |
| L3 | `confirmMfaSetup` | `POST /mfa/setup/confirm` | 6-digit code after the QR code | once per action | same two files |
| L4 | `verifyMfa` | `POST /auth/mfa/verify` | 6-digit code at login | once per submit | `MfaChallenge.tsx` |
| L5 | `getMfaStatus` | `GET /mfa/status` | Layout mount (any logged-in role) | once per mount, and after disabling MFA | `layouts/DashboardLayout.tsx` |
| L6 | `getUser` | `GET /users/me` | Layout mount | **every 20 s** | `DashboardLayout.tsx` (plus `useRoleCheck` on the same cache entry) |
| L7 | `availbleRoles` | `GET /role/available` | Layout mount | once per mount | `DashboardLayout.tsx` |
| L8 | `changePassword` / `OwnerChangePassword` | `POST /users/me/change-password` / `POST /admin/change-password` | Forced "Create Password" submit (also `/settings`, [A6](../06-settings-and-activity-log/overview.md#change-password)) | once per submit | `components/common/ChangePassword.tsx` |
| L9 | `logout` | `POST /auth/logout` | Sidebar Logout; forced logouts | once per action | `EnhancedSidebar.tsx`, `DashboardLayout.tsx`, `ChangePassword.tsx` |
| L10 | `getWallet` | `GET /users/me/wallets` | Layout mount | **every 20 s** | `DashboardLayout.tsx` (also `pages/Settlement/modal/SettlementModal.tsx`) |
| L11 | `getLoginAsToken` (lazy) | `GET /auth/gettoken/{userId}` | **Login As** click (Owner) | once per click | `pages/Downline/AllDownlineListing.tsx` |
| L12 | `verifyLoginToken` | `GET /auth/verify-token/{code}` | Agent panel opened with `?code=` | once per code | `layouts/AuthLayout.tsx` |
| L13 | `getUserRolesDetails` | `GET /privileges/subadmin/detail` | App start, once a user id is known | once per id | `App.tsx` |
| L14 | `getUnreadNotifications` | `GET /push-notification/unread` | Layout mount | **every 10 s** | `DashboardLayout.tsx` |
| L15 | `getNotifications` | `GET /push-notification` | Notification panel opened | once per opening | `components/common/NotificationSidebar.tsx` |
| L16 | `markAllRead` | `POST /push-notification/read` | Notification panel opened | once per opening | `NotificationSidebar.tsx` |
| L17 | `getIsMasterOwner` | `GET /users/is/master-owner/user` | Sidebar mount; Dashboard mount | once per mount | `EnhancedSidebar.tsx`, `pages/dashboard/DashboardPage.tsx` |

Defined in the same file but **not called** at this commit: `getCaptcha` (`POST /captcha`, `store/api/authApi.ts:115-120`). Telegram MFA endpoints are commented out (`authApi.ts:88-109`).

---

## L1 `login`

| Item | Value |
|---|---|
| Definition | `store/api/authApi.ts:61-68` |
| Call | `pages/auth/LoginPage.tsx:61-67 (onSubmit)` |
| Cache tags | invalidates `User` |

**Request body:** `{ username, password }`. Nothing else is sent.

**Response** `LoginResponse` (`authApi.ts:10-34`) is one of:

| Shape | Fields | Used for |
|---|---|---|
| Logged in | `accessToken`, `refreshToken?`, `type`, `role: { id, name }`, `transactionCode?` | `accessToken` stored; `role.name` chooses the panel. `refreshToken` and `transactionCode` are not used |
| MFA verify | `success`, `mfaRequired: true`, `mfaMethod?` (`GOOGLE` / `TELEGRAM`), `userId`, `userType`, `accessToken: null` | opens the MFA screen in `verify` mode |
| MFA setup | `success`, `mfaSetupRequired: true`, `mfaMethod?`, `userId`, `userType`, `accessToken: null` | opens the MFA screen in `setup` mode |

**Errors:** `error.data.message` is shown in the banner and mapped to a toast by keyword ([overview](overview.md#flow)).

## L2 `setupMfa`

| Item | Value |
|---|---|
| Definition | `authApi.ts:69-76` |
| Calls | `features/mfa/MfaChallenge.tsx:74-78` (setup at login); `features/mfa/MfaSettingsModal.tsx:159-163` (enable), `:222-225` (disable) |
| Cache tags | invalidates `MfaStatus`, `User` |

| Use | Body | Response read |
|---|---|---|
| Enable | `{ usernameOrEmail, password, status: 'ACTIVE' }` | `{ qrCode, secret }`. If `qrCode` is missing: error "MFA setup did not return a QR code." |
| Disable | `{ status: 'INACTIVE', token }` | success only |

`qrCode` is used directly as an `<img src>`, so it is `INFERRED` to be a data URL. `secret` is shown as "Manual key".

## L3 `confirmMfaSetup`

`authApi.ts:77-80`. Body `{ token }` (6 digits). Response `{ status: 'ACTIVE', message? }`, of which only success is used. Invalidates `MfaStatus`, `User`. Calls: `MfaChallenge.tsx:96`, `MfaSettingsModal.tsx:179`.

## L4 `verifyMfa`

`authApi.ts:81-87`. Body `{ username, userId, userType, token }` (`MfaChallenge.tsx:104`). Response `AuthTokens` `{ accessToken, refreshToken?, type }` (`authApi.ts:37`), of which only `accessToken` is stored (`LoginPage.tsx:118-121`). Invalidates `User`.

## L5 `getMfaStatus`

`authApi.ts:110-113`. `GET /mfa/status?ts=<now>`. Provides `MfaStatus`. Response `MfaStatusResponse` (`authApi.ts:53-58`): `isMfaEnabled`, `activeMethod` (`GOOGLE`/`TELEGRAM`/null), `totp?`, `telegram?`. The header reads `isMfaEnabled` (switch position) and `activeMethod` (which disable form to show). Called for every logged-in role (`skip: !isAuthenticated`), but the switch is rendered for the Owner only (`DashboardLayout.tsx:51-55,197`).

## L6 `getUser`

| Item | Value |
|---|---|
| Definition | `authApi.ts:128-140` |
| Call | `layouts/DashboardLayout.tsx:94-97` (`pollingInterval: 20000`); same entry read by `hooks/useRoleCheck.ts:18-20` |
| Request | `GET /users/me?ts=<now>` |
| Side effect | `onQueryStarted` → `setUser(data)` into the Redux `user` slice |
| Cache tags | provides `User` |

**Response** `UserResponse` (`store/slices/userSlice.ts:8-35`). Fields read in this phase:

| Field | Used for |
|---|---|
| `id` | permissions query (L13), settlement `userId` |
| `role.name`, `role.id` | every role check, menu choice, column choice |
| `username`, `email` | header name; `fromAccount` / `toAccount` in deposit, withdraw and create |
| `partnership` | Create Member minimum ([A3](../03-downline/create-member.md)) |
| `passwordChanged` | forced "Create Password" modal |
| `status` | logout when `inactive` / `suspended` |
| `upline` | Account Summary password button rule |

## L7 `availbleRoles`

`authApi.ts:141-156` (the name is spelled this way in code). `GET /role/available?ts=<now>`. Response `Role[]` = `{ id, name }[]` → `setAvailableRoles` (Redux `roles`). No cache tags. Used for role ids in links and titles (`useRoleIds`), and for the `USER` id that `ModuleRoute` waits for.

## L8 `changePassword` / `OwnerChangePassword`

| Name | Request | Who | Definition |
|---|---|---|---|
| `changePassword` | `POST /users/me/change-password` `{ oldPassword, newPassword }` | agents | `authApi.ts:157-167` |
| `OwnerChangePassword` | `POST /admin/change-password` `{ oldPassword, newPassword }` | Owner and role users | `authApi.ts:168-178` |

Both invalidate `User`. The form (`components/common/ChangePassword.tsx:64-92`) treats a response with a truthy `status` as success, then logs out. The `changePassword` response type is `{ success, status? }`. If the backend returns no `status`, the form neither shows success nor logs out (`INFERRED`).

## L9 `logout`

`authApi.ts:122-127`. `POST /auth/logout`, no body, no tags. Callers clear Redux state and the cookie afterwards.

## L10 `getWallet`

`authApi.ts:180-187`. `GET /users/me/wallets?ts=<now>`, provides `Wallet`. Response `Wallet[]` (`types/index.ts:691-704`): `type` (`Main`/`Bonus`), `amount`, `exposureAmount`, `lockedAmount`, `creditAmount`, … The header shows `amount` of the `Main` wallet. Deposit, withdraw, credit and coin mutations invalidate `Wallet`, so the header balance refetches after them.

## L11 `getLoginAsToken`

`authApi.ts:190-211`. `GET /auth/gettoken/{userId}` with `responseHandler: 'text'`. `transformResponse` accepts a raw code, a JSON-quoted string, or an object with `code` or `token`, and returns `{ code }`. Called lazily from `AllDownlineListing.tsx:132`.

## L12 `verifyLoginToken`

`authApi.ts:212-217`. `GET /auth/verify-token/{code}`. `prepareHeaders` sends **no** `authorization` header for this endpoint (`apiSlice.ts:12-14`). Response `VerifyLoginTokenResponse` (`types/index.ts:1986-1990`): `{ success, accessToken, type }`. Started with `dispatch(authApi.endpoints.verifyLoginToken.initiate(...))` rather than the lazy hook (`layouts/AuthLayout.tsx:44-46`; the source comment explains why).

## L13 `getUserRolesDetails`

`store/api/rolesApi.ts:154-162`. `GET /privileges/subadmin/detail?ts=<now>`. The hook argument (user id) is **not** sent. It only forms the cache key. Called in `App.tsx:82-88`, skipped until `user.data.id` exists. The first item of `data` (a `Permission`, `types/rolesTypes.ts:34-42`) goes to `PermissionProvider`. Its `role.rolePrivileges[].privilege.permissions` (module key) and `updatedAccess` (`read`/`create`/`update`/`delete`/`download`/`detailedView`) drive `hasModuleAccess`.

## L14 `getUnreadNotifications`

`store/api/notificationApi.ts:18-25`. `GET /push-notification/unread?ts=<now>`. Provides `AdminNotification`. Response `{ notifications: PushNotification[] }` (`types/notification.ts:26-30`). The layout uses `notifications.length` (badge) and `notifications[0].notification` (banner text).

## L15 `getNotifications`

`notificationApi.ts:10-17`. `GET /push-notification?page=1&limit=20&ts=<now>`. Provides `AdminNotification`. Skipped while the panel is closed. Response `NotificationsResponse` (`types/notification.ts:14-24`). Each `PushNotification` has `id`, `notification` (text), `scrren` (sub-text, spelled this way), `mode` (`Upi`/`Bank`/`Crypto`), `type` (`Credit`/`Debit`), `read` and `createdAt` (shown as relative time).

## L16 `markAllRead`

`notificationApi.ts:26-32`. `POST /push-notification/read`, no body. Invalidates `AdminNotification`, which refetches L14 and L15. Called once each time the panel opens (`NotificationSidebar.tsx:36-44`).

## L17 `getIsMasterOwner`

`authApi.ts:220-226`. `GET /users/is/master-owner/user?ts=<now>`. Response: a boolean. Uses: hides Content Management from agents who are the "master owner" (`EnhancedSidebar.tsx:584-594`); on the Dashboard, hides Game and Casino analytics unless the system setting `masteranalytics.selection` is `true` (`pages/dashboard/DashboardPage.tsx:35-39`). What makes an account the "master owner" is `BACKEND CONFIRMATION REQUIRED`.
