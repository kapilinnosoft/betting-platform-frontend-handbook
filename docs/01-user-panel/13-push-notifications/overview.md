# Module 13: Push notifications (overview)

**Scope.** Browser push notifications sent through Firebase Cloud Messaging (FCM): asking the user for permission, registering this browser with the backend, showing a notification while the app is open (in-app toast) or closed (operating-system notification), opening the right page on click, and removing the device at logout.

Not in this module: the alert notifications shown in the marquee and alert banner (`GET /notifications?type=Alert`, 30 s poll), which are part of [Module 1](../01-home-page/api-inventory.md). They are fetched from the API, not pushed.

**Reference.** rsplay only: `rsplay/rsplay-user@7a89e53`, read at `HEAD`. Paths are relative to `src/` unless they start with `public/`. The repository also has a setup guide, `FIREBASE_NOTIFICATIONS.md`; this page cites the code, not the guide. Module number 12 is kept free for Turnover History.

> **No configuration values are reproduced here.** The Firebase web config and VAPID key come from `VITE_FIREBASE_*` environment variables (`lib/firebase.ts:12-21`; typed in `vite-env.d.ts:24-30`). The service worker has its own hardcoded copy (`public/sw.js:85-95`). This handbook names the variables only.

**Files in this module**

| File | What it covers |
|---|---|
| this page | Parts, permission flow, statuses, receiving and clicking notifications, logout, findings |
| [api-inventory.md](api-inventory.md) | P1 `registerFcmDevice`, P2 `deleteFcmDevice`; the message payload the app understands |
| [polling-and-frequency.md](polling-and-frequency.md) | When each request runs; no polling |

---

## Parts

| Part | Role | Source |
|---|---|---|
| `useFcmNotifications` | Runs on every route. After login, starts the permission prompt and registration; shows foreground messages as toasts; follows clicks relayed by the service worker | `hooks/useFcmNotifications.ts:19-86`; called at `App.tsx:43` |
| `PushNotificationPrompt` | In-app fallback card ("Get alerts when your matches go live") when the browser prompt got no answer | `components/PushNotificationPrompt.tsx:17-103`; rendered at `App.tsx:56` |
| `lib/pushNotifications.ts` | Push status, automatic prompt, enable from a click, register and unregister the device | `lib/pushNotifications.ts` |
| `lib/firebase.ts` | Firebase app and messaging; get and delete the FCM token; foreground message listener | `lib/firebase.ts` |
| `lib/fcmDevice.ts` | Two `localStorage` keys: `fcmFid` (the token last registered) and `fcmPromptSnoozedUntil` | `lib/fcmDevice.ts:4-33` |
| `lib/notificationLink.ts` | Maps a message's `data` to an in-app route | `lib/notificationLink.ts:20-38` (`getNotificationUrl`) |
| `PushNotificationToast` | Look of the foreground toast | `components/common/PushNotificationToast.tsx:11-78` |
| `public/sw.js` | Service worker: background notifications, notification clicks, default icon. It does not cache or intercept requests | `public/sw.js:2-12,45-113` |
| `store/api/fcmApi.ts` | P1 and P2 | `store/api/fcmApi.ts:5-17` |
| `ProfileDrawer` | Calls `unregisterPushDevice` at logout | `components/ProfileDrawer.tsx:71-84` |

The service worker is registered at page load in production builds (`main.tsx:14-18`). `getFcmToken` also registers it, so it exists in development once a token is requested (`lib/firebase.ts:67-68`).

## Push status

`getPushStatus` (`lib/pushNotifications.ts:32-37`) returns one of:

| Status | Rule |
|---|---|
| `unsupported` | The browser lacks `Notification`, `serviceWorker` or `PushManager` (`isPushSupported`, `:28-30`) |
| `denied` | Browser permission is `denied`. Only the user can change it, in browser settings |
| `default` | Permission not answered yet |
| `enabled` | Permission `granted` and `fcmFid` is stored (this browser was registered) |
| `disabled` | Permission `granted` but no `fcmFid` (not registered yet, or registration failed) |

