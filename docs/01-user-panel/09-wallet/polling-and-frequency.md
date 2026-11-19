# Module 9: Deposit and Withdraw (polling and frequency)

rsplay `@810884b`; paths relative to `src/`.

**No deposit or withdraw API is polled.** None of the hooks in `pages/Deposit` or `pages/Withdraw` sets `pollingInterval`, and the pages use no `setInterval` or socket (`OBSERVED`, search at HEAD). Two layout polls matter for this module:

| Poll | Interval | Why it matters here | Source |
|---|---|---|---|
| `GET /users/me/wallets` ([W10](api-inventory.md#w10-getuserwallets)) | **5 s** | Feeds the withdrawable balance on every withdraw card | `components/Header.tsx:57-60` |
| `GET /system` ([Module 1 R9](../01-home-page/api-inventory.md#r9-getsystemsettings-canonical)) | **30 s**, plus `refetchOnMountOrArgChange` | `FeatureRoute` subscribes on each visit; a master-owner user is redirected away if the setting turns off while the page is open (`INFERRED` from re-render on new data) | `components/common/FeatureRoute.tsx:14-17` |

The other always-on layout calls (`/fixture/counts` 2 s, alerts 30 s) also run here; see [polling inventory › rsplay](../../../inventory/polling-and-frequency-inventory.md#always-on-polling-every-page-under-homelayout).

## When each request runs

| Request | Class | Runs when | Source |
|---|---|---|---|
| W1 `GET /banker/show-account` | `ON_MOUNT` | Deposit page opens (once per visit while cached) | `DepositMethodSection.tsx:183` |
| W2 `GET /banker/my-deposit-withdraw` | `ON_MOUNT`, `ON_STATE_CHANGE` | Page opens; From/To change; page or size change | `DepositHistorySection.tsx:62-68`; `WithdrawHistorySection.tsx:70-76` |
| W3 `POST /{upi\|bank}/deposit-withdraw-request` | `ON_INTERACTION` | Deposit submit (after W4) or bank/UPI Withdraw click | `DepositMethodSection.tsx:264`; `AccountCard.tsx:42` |
| W4 `POST /upload` | `ON_INTERACTION` | UPI/bank: at submit. Crypto deposit and crypto account: when a file is chosen | `DepositMethodSection.tsx:262`; `Form.tsx:116`; `CryptoAccountForm.tsx:45` |
| W5 `GET /bank`, W6 `GET /upi` | `ON_MOUNT` | Withdraw page opens | `WithdrawAccountsSection.tsx:15-16` |
| W7 / W8 `POST /bank`, `POST /upi` | `ON_INTERACTION` | Save in the Add account modal | `AccountForm.tsx:32`; `UpiForm.tsx:30` |
| W9 `DELETE /{bank\|upi}/:id` | `ON_INTERACTION` | Delete icon | `AccountCard.tsx:61` |
| W12 `POST /crypto/deposit-withdraw-request` | `ON_INTERACTION` | Crypto deposit submit or crypto Withdraw click | `CryptoDeposit.tsx:31`; `CryptoWithdrawForm.tsx:76` |
| W13 `GET /crypto` | `ON_MOUNT` | Withdraw page opens | `CryptoAccountList.tsx:7` |
| W14 `GET /crypto/networks` | `ON_MOUNT` | Crypto tab of the Add account modal opens | `CryptoNetworkSelector.tsx:15` |
| W15 `POST /crypto`, W16 `DELETE /crypto/:id` | `ON_INTERACTION` | Save / delete icon | `CryptoAccountForm.tsx:62`; `CryptoWithdrawForm.tsx:66` |

## What refreshes after a change

`OBSERVED` tags; the refetch itself is RTK Query behaviour (`INFERRED`): only queries that are mounted refetch; unmounted cached entries are dropped and fetched on the next visit.

| After | Invalidates | Refetches on the open page |
|---|---|---|
| Bank/UPI deposit or withdraw (W3) | `Account`, `User` | Deposit accounts (W1), saved banks and UPI (W5, W6), history (W2), profile (`User`) |
| Crypto deposit or withdraw (W12) | `DepositWithdraw`, `Account` | Same `Account` queries, including history |
| Any upload (W4) | `Account` | Same `Account` queries ([F9](overview.md#findings)) |
| Add / delete bank or UPI (W7–W9) | `Account` | Same `Account` queries |
| Add / delete crypto wallet (W15, W16) | `CryptoWithdrawWallet` (+ `DepositWithdraw` on delete) | Saved crypto wallets (W13) |

The wallet balance is **not** tagged, so it changes only with the next 5 s poll ([F11](overview.md#findings)).

## Cache behaviour worth knowing

`INFERRED` from RTK Query 1.9.7 defaults (`keepUnusedDataFor` 60 s; no override in `apiSlice.ts`):

- Returning to `/deposit` or `/withdraw` within 60 s shows cached accounts and history without a new request, unless a mutation invalidated them in between.
- Default history dates are start of day (6 days ago) and end of today, so they are the same on every visit that day and reuse the same cache entry.
- W12–W14 add `t=<now>` inside the query function; it is not part of the cache key, so it bypasses HTTP caches but not RTK's.
