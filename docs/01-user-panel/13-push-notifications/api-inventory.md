# Module 13: Push notifications (API inventory)

rsplay `@7a89e53`; paths relative to `src/` unless they start with `public/`. Both endpoints inject into the single RTK Query `apiSlice` (`store/api/apiSlice.ts`), which adds the bearer token (see [application architecture §2.3](../../00-overview/application-architecture.md#23-authentication-and-tokens)).

Both are dispatched from plain functions with `store.dispatch(fcmApi.endpoints.….initiate(…))`, not from React hooks. The generated hooks `useRegisterFcmDeviceMutation` and `useDeleteFcmDeviceMutation` are exported but not used (`store/api/fcmApi.ts:21`).

Response shapes come from the TypeScript types. They are not captured backend responses. All examples are sanitised placeholders.

## Summary

| # | Endpoint name | Request | Tags | Trigger | Consumer |
|---|---|---|---|---|---|
| P1 | `registerFcmDevice` | `POST /firebase/firebase/devices` | none | `ON_STATE_CHANGE` (login or app load while logged in, permission granted); `ON_INTERACTION` (Allow on the fallback card) | `registerDevice` in `lib/pushNotifications.ts` |
| P2 | `deleteFcmDevice` | `DELETE /firebase/firebase/devices/:fid` | none | `ON_INTERACTION` (logout from the profile drawer) | `unregisterPushDevice` in `lib/pushNotifications.ts` |

---

## P1 `registerFcmDevice`

| Item | Value |
|---|---|
| Definition | `store/api/fcmApi.ts:5-11` (`registerFcmDevice`) |
| Called from | `registerDevice`, `lib/pushNotifications.ts:58-75`, reached through `syncPushRegistration` (`:84-91`) and `enablePushNotifications` (`:128-141`) |
| Method and path | `POST /firebase/firebase/devices` |
| Auth | Bearer token from `apiSlice` |
| Body | `{ fid: <FCM registration token> }` (see [F1](overview.md#findings)) |
| Sent only when | Permission is `granted` and `getFcmToken()` returned a token (`lib/firebase.ts:46-81`) |
| On success | Stores the token in `localStorage` as `fcmFid`; status becomes `enabled` |
| On failure | Logged to the console; nothing stored; no retry until the next app load ([F6](overview.md#findings)) |
| Cache | Mutation; `request.reset()` clears it after each call (`:72`) |

Example (sanitised):

```
POST /firebase/firebase/devices
Authorization: Bearer <access-token>
Content-Type: application/json

{ "fid": "<fcm-registration-token>" }
```

Response type: `{ success: boolean; message?: string }`. The app reads only whether the request succeeded (`unwrap()`), not the body.

`BACKEND CONFIRMATION REQUIRED` (Q-64): whether a repeated P1 with the same token is an update, and whether a token already linked to another user is moved to the current one.

## P2 `deleteFcmDevice`

| Item | Value |
|---|---|
| Definition | `store/api/fcmApi.ts:12-17` (`deleteFcmDevice`) |
| Called from | `unregisterPushDevice`, `lib/pushNotifications.ts:147-164`, from logout in `components/ProfileDrawer.tsx:75` |
| Method and path | `DELETE /firebase/firebase/devices/<url-encoded token>` (`encodeURIComponent(fid)`) |
| Auth | Bearer token (sent before the session is cleared) |
| Body | none |
| Sent only when | `fcmFid` is stored |
| Timing | Runs alongside the Firebase token deletion; logout continues after both finish or after **3 s** |
| On failure | Logged; `fcmFid` is still cleared ([F5](overview.md#findings)) |

Example (sanitised):

```
DELETE /firebase/firebase/devices/<url-encoded-fcm-registration-token>
Authorization: Bearer <access-token>
```

Response type: `{ success: boolean; message?: string }`; not read.

Not sent when the session ends through a failed token refresh (`clearAuth`, `store/api/apiSlice.ts:27-58`) ([F4](overview.md#findings)).

## Message payload the app understands

Pushes come from Firebase, not from an app request. These are the fields the frontend reads. Which events send a push, and with which fields, is `BACKEND CONFIRMATION REQUIRED` (Q-64).

| Field | Used for | Source |
|---|---|---|
| `notification.title`, `notification.body` | Foreground toast title and body; in the background the Firebase SDK displays them | `lib/firebase.ts:106-115`; `public/sw.js:103-105` |
| `data.title`, `data.body` | Background notification for data-only messages (title defaults to the brand name) | `public/sw.js:107-112` |
| `data.screen`, `data.eventId`, `data.sport` | Route to the event page ([mapping](overview.md#where-a-notification-opens)) | `lib/notificationLink.ts:23-32` |
| `data.url` | In-app path when it starts with `/` | `lib/notificationLink.ts:35` |
| `data.sport`, `data.competition` | Toast subtitle `sport • competition` | `hooks/useFcmNotifications.ts:37` |
| `messageId` | Toast id, so the same message is not shown twice | `useFcmNotifications.ts:49` |

Example data-only message (sanitised):

```json
{
  "data": {
    "title": "<title>",
    "body": "<text>",
    "screen": "event-details",
    "eventId": "<event-id>",
    "sport": "cricket",
    "competition": "<competition name>"
  }
}
```

With this payload, a click opens `/sports/cricket/market-details/<event-id>`.

## Configuration (names only)

| Variable | Used by | Source |
|---|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase app in the page | `lib/firebase.ts:12-19` |
| `VITE_FIREBASE_VAPID_KEY` | `getToken` (`vapidKey`) | `lib/firebase.ts:21,71-74` |
| Hardcoded copy of the first six | Firebase app in the service worker, which cannot read environment variables | `public/sw.js:85-95` ([F9](overview.md#findings)) |

`.env.example` lists the seven variables empty. Values are deliberately not reproduced in this handbook.
