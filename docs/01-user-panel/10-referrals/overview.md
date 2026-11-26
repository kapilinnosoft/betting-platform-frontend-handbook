# Module 10: Referrals (overview)

**Scope.** The **Referral** page at `/referral`, where a logged-in user copies or shares a personal referral code and link. Also covers the other side: how a shared link opens the register form with the code filled in, and how the code is sent at sign-up. The bonus a referral earns appears in the Bonus Statement under the `ReferralBonus` category ([Module 11](../11-bonuses/overview.md)).

**Reference.** rsplay only: `rsplay/rsplay-user@7a89e53`, read at `HEAD`. Paths are relative to `src/` unless they start with `public/`. The team chose this commit on 2026-11-25. None of the files in this module changed between `810884b` (the commit Modules 1–9 cite) and `7a89e53`.

**Files in this module**

| File | What it covers |
|---|---|
| this page | Route, access, the referral page, the shared link, sign-up with a code, findings |
| [api-inventory.md](api-inventory.md) | The requests this module depends on. It has none of its own |
| [polling-and-frequency.md](polling-and-frequency.md) | When those requests run (nothing polls) |

---

## Route and access

| Item | Rule | Source |
|---|---|---|
| Route | `/referral`, lazy-loaded, inside `HomeLayout` and `ProtectedRoute` | `App.tsx:59,92,105` (`App`); `routes/index.tsx:27` (`ReferralPage`) |
| Guest | `ProtectedRoute` opens the login modal and redirects to `/` | `components/common/ProtectedRoute.tsx:12-28` (`ProtectedRoute`) |
| Menu entry | Profile drawer item 13 "Referral" (`/referral`) | `utils/constants.ts:374-379` (`profileDrawerItems`); `components/ProfileDrawer.tsx:34` (`profileDrawerItemI18nKey`) |
| Demo user | The drawer shows demo users only item 7 (Rules), so they have no menu link. If a demo user opens `/referral` directly, the page shows "Referral program is not available for demo accounts." | `ProfileDrawer.tsx:208-210`; `pages/Referral/index.tsx:53-56` (`Referral`); `hooks/redux.ts:22-23` (`useIsDemoUser`, `role.name` is `demo`) |

The old sidebar menu that also listed Referral is commented out (`utils/constants.ts:262-276`, `privateMenu`).

## How it works

```mermaid
sequenceDiagram
  participant H as Header (layout)
  participant API as Backend
  participant R as Referral page
  participant F as Friend's browser
  participant S as Register modal
  H->>API: GET /users/me (after login)
  API-->>H: profile incl. referralCode
  H->>R: state.user.profile.referralCode
  R->>R: link = VITE_APP_URL + ?mode=register&refCode=<code>
  R->>F: Copy or Share (code or link)
  F->>S: open link → register modal opens, code filled and locked
  S->>API: POST /auth/register { …, referralCode }
```

## The Referral page

`pages/Referral/index.tsx` (`Referral`). The page makes **no API request**. Everything comes from the profile already in Redux and one build-time setting.

