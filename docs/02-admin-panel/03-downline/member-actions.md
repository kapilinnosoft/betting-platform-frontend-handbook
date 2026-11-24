# Admin Module A3: Member actions

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. These actions are on the **level list** rows (`pages/Downline/AllDownlineListing.tsx`). Every modal opens in the shared `Modal` with `selectedUser` set from the row (`AllDownlineListing.tsx:921-1006`). After a successful mutation, the `Members` tag is invalidated and the list refetches.

| Action | Agent rows | USER rows | Permission | Request |
|---|---|---|---|---|
| D (Deposit) | ✓ | ✓ | `update` | `POST users/{id}/wallets/deposit` |
| W (Withdraw) | ✓ | ✓ | `update` | `POST users/{id}/wallets/withdraw` |
| Coin | — | ✓ | `update` | `POST /coin/deposit/{id}` / `POST /coin/withdraw/{id}` |
| Profile | ✓ | ✓ | `detailedView` | opens [account details](account-details.md) |
| Sport Permission | ✓ | ✓ | `update` | `GET` + `PUT /sports-permission/{id}` |
| Change Status | ✓ | ✓ | `update` | `PATCH /users/change-status/{id}` |
| Bet History | — | ✓ | `detailedView` | opens account details › Bet List |
| New User Access | ✓ (Owner and role users) | — | `update` | `PATCH /users/change/{id}` |
| Login As | ✓ (Owner only) | — | `update` | `GET /auth/gettoken/{id}` |
| Change Password | from Account Summary only | same | Account Summary rule | `PATCH /admin/users/password/{id}` |

## Deposit and Withdraw

Component: `components/common/DepositWithdraw.tsx` with `mode="deposit"` or `"withdraw"`.

| Item | Deposit | Withdraw | Source |
|---|---|---|---|
| Title | "Deposit - {username}" | "Withdraw - {username}" | `AllDownlineListing.tsx:939-946` |
| First field | "Current Balance" = row `availableBalance` | "Withdrawable Balance" = row `withdrawalBalance` | `DepositWithdraw.tsx:58,66-68`; `AllDownlineListing.tsx:439-463` |
| Amount | number, positive, 1 to 999,999,999 (`AmountSchema`) | same | `utils/validation.tsx:498-510` |
| Updated Balance | current + amount | current − amount | `DepositWithdraw.tsx:70-73` |
| Extra check | — | amount > withdrawable → toast "Withdraw amount exceeds current balance", no request | `DepositWithdraw.tsx:111-114` |
| `fromAccount` | the logged-in name* | the member's username | `DepositWithdraw.tsx:117` |
| `toAccount` | the member's username | the logged-in name* | `DepositWithdraw.tsx:118` |
| `narration` / `refernce` | "Deposit by Owner" (for any role, F10) | "Withdraw by Owner" | `DepositWithdraw.tsx:120-121` |
| Success toast | "Amount credited successfully" | "Amount debited successfully" | `DepositWithdraw.tsx:62` |

\*The logged-in name is `"OWNER"` for the Owner, the **email** for role users, and the **username** for agents (`DepositWithdraw.tsx:34-35`).

