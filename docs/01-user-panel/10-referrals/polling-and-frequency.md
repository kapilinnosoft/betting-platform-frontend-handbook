# Module 10: Referrals (polling and frequency)

rsplay `@7a89e53`; paths relative to `src/`.

**Nothing in this module polls.** The Referral page imports no API hook and uses no `setInterval` or socket. `useReferralRegisterModal` runs once per app load (`OBSERVED`). The layout's polls still run on this page; see [polling inventory › rsplay](../../../inventory/polling-and-frequency-inventory.md#always-on-polling-every-page-under-homelayout).

## When each request runs

| Request | Class | Runs when | Source |
|---|---|---|---|
| R1 `GET /users/me` | `ON_MOUNT` (header) | The header mounts with a logged-in user. Opening the Referral page does not request it again | `components/Header.tsx:54` |
| R2 `POST /auth/register` | `ON_INTERACTION` | Register submit in the register modal | `pages/Auth/hooks/useRegister.ts:87-99` |

## Browser-only actions (no request)

| Action | What happens | Source |
|---|---|---|
| Copy | Clipboard write, toast | `pages/Referral/index.tsx:21-25` |
| Share | System share sheet, or clipboard copy of the message | `index.tsx:36-47` |
| Open a referral link | Register modal opens, or `mode`/`refCode` are removed for a logged-in visitor | `hooks/useReferralRegisterModal.ts:20-33` |

## Request volume

| Action | Requests |
|---|---|
| Open the Referral page | 0 |
| Copy or Share | 0 |
| Open a referral link and register | 1 `POST /auth/register` (plus the OTP request in [Login and Signup](../authentication/overview.md)) |
