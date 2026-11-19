# Module 9: Deposit and Withdraw (API inventory)

rsplay `@810884b`; paths relative to `src/`. All endpoints inject into the single RTK Query `apiSlice` (`store/api/apiSlice.ts`), which adds `authorization: Bearer <access token>` and retries once after `POST /auth/refresh` on a 401 (see [application architecture §2.3](../../00-overview/application-architecture.md#23-authentication-and-tokens)).

Response shapes come from the TypeScript types and the fields the pages read. They are not captured backend responses. All examples are sanitised placeholders.

## Summary

| # | Endpoint name | Request | Tags | Trigger | Consumer |
|---|---|---|---|---|---|
| W1 | `getDepositAccounts` | `GET /banker/show-account` | provides `Account` | `ON_MOUNT` | Deposit (method selection) |
| W2 | `getDepositWithdraw` | `GET /banker/my-deposit-withdraw` | provides `Account` | `ON_MOUNT`, `ON_STATE_CHANGE` (dates, page, size) | Deposit and withdraw history |
| W3 | `depositWithdrawRequest` | `POST /{upi\|bank}/deposit-withdraw-request` | invalidates `Account`, `User` | `ON_INTERACTION` | UPI/bank deposit; bank/UPI withdraw |
| W4 | `uploadFile` | `POST /upload` (multipart) | invalidates `Account` | `ON_INTERACTION` | Deposit proof; crypto QR |
| W5 | `getBankAccount` | `GET /bank` | provides `Account` | `ON_MOUNT` | Withdraw (saved banks) |
| W6 | `getUpiAccount` | `GET /upi` | provides `Account` | `ON_MOUNT` | Withdraw (saved UPI) |
| W7 | `addBankAccount` | `POST /bank` | invalidates `Account` | `ON_INTERACTION` | Add account → Account tab |
| W8 | `addUpiAccount` | `POST /upi` | invalidates `Account` | `ON_INTERACTION` | Add account → UPI tab |
| W9 | `deleteAccount` | `DELETE /{bank\|upi}/:id` | invalidates `Account` | `ON_INTERACTION` | Bank/UPI card delete |
| W10 | `getUserWallets` | `GET /users/me/wallets` | none | `POLLING` 5 s (header) | Withdrawable balance |
| W11 | `getIsMasterOwner` | `GET /users/is/master-owner/user` | none | `ON_MOUNT` (header) | Access rule |
| W12 | `createCryptoDepositWithdrawRequest` | `POST /crypto/deposit-withdraw-request` | invalidates `DepositWithdraw`, `Account` | `ON_INTERACTION` | Crypto deposit and withdraw |
| W13 | `getCryptoAccounts` | `GET /crypto` | provides `CryptoWithdrawWallet` | `ON_MOUNT` | Withdraw (saved wallets) |
| W14 | `getCryptoNetwork` | `GET /crypto/networks` | none | `ON_MOUNT` of the Crypto tab | Add account → Crypto tab |
| W15 | `addCryptoAccount` | `POST /crypto` | invalidates `CryptoWithdrawWallet` | `ON_INTERACTION` | Add account → Crypto tab |
| W16 | `deleteCryptoAccount` | `DELETE /crypto/:id` | invalidates `CryptoWithdrawWallet`, `DepositWithdraw` | `ON_INTERACTION` | Crypto card delete |

Also used: `GET /system` for the access rule, documented in [Module 1 R9](../01-home-page/api-inventory.md#r9-getsystemsettings-canonical).

W1–W9 are in `store/api/accountApi.ts`; W12 in `store/api/depositApi.ts`; W13–W16 in `store/api/withdrawApi.ts`; W10–W11 in `store/api/userApi.ts`. W12–W14 add `t=<Date.now()>` (the deliberate cache-buster, Q-06); W1–W11 do not. None of these endpoints sets `pollingInterval` except W10 (via the header).

**Response wrapper.** Mutations are typed `{ status?, success?, message, data? }` (`types/account.ts:14-19,31-36,177-189`). The pages read only `message` (for the toast).

---

## W1 `getDepositAccounts`

| Item | Value |
|---|---|
| Definition | `store/api/accountApi.ts:90-96` |
| Call | `pages/Deposit/components/DepositMethodSection.tsx:183` |

**Request.** No parameters.

**Response** `DepositAccountResponse` (`types/account.ts:239-245`): the admin's receiving accounts, grouped by method.

| Field | Fields read | Used for |
|---|---|---|
| `Bank[]` (`DepositBankAccount`, `:247-263`) | `id`, `bankName`, `accountHolder`, `accountNumber`, `ifsc`, `accountType`, `minDepositAmount`, `maxDepositAmount` (strings) | Bank tabs, details card, range check |
| `Upi[]` (`DepositUpiAccount`, `:265-280`) | `id`, `upiId`, `name`, `number`, `qrCode`, `minAmount`, `maxAmount` (strings) | UPI picker, QR, range check |
| `Crypto[]` (`DepositCryptoAccount`, `:223-238`) | `id`, `walletAddress`, `qrImage`, `chain`, `minDepositAmount`, `maxDepositAmount`, `network.name`, `network.paymentOptions[0].{displayName, symbol, usdRate}` | Wallet picker, QR, rate, min/max |

```json
{
  "status": true,
  "message": "…",
  "Bank": [{ "id": "1", "bankName": "<bank>", "accountHolder": "<name>", "accountNumber": "<masked>", "ifsc": "<IFSC>", "accountType": "Savings", "minDepositAmount": "100", "maxDepositAmount": "100000" }],
  "Upi": [{ "id": "2", "upiId": "<upi-id>", "name": "<name>", "number": null, "qrCode": "<image url>", "minAmount": "100", "maxAmount": "50000" }],
  "Crypto": [{ "id": "3", "walletAddress": "<address>", "qrImage": "<image url>", "chain": "<chain>", "minDepositAmount": "1000", "maxDepositAmount": "500000",
              "network": { "name": "<network>", "paymentOptions": [{ "displayName": "<display name>", "symbol": "<symbol>", "usdRate": "<rate>" }] } }]
}
```

## W2 `getDepositWithdraw`

| Item | Value |
|---|---|
| Definition | `store/api/accountApi.ts:69-76` |
| Calls | `DepositHistorySection.tsx:62-68` (`type: 'Credit'`); `WithdrawHistorySection.tsx:70-76` (`type: 'Debit'`) |

**Request** (query string, `DepositWithdrawQueryParams`, `types/account.ts:118-127`):

| Param | Sent by the pages | Value |
|---|---|---|
| `type` | yes | `Credit` (deposit) or `Debit` (withdraw) |
| `page`, `limit` | yes | page from 1; 10, 25, 50 or 100 |
| `fromDate`, `toDate` | yes | UTC ISO strings from the local date pickers |
| `status`, `isUpi`, `isBank` | no | accepted by the type |

**Response** `DepositWithdrawResponse` (`types/account.ts:107-116`): `{ message, data: DepositWithdrawItem[], pagination: { totalItems, limit, currentPage, totalPage } }`. The pages read `pagination.totalItems` only.

`DepositWithdrawItem` (`types/account.ts:83-105`) fields read: `id`, `createdAt`, `updatedAt`, `amount` (string), `status`, `transactionCode`, `remark`, `image`, `bank.bankName`, `upi.upiId`, `crypto.walletAddress`. Declared but not read: `transactionHash`, `conversionRate`, `statusUpdatedAt`, `bankerId`, `digitalPaymentId`, ids.

## W3 `depositWithdrawRequest`

| Item | Value |
|---|---|
| Definition | `store/api/accountApi.ts:37-47`. `method` is removed from the body and becomes the first path segment |
| Calls | `DepositMethodSection.tsx:264-273` (deposit); `pages/Withdraw/components/AccountCard.tsx:42-56` (withdraw) |

**Request** (`DepositWithdrawRequest`, `types/account.ts:73-81`):

| Field | Deposit (`Credit`) | Withdraw (`Debit`) |
|---|---|---|
| `type` | `Credit` | `Debit` |
| `amount` | INR, number | INR, number |
| `UTR` | upper-case UTR | not sent |
| `image` | uploaded proof URL (W4) | not sent |
| `bankId` | receiving bank id (bank) | saved bank id (bank) |
| `UPI` | receiving UPI id (UPI) | saved UPI id (UPI) |

Path: `/bank/deposit-withdraw-request` or `/upi/deposit-withdraw-request`. **Response:** `{ message }` read for the toast.

## W4 `uploadFile`

| Item | Value |
|---|---|
| Definition | `store/api/accountApi.ts:77-89`; body `FormData` with one field `file` |
| Calls | `DepositMethodSection.tsx:262` (at submit); `pages/Deposit/components/Form.tsx:116` (on file select); `pages/Withdraw/components/CryptoAccountForm.tsx:45` (on file select) |

**Response** `UploadFileResponse` (`types/account.ts:129-137`): `{ url, meta: { originalname, filename, mimetype, size } }`. Only `url` is read. The client-side type and size checks are listed in [deposit.md](deposit.md); server-side limits are `NOT CONFIRMED FROM SOURCE`.

## W5 `getBankAccount`

| Item | Value |
|---|---|
| Definition | `store/api/accountApi.ts:55-61` |
| Call | `pages/Withdraw/components/WithdrawAccountsSection.tsx:15` |

**Request.** No parameters (no paging sent). **Response** `BankAccountsResponse` (`types/account.ts:56-66`): `{ status, message, banks: BankAccount[], pagination }`. Fields read from `BankAccount` (`:38-54`): `id`, `bankName`, `accountHolder`, `accountNumber`, `ifsc`.

## W6 `getUpiAccount`

| Item | Value |
|---|---|
| Definition | `store/api/accountApi.ts:62-68` |
| Call | `WithdrawAccountsSection.tsx:16` |

**Response** `UpiAccountResponse` (`types/account.ts:165-175`): `{ status, message, upi: UpiAccount[], pagination }`. Fields read from `UpiAccount` (`:148-163`): `id`, `name`, `upiId`, `number`.

## W7 `addBankAccount`

`store/api/accountApi.ts:21-28`; call `pages/Withdraw/components/AccountForm.tsx:32-39`.

**Request** (`AddBankAccountRequest`, `types/account.ts:3-12`):

```json
{ "accountNumber": "<8-18 digits>", "ifsc": "<IFSC>", "accountHolder": "<name>", "accountType": "Savings", "bankName": "<bank>", "selectType": "Account1" }
```

`selectType` is always `Account1`. `minAmount` / `maxAmount` exist in the type but are not sent.

## W8 `addUpiAccount`

`store/api/accountApi.ts:29-36`; call `pages/Withdraw/components/UpiForm.tsx:30-35`.

**Request** (`AddUPIAccountRequest`, `types/account.ts:21-29`): `{ name, upiId, number, type: 'QR1' }`. `qrCode`, `minAmount`, `maxAmount` are in the type but not sent.

## W9 `deleteAccount`

`store/api/accountApi.ts:48-54`; call `AccountCard.tsx:61-64`. Path `/{type}/{id}` with `type` `bank` or `upi`. **Response** `{ status, message }` (`types/account.ts:68-71`).

## W10 `getUserWallets`

| Item | Value |
|---|---|
| Definition | `store/api/userApi.ts:47-52` (the definition in use, see [Q-01](../../../inventory/api-inventory.md#rsplay-duplicate-endpoint-definitions)) |
| Call | `components/Header.tsx:57-60`, `skip: !isAuthenticated`, `pollingInterval: 5000` |
| Stored by | `store/slices/walletSlice.ts:32-59` (`getUserWallets.matchFulfilled`) |

**Response:** an array of wallets (`Wallet`, `store/api/userApi.ts:3-17`). For `type` `main` (case-insensitive) the slice reads `amount`, `exposureAmount`, `lockedAmount`, `withdrawableBalance`, `depositBalance`, `coinAmount`; for `bonus` it reads `amount`. Everything is converted with `Number()`. This module uses `amount`, `lockedAmount` and `exposureAmount` ([withdrawable balance](withdraw.md#withdrawable-balance)).

```json
[
  { "type": "Main", "amount": "5000.00", "exposureAmount": "-200.00", "lockedAmount": "0.00", "withdrawableBalance": "…", "depositBalance": "…" },
  { "type": "Bonus", "amount": "0.00" }
]
```

## W11 `getIsMasterOwner`

`store/api/userApi.ts:61-66`; call `components/Header.tsx:55` (`skip: !isAuthenticated`). **Response:** a boolean, stored as `state.user.isMasterOwnerUser` (`store/slices/userSlice.ts:41-43`) and read by `useIsMasterOwnerUser` (`hooks/redux.ts:24`). Meaning: see [overview › who can open these pages](overview.md#who-can-open-these-pages).

## W12 `createCryptoDepositWithdrawRequest`

| Item | Value |
|---|---|
| Definition | `store/api/depositApi.ts:41-48` |
| Calls | `pages/Deposit/components/CryptoDeposit.tsx:31-37` (deposit); `pages/Withdraw/CryptoWithdrawForm.tsx:76-80` (withdraw) |

**Request** (`CreateCryptoDepositWithdrawPayload`, `types/deposit.ts:202-208`):

| Field | Deposit (`Credit`) | Withdraw (`Debit`) |
|---|---|---|
| `amount` | **USDT** quantity | **INR** |
| `cryptoId` | receiving wallet id (W1 `Crypto[].id`) | saved wallet id (W13) |
| `image` | proof URL, or empty | not sent |
| `transactionCode` | transaction hash | not sent |

Units are team-confirmed (Q-32). **Response:** `{ message }` read for the toast.

## W13 `getCryptoAccounts`

`store/api/withdrawApi.ts:93-100`; call `pages/Withdraw/CryptoAccountList.tsx:7`. **Response** `CryptoWalletResponse` (`types/withdraw.ts:118-123`): `{ wallets: CryptoWallet[] }`. Fields read: `id`, `walletAddress`, `qrImage`, `network.paymentOptions[0].{usdRate, displayName}`.

## W14 `getCryptoNetwork`

`store/api/withdrawApi.ts:102-109`; call `pages/Withdraw/CryptoNetworkSelector.tsx:15`. **Response** `CryptoNetworkResponse` (`types/withdraw.ts:87-92`): `{ data: CryptoNetwork[] }`. Fields read: `id`, `name`, `type`, `paymentOptions[0].displayName`.

## W15 `addCryptoAccount`

`store/api/withdrawApi.ts:111-118`; call `pages/Withdraw/components/CryptoAccountForm.tsx:62-66`. **Request** `{ walletAddress, qrImage, networkId }` (`AddCryptoWalletRequest`, `withdrawApi.ts:7-11`).

## W16 `deleteCryptoAccount`

`store/api/withdrawApi.ts:120-126`; call `CryptoWithdrawForm.tsx:66`. Path `/crypto/:id`. Untyped; `message` read for the toast.

---

## Unused definitions

`OBSERVED`: no hook or `endpoints.X` reference at HEAD outside the API files. Listed so they are not mistaken for live calls; not documented further (Q-01 rule).

| Name | Request | File |
|---|---|---|
| `getActiveBanker` | `GET /banker/show-account` (same URL as W1) | `store/api/depositApi.ts:13-19` |
| `createDepositWithdrawRequest` | `POST /payment/deposit-withdraw-request` | `depositApi.ts:22-29` |
| `createAccountDepositRequest` | `POST /bank/deposit-withdraw-request` (same URL as W3 for bank) | `depositApi.ts:31-38` |
| `getMyDepositWithdraw` | `GET /banker/my-deposit-withdraw` (same URL as W2) | `depositApi.ts:51-84` |
| `createEwallet` | `POST /payment/ewallet` | `store/api/withdrawApi.ts:21-35` |
| `createBankAccount` | `POST /bank` (same URL as W7, different body) | `withdrawApi.ts:38-55` |
| `getUserPaymentAccounts` | `GET /payment` | `withdrawApi.ts:58-65` |
| `deletePaymentAccount` | `DELETE /payment/:id` | `withdrawApi.ts:68-74` |
| `getUserBankAccounts` | `GET /bank` with `page`, `limit` (same URL as W5) | `withdrawApi.ts:76-83` |
| `deleteBankAccount` | `DELETE /bank/:id` (same URL as W9 for bank) | `withdrawApi.ts:85-91` |

The component `pages/Withdraw/CryptoWalletModal.tsx` also calls W4 and W15, but it is imported nowhere, so those calls never run from it.
