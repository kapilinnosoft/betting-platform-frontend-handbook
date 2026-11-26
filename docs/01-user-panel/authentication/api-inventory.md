# Login and Signup (API inventory)

The three calls below are user-triggered mutations, not polling. Examples contain placeholders only. Replace them with test values in a controlled environment; do not put real credentials or user data in this handbook.

## `POST /auth/send-code`

Both implementations call this endpoint before registration. The request body has `mobile`, `country`, and `type`; signup sends `type: "register"` (`rsplay:src/pages/Auth/hooks/useRegister.ts:65-77 (useRegister)`, `vishnu7:src/pages/auth/SignupPage.tsx:87-98 (handleGetOtp)`).

```json
{
  "mobile": "<E164_PHONE>",
  "country": "<COUNTRY_CODE>",
  "type": "register"
}
```

The vishnu7 response type includes OTP timing metadata under `mobile`; rsplay declares `{ message: string }`. These are TypeScript declarations, not captured backend responses (`vishnu7:src/store/api/authApi.ts:37-44 (SendOTPResponse)`, `rsplay:src/store/api/authApi.ts:5-14 (sendOtp)`).

## `POST /auth/register`

**Shared API reference:** both endpoint definitions use `POST /auth/register`. **The frontend request bodies differ.** The Q-12 shared backend-template confirmation establishes common APIs, but does not confirm that both payload schemas are interchangeable; see Q-21.

### rsplay request example

The form sends `firstname`, `lastname`, `username`, `password`, `dialCode`, `mobile`, `country`, optional `referralCode`, and `mobileVerificationCode` (`rsplay:src/store/api/authApi.ts:16-35 (registerUser)`, `rsplay:src/pages/Auth/hooks/useRegister.ts:87-99 (handleSubmitForm)`).

```http
POST ${API_BASE_URL}/auth/register
Content-Type: application/json
```

```json
{
  "firstname": "Example",
  "lastname": "User",
  "username": "exampleuser",
  "password": "<REDACTED>",
  "dialCode": "<DIAL_CODE>",
  "mobile": "<E164_PHONE>",
  "country": "<COUNTRY_CODE>",
  "referralCode": "<OPTIONAL_CODE>",
  "mobileVerificationCode": "<OTP_FROM_USER>"
}
```

### vishnu7 request example

The signup component sends both `code` and `mobileVerificationCode` with the same OTP. It includes `referralCode` only when non-empty (`vishnu7:src/store/api/authApi.ts:52-61,85-92 (RegisterCredentials, register)`, `vishnu7:src/pages/auth/SignupPage.tsx:112-128 (onSubmit)`).

```http
POST ${API_BASE_URL}/auth/register
Content-Type: application/json
```

```json
{
  "username": "exampleuser",
  "password": "<REDACTED>",
  "mobile": "<E164_PHONE>",
  "dialCode": "<DIAL_CODE>",
  "country": "<COUNTRY_CODE>",
  "code": "<OTP_FROM_USER>",
  "mobileVerificationCode": "<OTP_FROM_USER>",
  "referralCode": "<OPTIONAL_CODE>"
}
```

The declared rsplay response is `{ success, data, message? }`; vishnu7 declares `{ accessToken, type }`. The vishnu7 UI uses that response to dispatch login and navigate to `/dashboard`; rsplay shows success and opens the login modal (`rsplay:src/store/api/authApi.ts:16-18 (registerUser)`, `vishnu7:src/store/api/authApi.ts:63-66 (RegisterResponse)`, `vishnu7:src/pages/auth/SignupPage.tsx:118-131 (onSubmit)`, `rsplay:src/pages/Auth/hooks/useRegister.ts:101-105 (handleSubmitForm)`).

### Backend contract (team-provided, 2026-11-19, Q-21)

The backend template accepts this body. The team says it is **flexible**: `firstname` and `lastname` may be sent or left out. Values are placeholders.

```json
{
  "firstname": "<optional>",
  "lastname": "<optional>",
  "username": "exampleuser",
  "email": "<EMAIL>",
  "password": "<REDACTED>",
  "dialCode": "<DIAL_CODE>",
  "mobile": "<PHONE>",
  "country": "<COUNTRY_CODE>",
  "emailVerificationCode": "<CODE>",
  "mobileVerificationCode": "<OTP_FROM_USER>",
  "referralCode": "<OPTIONAL_CODE>"
}
```

| Field | Contract | rsplay sends | vishnu7 sends |
|---|---|---|---|
| `firstname`, `lastname` | optional (team) | yes | no |
| `username`, `password`, `dialCode`, `mobile`, `country`, `mobileVerificationCode` | yes | yes | yes |
| `referralCode` | yes | always (`""` when blank, which the backend reads as no referral; see [Module 10](../10-referrals/overview.md#signing-up-with-a-code), Q-60) | when non-empty |
| `email`, `emailVerificationCode` | yes | no | no |
| `code` | **not in the contract** | no | yes (same OTP as `mobileVerificationCode`) |

So both frontend bodies fit the contract. Which contract fields are required, and whether the extra `code` is ignored or rejected by request validation, is `NOT CONFIRMED FROM SOURCE`; vishnu7 also sends `mobileVerificationCode`, so the OTP reaches the backend under the contract name either way.

## `POST /auth/login`

Both UIs send `username`, `password`, and `device` (`rsplay:src/store/api/authApi.ts:38-58 (login)`, `rsplay:src/pages/Auth/hooks/useLogin.ts:32-42 (handleLogin)`, `vishnu7:src/store/api/authApi.ts:20-24,70-75 (LoginCredentials, login)`, `vishnu7:src/pages/auth/LoginPage.tsx:47-55 (onSubmit)`).

```http
POST ${API_BASE_URL}/auth/login
Content-Type: application/json
```

```json
{
  "username": "<USERNAME>",
  "password": "<REDACTED>",
  "device": "<DEVICE_TYPE>"
}
```

The response declarations differ. rsplay reads `accessToken`, `role.name`, and `passwordChanged`; vishnu7 additionally types `mfaRequired` and `isTelegramEnabled`. vishnu7 can then call number or Telegram verification from `OTPModal` (`rsplay:src/store/api/authApi.ts:38-44 (login)`, `vishnu7:src/store/api/authApi.ts:9-19 (LoginResponse)`, `vishnu7:src/pages/auth/LoginPage.tsx:57-77 (onSubmit)`, `vishnu7:src/components/OTPModal.tsx:43-80 (handleSubmit)`). These are source types and UI reads, not captured backend response contracts.