| Item | Value | Source |
|---|---|---|
| Referral code | `state.user.profile.referralCode`, or `''` when missing. The profile is filled by `GET /users/me`, which the header requests after login ([R1](api-inventory.md#r1-getuserprofile-get-usersme)) | `index.tsx:14`; `store/slices/userSlice.ts:38-40`; `components/Header.tsx:54` |
| Referral link | `` `${VITE_APP_URL}?mode=register&refCode=${referralCode}` `` when both the code and `VITE_APP_URL` exist, otherwise `''` | `index.tsx:10,18-19` |
| Display | Two cards, "Your Referral Code" and "Your Referral Link". An empty value shows `-` | `index.tsx:60-72`; `ShareCard` at `:80-120` |

`VITE_APP_URL` is environment configuration; its value is not recorded here.

### Copy

`handleCopy` (`index.tsx:21-25`) returns at once when the value is empty. Otherwise it calls `useClipboard().copy` (`hooks/useClipboard.ts:17-52`), which uses `navigator.clipboard.writeText` on a secure page and a hidden `<textarea>` with `document.execCommand('copy')` otherwise (`utils/index.ts:59-82`, `copyToClipboard`). On success it shows a toast: "Referral code copied to clipboard!" or "Referral link copied to clipboard!".

### Share

`handleShare` (`index.tsx:36-47`) builds a message from the translation keys `referral.shareMessage.*` (`buildShareMessage`, `:27-34`; `public/locales/en/common.json:833-837`): a fixed promotional paragraph, then one line with the code or the link.

| Browser | What happens |
|---|---|
| Has `navigator.share` (most phones) | Opens the system share sheet with the message as `text` only (no `url` field). A cancelled share is ignored (`.catch(() => {})`) |
| No `navigator.share` (most desktops) | Copies the **whole message** to the clipboard. The toast still says "Referral code copied" or "Referral link copied" |

The promotional paragraph, including the brand name, is part of the translation text in every language file, not configuration ([F5](#findings)).

## Opening a referral link

`hooks/useReferralRegisterModal.ts:16-34` (`useReferralRegisterModal`), called once in `App` (`App.tsx:42`). It runs **once, on the first load of the app** (empty dependency list):

| Visitor | `?mode=register` present | Result |
|---|---|---|
| Not logged in | yes | Opens the register modal (`openModal({ name: 'register' })` → `SignupModal`, `components/ModalManager.tsx:19`) |
| Logged in | yes | Removes `mode` and `refCode` from the address bar (`replace: true`); no modal |
| Any | no | Nothing |

"Logged in" here is the start-up value of `isAuthenticated`: `true` when a stored access token has not expired (`store/slices/authSlice.ts:28-40`). The link opens on the route in `VITE_APP_URL`; with no path that is `/`, the Home page.

`?mode=register` alone, with no `refCode`, also opens the register modal (`OBSERVED`: only `mode` is checked, `:21`).

## Signing up with a code

| Step | Rule | Source |
|---|---|---|
| Read the code | `useRegister` reads `refCode` from the current URL | `pages/Auth/hooks/useRegister.ts:22-23` (`useRegister`) |
| Fill it in | When `refCode` exists, `setValue('referralCode', refCode, { shouldValidate: true })` | `useRegister.ts:59-63` |
| Lock it | The "Referral Code" field is disabled while `refCode` exists in the URL, so the visitor cannot change it | `components/SignupModal.tsx:36,211-221` (`SignupModal`) |
| Typed by hand | Without a link, the field is empty and editable | `useRegister.ts:46-55` (default `referralCode: ''`) |
| Validation | `z.string().optional()`: no format or length check in the browser | `utils/validations.ts:127` (`registerSchema`) |
| Sent | `referralCode: data.referralCode` in the `POST /auth/register` body, **always**, as `""` when blank | `useRegister.ts:87-99` (`handleSubmitForm`); request in [Login and Signup](../authentication/api-inventory.md#post-authregister) |

**A blank code means no referral.** The backend treats `""` as "no referral" (team, Q-60). What it does with an unknown or inactive code is still `BACKEND CONFIRMATION REQUIRED` (Q-60 b).

## What the page does not show

`OBSERVED` (search at HEAD): the user app has no request or page for referred users, referral counts or referral earnings. The only referral reward the user sees is a bonus row with category `ReferralBonus` in the Bonus Statement ([Module 11](../11-bonuses/overview.md)). How that bonus is set up is described below.

## How a referral bonus is set up (admin side)

The team's answer to Q-61: referral bonuses are not fixed. Admins create them as bonus policies, and what a user receives depends on the policies that are **active**. The admin app shows which settings a referral policy has. Source: `rsplay/rsplay-admin@12f0054`, paths relative to `src/`. The Bonus Management module of the Admin Panel is not documented in full yet; this section covers only the referral settings.

| Item | Rule | Source |
|---|---|---|
| Where | **Bonus Management › Policy Management** (`/bonus/policy-management`), Owner only, behind the `Bonus` module permission | `App.tsx:276-281`; `components/common/EnhancedSidebar.tsx:389-407` |
| Category | "Referral Bonus", saved as `category: 'ReferralBonus'`, the value the user's Bonus Statement shows | `pages/Bonus/utils/constants.ts:1-5`; `pages/Bonus/utils/helper.ts:59-63` |
| Status and dates | Active or Inactive, with a start and end date (start of the from-day to end of the to-day) | `helper.ts:126-133` |
| Who gets the bonus | **Bonus Eligible Roles**: Both, Referrer (the user who shared the code) or Referee (the new user who signed up with it). Sent as `bonusEligibleRole` `BOTH` / `REFERRER` / `REFEREE` | `constants.ts:34-38`; `helper.ts:104-109,169-171`; `pages/Bonus/components/Form.tsx:421-430` |
| When it is given | **Referral Type**: On Signup or On First Deposit. Sent as `referralType` `SIGNUP` / `FTD` | `constants.ts:40-43`; `helper.ts:111-115,172-174`; `Form.tsx:435-439` |
| Amounts, On Signup | Fixed amounts: **Referrer Bonus** (sent as `referrerMinBonusAmount`) and **Referee Bonus** (sent as `maxBonusAmount`). Each field shows only when that side is eligible | `helper.ts:202-210`; `Form.tsx:443-461` |
| Amounts, On First Deposit | The referee's **Minimum Deposit Amount** (`minDepositAmount`). For each eligible side, a release type (Fixed or Percentage) and an amount or percentage: referee `releaseType`, `maxBonusAmount`, `percentage`; referrer `referrerReleaseType`, `referrerMinBonusAmount`, `referrerPercentage` | `helper.ts:177-201`; `Form.tsx:465-540` |
| Turnover | Referral policies can only use the **Bonus × multiplier** turnover formula (the deposit-based formula is hidden for referral) | `Form.tsx:221-224`; `constants.ts:22-25` |
| Common settings | Approval (Auto or Manual), turnover multiplier, instalments, expiry days and the other shared policy fields | `helper.ts:126-152` |
| Saved with | `POST /bonuses/upsert` | `store/api/bonsuApi.ts:15-22` (`upsertBonus`) |

What the user then sees: a `ReferralBonus` row in the Bonus Statement, with its turnover and instalments ([Module 11](../11-bonuses/overview.md)). Applying a policy to a sign-up or first deposit happens in the backend (`INFERRED`; the user app sends only the referral code at sign-up).

**Not part of referrals:** `getUserReference` (`GET /users/reference/user`, `store/api/userApi.ts:54-59`) only looks related by name. Its `reference` value is the P&L figure in the profile drawer (`ProfileDrawer.tsx:64-67`, `totalPL`).

## Findings

All `OBSERVED` from source unless labelled.

| # | Finding | Where |
|---|---|---|
| F1 | **The page has no API of its own.** If the profile has not loaded yet, or has no `referralCode`, both cards show `-` and Copy and Share do nothing, with no message | `index.tsx:14,18-25,36-37` |
| F2 | **The link depends on `VITE_APP_URL`.** If it is not set for an environment, the link card shows `-` while the code card still works | `index.tsx:10,18-19` |
| F3 | The code is put into the link as is, without `encodeURIComponent`. This is only safe while codes use URL-safe characters (`INFERRED`; the code format is not defined in the frontend) | `index.tsx:19` |
| F4 | **Desktop "Share" copies the full promotional message**, but the toast says the code or link was copied | `index.tsx:36-47` |
| F5 | The share message, with the brand name and marketing lines, is hard-coded in each language file, so changing it for a platform means editing every locale | `public/locales/*/common.json` (`referral.shareMessage`) |
| F6 | **A link opens the register modal only on the first load of the app.** If a logged-in visitor opens it, the code is dropped from the URL. Nothing tells them the link is for new accounts | `useReferralRegisterModal.ts:21-33` |
| F7 | `?mode=register` without `refCode` also opens the register modal | `useReferralRegisterModal.ts:21` |
| F8 | **An empty code is sent as `""`**, not left out; the backend reads a blank code as "no referral" (team, Q-60). The other implementation sends `referralCode` only when it is non-empty ([Login and Signup › contract table](../authentication/api-inventory.md#backend-contract-team-provided-2026-11-19-q-21)) | `useRegister.ts:50,97` (Q-60) |
| F9 | No browser check of the code. A wrong code is only reported if the register request fails | `validations.ts:127` (Q-60 b) |
| F10 | Demo users can open the page by typing the URL; they get a message instead of a redirect | `index.tsx:53-56` |

Questions raised: Q-60, Q-61 in [open-questions.md](../../../inventory/open-questions.md). Q-61 is resolved; Q-60 (a) is resolved and (b) is open.
