# Module 13: Push notifications (polling and frequency)

rsplay `@7a89e53`; paths relative to `src/` unless they start with `public/`.

**Nothing in this module polls.** Notifications are pushed by Firebase to the service worker or the open tab; the app does not ask for them. The app makes at most one P1 per app load and one P2 per logout (`OBSERVED`).

## When each request runs

| Request | Class | Runs when | Source |
|---|---|---|---|
| P1 `POST /firebase/firebase/devices` | `ON_STATE_CHANGE` | `auth.isAuthenticated` becomes true (login, or app load with a saved session) and permission is `granted`. Once per app load; concurrent calls are merged | `hooks/useFcmNotifications.ts:27-29`; `lib/pushNotifications.ts:84-91,107-125` |
| P1 | `ON_INTERACTION` | **Allow** on the fallback card, when the user grants permission | `components/PushNotificationPrompt.tsx:43-51`; `lib/pushNotifications.ts:128-141` |
| P2 `DELETE /firebase/firebase/devices/:fid` | `ON_INTERACTION` | Logout from the profile drawer, when `fcmFid` is stored; capped at 3 s | `components/ProfileDrawer.tsx:71-84`; `lib/pushNotifications.ts:147-164` |

## Browser and Firebase activity (not app API requests)

| Activity | When | Source |
|---|---|---|
| Browser permission prompt | Once per app load after login while permission is `default` and not snoozed; or from Allow | `lib/pushNotifications.ts:110-117,131-134` |
| Fallback card | 1 s after it becomes eligible; hidden for 7 days after Not now | `PushNotificationPrompt.tsx:8-9,27-34` |
| FCM token request to Firebase | Before each P1 | `lib/firebase.ts:46-81` |
| FCM token deletion | At logout, alongside P2 | `lib/firebase.ts:84-94` |
| Service worker registration | Page load in production; also before each token request | `main.tsx:14-18`; `lib/firebase.ts:67-68` |
| Foreground toast | Each message received while a tab has focus; 6 s | `hooks/useFcmNotifications.ts:31-66` |

## Request volume

| Action | Requests |
|---|---|
| Log in, permission already granted | 1 P1 |
| Reload the app while logged in, permission granted | 1 P1 per load ([F3](overview.md#findings)) |
| Permission `default` or `denied` | 0 |
| Allow on the fallback card, then grant | 1 P1 |
| Receive or click a notification | 0 (route change only) |
| Log out with `fcmFid` stored | 1 P2 |
| Session ends by failed token refresh | 0 ([F4](overview.md#findings)) |