The status is read through `useSyncExternalStore` (`hooks/usePushNotifications.ts:10-17`). It updates after register/unregister and when the permission changes in browser settings (`navigator.permissions` `onchange`, `:40-56`). Only `PushNotificationPrompt` reads it; there is no notification setting in the app ([F7](#findings)).

## Permission and registration flow

```
login (auth.isAuthenticated becomes true), or app load while logged in
  └─ autoRequestPushPermission()                         pushNotifications.ts:107-125
       ├─ unsupported → stop
       ├─ permission "default" and not snoozed → browser prompt (no click needed;
       │     Firefox/Safari ignore it, Chrome may show only a quiet icon)
       └─ syncPushRegistration()  (only if permission is "granted")   :84-91
            └─ registerDevice()                                        :58-75
                 ├─ getFcmToken()  → null: stop                       firebase.ts:46-81
                 ├─ P1 POST /firebase/firebase/devices { fid: <token> }
                 ├─ success → store token as fcmFid
                 └─ failure → logged only; status stays "disabled"
  └─ marks the automatic prompt as settled
       └─ PushNotificationPrompt may appear (below)
```

`OBSERVED`: `hooks/useFcmNotifications.ts:27-29`; `lib/pushNotifications.ts:58-125`.

- Runs for **every logged-in user, demo users included**. Only the fallback card checks for demo users ([F2](#findings)).
- Runs on **every app load** while logged in, so P1 is sent again on each load when permission is granted ([F3](#findings)).
- Concurrent calls are merged into one (`syncInFlight`, `autoPromptInFlight`), which covers React StrictMode's double effect run (`:82-91,96-125`).
- `getFcmToken` never prompts. It returns `null` when permission is not granted, service workers are missing, or Firebase messaging is unsupported (`lib/firebase.ts:46-60`). It waits for the service worker to be active before asking Firebase for the token (`:62-74`).

### Fallback prompt card

`PushNotificationPrompt` (`components/PushNotificationPrompt.tsx`):

| Rule | Value | Source |
|---|---|---|
| Shown when | Logged in, **not** a demo user, automatic prompt settled, status `default`, not snoozed | `:25,27-34` |
| Delay | 1 s after it becomes eligible | `:8,32` |
| Position | Bottom right on desktop (360 px wide); full width above the bottom bar on phones | `:57` |
| Text | "Get alerts when your matches go live" / "Turn on notifications for live match and bet updates." | `:66,69` |
| Allow | Calls `enablePushNotifications()` from the click, so the browser shows its prompt; button reads "Enabling…" meanwhile. Granted → `registerDevice()` | `:43-51`; `lib/pushNotifications.ts:128-141` |
| Not now, or × | Snoozes for **7 days** (`fcmPromptSnoozedUntil`) | `:9,38-41` |
| Browser prompt closed without a choice | Also snoozes for 7 days | `:47-49` |

The snooze also stops the automatic browser prompt (`lib/pushNotifications.ts:110`), so a dismissal is not repeated on every load. The card is not rendered in maintenance mode (`App.tsx:45-51`); the hook still runs.

## Receiving a notification

| App state | What the user sees | Source |
|---|---|---|
| A tab has focus (**foreground**) | In-app toast, top centre, 6 s, at most one per `messageId`. Title is the message's `notification.title` or "New notification"; body; subtitle `sport • competition` from `data`. "View details" appears when the message maps to a page | `hooks/useFcmNotifications.ts:31-66`; `lib/firebase.ts:96-139`; `components/common/Toaster.tsx:4` |
| No tab has focus, or the app is closed (**background**) | Operating-system notification shown by the service worker | `public/sw.js:101-113` |

Background rules (`public/sw.js`):

- A message with a `notification` block is displayed by the Firebase SDK; the worker does not show it again (`:103-105`).
- A data-only message is shown with `data.title` (default: the brand name, hardcoded) and `data.body` (`:107-112`).
- Every notification the worker shows gets the default icon `/icon-192.png` when none is sent (`:74-77`).

Firebase keeps only one foreground handler, so the app attaches it once and fans out to listeners (`lib/firebase.ts:117-139`).

## Where a notification opens

`getNotificationUrl(data)`. The same logic is copied into the service worker because a worker cannot import app modules (`lib/notificationLink.ts:20-38`; `public/sw.js:14-41`). The two copies match at `7a89e53`.

| `data` | Opens |
|---|---|
| `screen` = `event-details`, `eventId`, `sport` = `horseracing` or `greyhound` (any case) | `/details/HorseRacing/<eventId>` or `/details/Greyhound/<eventId>` |
| `screen` = `event-details`, `eventId`, `sport` = `cricket` | `/sports/cricket/market-details/<eventId>` |
| … `sport` = `soccer` or `football` | `/sports/football/market-details/<eventId>` |
| … `sport` = `tennis` | `/sports/tennis/market-details/<eventId>` |
| … any other sport | nothing (not clickable) |
| `url` starting with `/` (and no matching `event-details`) | that path |
| anything else | nothing |

Click handling:

| Where | Behaviour | Source |
|---|---|---|
| Foreground toast | Navigates in the app and closes the toast; without a route the toast is not clickable | `useFcmNotifications.ts:45`; `PushNotificationToast.tsx:18-24` |
| OS notification, an app tab is open | Worker sends `{ type: 'NOTIFICATION_CLICK', url }` to the tab and focuses it; the app navigates without reloading. Without a route it only focuses the tab | `public/sw.js:45-69`; `useFcmNotifications.ts:70-85` |
| OS notification, no tab open | Opens a new window at the route, or `/` | `public/sw.js:66` |

The worker reads `data` from `notification.data.FCM_MSG.data` for SDK-displayed messages, or from `notification.data` for ones it showed itself (`:49-52`).

## Logout

`ProfileDrawer` logout (`components/ProfileDrawer.tsx:71-84`) calls `unregisterPushDevice()` **before** clearing the session, so P2 still carries a valid token:

1. No `fcmFid` stored → nothing to do (`lib/pushNotifications.ts:148-149`).
2. Sends P2 `DELETE /firebase/firebase/devices/<token>` and deletes the FCM token in Firebase, in parallel (`:151-157`).
3. Waits at most **3 s** (`timeoutMs = 3000`), then continues whatever the result (`:153-159`).
4. Clears `fcmFid` (`:162`). The local value is cleared even if P2 failed or timed out ([F5](#findings)).

A session ended by the API instead (a 401 whose token refresh fails dispatches `clearAuth`) does not call `unregisterPushDevice` (`store/api/apiSlice.ts:27-58`) ([F4](#findings)).

## Findings

All `OBSERVED` from source unless labelled.

| # | Finding | Where |
|---|---|---|
| F1 | The P1 body field is named `fid`, but it carries the **FCM registration token** from `getToken`, not a Firebase installation ID. Backend naming to confirm (Q-64) | `lib/pushNotifications.ts:59-62` |
| F2 | **Demo users get the automatic browser prompt and are registered** with P1. Only the fallback card hides for demo users (Q-65) | `useFcmNotifications.ts:28`; `PushNotificationPrompt.tsx:25` |
| F3 | P1 is sent on **every app load** while logged in with permission granted, even when the same token is already stored. Whether the backend treats this as an update is `BACKEND CONFIRMATION REQUIRED` (Q-64) | `lib/pushNotifications.ts:84-91,107-125` |
| F4 | Session expiry (401 → `clearAuth`) does not unregister the device. `fcmFid` stays, and the backend keeps the device for that user until someone logs out properly or the next user's P1 is sent (`INFERRED`, Q-64) | `store/api/apiSlice.ts:27-58` |
| F5 | Logout clears `fcmFid` even when P2 failed or timed out after 3 s. The FCM token is deleted in the browser, so pushes to it should stop (`INFERRED`) | `lib/pushNotifications.ts:153-162` |
| F6 | When registration fails, status becomes `disabled` and nothing retries until the next app load; the fallback card only shows for `default` | `lib/pushNotifications.ts:68-71`; `PushNotificationPrompt.tsx:25` |
| F7 | No in-app setting shows the status or turns notifications off; users must use browser settings | `usePushStatus` is used only in `PushNotificationPrompt.tsx:20` |
| F8 | **The FCM token and full message payloads are written to the browser console**, including in production builds | `lib/firebase.ts:75,107`; `public/sw.js:54,102`; `lib/pushNotifications.ts:66,113,133,152` |
| F9 | The Firebase config is kept twice: environment variables for the app and hardcoded values in `public/sw.js`. The six values in `sw.js` **differ from the example values in the repository's setup guide**. The `.env` actually deployed is not in the repository, so which project is live cannot be checked from source. If the app and the worker used different projects, background notifications would likely fail (`INFERRED`, Q-65) | `public/sw.js:85-95`; `lib/firebase.ts:12-21`; `FIREBASE_NOTIFICATIONS.md` §1 |
| F10 | The route mapping exists in two copies that must be kept in sync by hand (they match at `7a89e53`). The Firebase SDK version is also pinned in two places (`package.json` and two `importScripts` URLs); both are 12.19.0 | `lib/notificationLink.ts`; `public/sw.js:14-41,82-83`; `package.json:44` |
| F11 | Leftover comment on line 1 of the service worker (`//ADDING COMMNETESSSS`) | `public/sw.js:1` |
| F12 | Notifications for sports other than cricket, football, tennis, horse racing and greyhound are shown but not clickable (unless they carry `url`) | `lib/notificationLink.ts:6-11,15-18,30` |

Questions raised: Q-64, Q-65 in [open-questions.md](../../../inventory/open-questions.md).