Full body: `{ amount, fromAccount, toAccount, userId, narration, refernce }`. `userId` goes in the URL; the rest is the body (`store/api/commonApi.ts:91-122`). Deposit invalidates `BalanceSummaryDataApi`, `Bankers`, `Members`, `Wallet`. Withdraw invalidates the same tags except `BalanceSummaryDataApi`, so the balance strip ([DL2](api-inventory.md#dl2-getsummary)) does **not** refresh after a withdraw.

When the buttons are disabled: `disabled={!canUpdate && isDisable(status)}` (agent rows) and `!canUpdate && (isselfregistered || isDisable(status))` (user rows). Because of the `&&`, Owner and agents can open D/W for inactive, suspended and bet-locked members, and for self-registered users (F2, Q-41). Team (2026-11-24): the backend does not reject transfers for any status; financial activity must be limited to **active** members by the frontend, so this is a confirmed defect.

## Coin (USER rows)

`pages/Downline/Modal/CoinDepositWithdraw.tsx`. The modal has Deposit and Withdraw tabs. The amount is validated by `CoinTransactionSchema` (coerced number, 1 to 999,999,999; `validation.tsx:512-518`). Body: `{ userId, amount, fromAccount, toAccount, narration: 'Coin Deposit' | 'Coin Withdraw' }`, with from/to chosen the same way as D/W (`CoinDepositWithdraw.tsx:61-68`). Requests: `POST /coin/deposit/{userId}` and `POST /coin/withdraw/{userId}` (`store/api/coinApi.ts:46-63`). They invalidate `CoinManagement`, `Wallet`, `Bankers`, `Members`. There is no client-side balance check for coin withdraw.

## Sport Permission

`pages/Downline/Modal/SportPermission.tsx`.

| Step | Detail | Source |
|---|---|---|
| Load | `GET /sports-permission/{userId}` when the modal opens | `SportPermission.tsx:23` |
| Initial list | Cricket, Soccer, Tennis, Grayhound, HorseRacing, Casino (`initialSports`) | `utils/constent.ts:61-69` |
| Apply the response | `permission == null` → all active. Otherwise each sport is active only if `permission.permission[]` has the same name (case-insensitive) with `allowed: true`. A sport missing from the response becomes **inactive** | `SportPermission.tsx:41-59` |
| Toggle | Per-sport switch | `SportPermission.tsx:61-63,126-138` |
| Save | `PUT /sports-permission/{userId}` with `{ data: [{ name, allowed }, …] }` for all six | `SportPermission.tsx:65-83` |

The name "Grayhound" is matched case-insensitively against the backend's names. If the backend uses "Greyhound", that sport always loads as inactive (`INFERRED` from string comparison, `BACKEND CONFIRMATION REQUIRED`).

## Change Status

`pages/Downline/Modal/ChangeStatus.tsx`. The four options are Active, Inactive, Suspended and Bet Lock (`utils/constent.ts:71-76`). The current status is pre-selected by mapping `active`/`inactive`/`suspended`/`bet_lock` to `Active`/`Inactive`/`Suspended`/`BetLock` (`ChangeStatus.tsx:20-37`). Submit sends `PATCH /users/change-status/{userId}` with `{ status: 'Active' | 'Inactive' | 'Suspended' | 'BetLock' }` (`store/api/DownlineApi.ts:213-221`). An error is shown with a **success** toast style (F9, Q-47).

Effect on the member: the admin layout logs out a logged-in **agent** whose status becomes `inactive` or `suspended` within about 20 s ([A1](../01-login-and-layout/overview.md#session-and-logout)). The effect on players in the User Panel is outside this module.

## New User Access

Owner and role users see a checkbox column bound to `isVerified` (`AllDownlineListing.tsx:156-188`). Clicking it asks "Are you sure you want to grant/revoke new user access for {username}?" (`Modal/UserAccessConfirm.tsx:31-35`). Confirm sends `PATCH /users/change/{userId}` with **no body** (`DownlineApi.ts:222-228`). `INFERRED`: the backend toggles the flag. What "new user access" allows (for example letting an agent's players self-register) is `BACKEND CONFIRMATION REQUIRED`.

## Login As

Owner only, agent levels only. The full hand-off is in [A1 › Login as](../01-login-and-layout/overview.md#login-as-owner-opens-an-agent-session). The button is disabled while its own code request is running (`AllDownlineListing.tsx:546`). If `VITE_AGENT_URL` is not configured, the toast reads "Agent panel URL is not configured." (`:126-129`).

## Change Password (from Account Summary)

`pages/Downline/Modal/PasswordChange.tsx`, opened from the Password row of [Account Summary](account-details.md#account-summary). Fields: New Password and Confirm Password (`changePasswordSchema`). "Generate Password" sets both to the fixed `asdf1234` and shows them as text (F1, Q-40). Request: `PATCH /admin/users/password/{id}` with `{ newPassword }` (`store/api/commonApi.ts:34-49`). The role-user variant (`PATCH /privileges/change-password/{id}`, `store/api/rolesApi.ts:196-211`) is used only when `isRoleUser` is passed, and no caller here passes it (`PasswordChange.tsx:30,76-88`). The error fallback text says "Failed to create member" (`:92`).

## Not reachable at this commit

| Modal | Why | Source |
|---|---|---|
| Credit Reference edit (`CreditLimit`, `POST /users/{id}/wallets/give/credit-limit`) | edit icons are commented out | `AllDownlineListing.tsx:227-237`; `SubUsers.tsx:162-172` |
| Owner MFA Status (`GET /mfa/owner/status`, `POST /mfa/owner/disable`) | MFA buttons are commented out | `AllDownlineListing.tsx:505-519`; `SubUsers.tsx:678-692` |
| Any modal on the drill-down list | nothing sets `activeModal` | `SubUsers.tsx:834-867` |

Their API definitions are listed in [api-inventory.md](api-inventory.md#defined-for-downline-but-not-reachable) for completeness.
