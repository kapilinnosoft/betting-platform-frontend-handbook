# Module 10: Referrals (API inventory)

rsplay `@7a89e53`; paths relative to `src/`. All endpoints inject into the single RTK Query `apiSlice` (`store/api/apiSlice.ts`), which adds the bearer token (see [application architecture §2.3](../../00-overview/application-architecture.md#23-authentication-and-tokens)).

**The Referral page makes no request of its own** (`OBSERVED`: `pages/Referral/index.tsx` imports no API hook). It depends on two requests documented elsewhere.

## Summary

| # | Endpoint name | Request | Tags | Trigger | Consumer |
|---|---|---|---|---|---|
| R1 | `getUserProfile` | `GET /users/me` | provides `User` | `ON_MOUNT` of the header after login | Supplies `referralCode` to the Referral page |
| R2 | `registerUser` | `POST /auth/register` | none | `ON_INTERACTION` (register submit) | Sends the `referralCode` a new user entered or received by link |

---

## R1 `getUserProfile` (`GET /users/me`)

Requested by the layout header, not by this page: `useGetUserProfileQuery(undefined, { skip: !isAuthenticated })` (`components/Header.tsx:54`). Usage on the Home page is listed in [Module 1 › api-inventory](../01-home-page/api-inventory.md). Definition `store/api/userApi.ts:39-45` (`getUserProfile`). A second definition in `src/apis/userApi.ts` is **not in use** (see [API inventory › duplicates](../../../inventory/api-inventory.md#rsplay-duplicate-endpoint-definitions)).

The result is stored by `userSlice` (`store/slices/userSlice.ts:38-40`). Fields this module reads:

| Field | Type in source | Used for |
|---|---|---|
| `referralCode` | `string` (optional in `store/api/userApi.ts:29`) | Code card and the link |
| `role.name` | `string` | `demo` hides the page content (`hooks/redux.ts:22-23`) |

Example (sanitised, fields used here only):

```json
{ "id": "<user-id>", "username": "<username>", "role": { "name": "<role>" }, "referralCode": "<REFERRAL_CODE>" }
```

The profile also declares `isAffiliateUser` (`store/api/userApi.ts:27`; `types/user.ts:33`). No page in the user app reads it (`useIsAffiliateUser` in `pages/CasinoGames/hooks/redux.ts:14` is defined but never called).

## R2 `registerUser` (`POST /auth/register`)

Documented in full in [Login and Signup › `POST /auth/register`](../authentication/api-inventory.md#post-authregister). Definition `store/api/authApi.ts:16-35` (`registerUser`); called from `pages/Auth/hooks/useRegister.ts:87-99` (`handleSubmitForm`).

Referral-specific rules:

| Field | Value | Source |
|---|---|---|
| `referralCode` | The form value: the `refCode` from the link (field locked), a code typed by hand, or `""` when blank. Always present in the body | `useRegister.ts:50,59-63,97` |

How the backend treats `""` or an unknown code: `BACKEND CONFIRMATION REQUIRED` (Q-60).

## Not used by this module

| Endpoint name | Request | Why it is listed |
|---|---|---|
| `getUserReference` | `GET /users/reference/user` | The name looks referral-related, but `reference` is the profile drawer P&L figure (`components/ProfileDrawer.tsx:64-67`) |
