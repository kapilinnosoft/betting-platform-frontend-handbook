# Login and Signup (common auth module)

This supplemental module documents the shared authentication API paths used by both frontend snapshots. It groups the behavior as one module while keeping form payload and post-login differences explicit.

## Flow

1. Signup requests an OTP with `POST /auth/send-code`, using `type: "register"` (`rsplay:src/pages/Auth/hooks/useRegister.ts:65-77 (useRegister)`, `vishnu7:src/pages/auth/SignupPage.tsx:87-103 (handleGetOtp)`).
2. After OTP entry, signup submits `POST /auth/register` (`rsplay:src/pages/Auth/hooks/useRegister.ts:87-99 (handleSubmitForm)`, `vishnu7:src/pages/auth/SignupPage.tsx:112-128 (onSubmit)`).
3. Login submits `POST /auth/login` with username, password and device (`rsplay:src/pages/Auth/hooks/useLogin.ts:32-42 (handleLogin)`, `vishnu7:src/pages/auth/LoginPage.tsx:47-55 (onSubmit)`).
4. The UI handles results locally: rsplay opens the login modal after registration; vishnu7 stores the returned login data and navigates to `/dashboard` (`rsplay:src/pages/Auth/hooks/useRegister.ts:101-105 (handleSubmitForm)`, `vishnu7:src/pages/auth/SignupPage.tsx:118-131 (onSubmit)`). vishnu7 login may also open number or Telegram verification when the response indicates MFA (`vishnu7:src/pages/auth/LoginPage.tsx:57-77 (onSubmit)`).

The URL and method for `registerUser` / `register` match, but the request fields do not. Use the per-frontend examples in [api-inventory.md](api-inventory.md); do not treat one body's schema as the other's contract.

## Entry points and routing

rsplay exposes its modal renderer through `ModalManager` (`rsplay:src/App.tsx:131-132 (App)`); signup and login hooks call the active definitions in `src/store/api/authApi.ts` (`rsplay:src/pages/Auth/hooks/useRegister.ts:9,87-105 (useRegister)`, `rsplay:src/pages/Auth/hooks/useLogin.ts:6,32-63 (useLoginPage)`).

The vishnu7 `LoginPage` and `SignupPage` components call their auth mutations, but the `/login` and `/signup` routes are commented out at the documented commit (`vishnu7:src/App.tsx:49-53 (App routes)`). The `SignupPage` component still shows those links and implements the request flow (`vishnu7:src/pages/auth/SignupPage.tsx:29-35,87-138,275-279 (SignupPage)`).

## Common paths, distinct frontend behavior

| Action | API path | Shared aspect | Frontend-specific behavior |
|---|---|---|---|
| Send registration OTP | `POST /auth/send-code` | Both send `mobile`, `country`, and `type: "register"`. | The selected country defaults differ; see the API reference. |
| Register | `POST /auth/register` | Same HTTP method and path. | Request bodies differ; rsplay includes first/last name and `mobileVerificationCode`, while vishnu7 sends `code` and `mobileVerificationCode` with the same OTP. |
| Login | `POST /auth/login` | Both send `username`, `password`, and `device`. | vishnu7 can require an additional number or Telegram verification. rsplay checks role and password-change state before completing login. |

No live responses were captured. Request and response shapes are based on source types and the fields read by the UI.