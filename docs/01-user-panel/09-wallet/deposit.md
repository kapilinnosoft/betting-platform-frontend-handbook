# Module 9: Deposit

rsplay `@810884b`; paths relative to `src/`. Page `pages/Deposit/index.tsx` (`DepositPage`) renders three parts: `DepositHeader`, `DepositMethodSection` and `DepositHistorySection` (`:60-68`).

## Method selection

The method is held in the URL: `/deposit?type=upi|bank|crypto` (`getDepositMethod`, `pages/Deposit/index.tsx:10-13`; same helper in `DepositMethodSection.tsx:24-27`). Any other value means "no method chosen".

On load, `DepositMethodSection` calls [`GET /banker/show-account`](api-inventory.md#w1-getdepositaccounts) and splits the response into `Bank`, `Upi` and `Crypto` lists (`DepositMethodSection.tsx:183-189`). These are the **admin's receiving accounts**, not the user's saved accounts.

| No `type` (selector cards) | Behaviour | Source |
|---|---|---|
| UPI card | Button when `Upi` has entries, else "no UPI account" text. Click → `?type=upi`, no UPI pre-selected | `DepositMethodSection.tsx:86-100,216-219` |
| Bank card | Button when `Bank` has entries. Click → first bank selected, `?type=bank` | `:117-139,221-224` |
| Crypto card | Button when `Crypto` has entries. Click → `?type=crypto` | `:154-167,225-228` |

The header shows "Deposit" or "Deposit via {method}" with a back button to `/deposit` when a method is set (`pages/Deposit/index.tsx:15-58`).

## UPI and bank deposit

**Layout** (`DepositMethodSection.tsx:294-381`): left, the deposit rules, the receiving-account picker and its details card; right, `DepositForm`.

| Method | Picker | Details shown | Source |
|---|---|---|---|
| UPI | `<select>` of `upiId`; nothing pre-selected, a prompt shows until one is chosen | QR image, UPI ID with copy button, min and max | `:304-333`; `UpiDetailsCard.tsx:56-79` |
| Bank | One tab per bank (`bankName`); first bank pre-selected | Bank, account holder, IFSC, account number, type, min and max | `:191-201,353-373`; `BankDetailsCard.tsx:33-46` |

### Form fields and validation

`DepositForm` uses `depositSchema` (`utils/validations.ts:174-192`):

| Field | Rule | Source |
|---|---|---|
| UTR (`txnRef`) | Trimmed; 8–22 characters; letters and digits only; at least one digit; no spaces; sent upper-cased | `validations.ts:175-183`; input `maxLength={22}` (`DepositForm.tsx:61-68`) |
| Payment proof (`proof`) | Required file, image or PDF (`accept="image/*,application/pdf"`), ≤ 5 MB | `validations.ts:187-189`; `DepositForm.tsx:76-88` |
| Amount | Number ≥ 100; the keys `e E + - .` are blocked, so whole rupees only | `validations.ts:185`; `DepositForm.tsx:111-127` |
| Quick amounts | `+500`, `+1,000`, `+5,000`, `+10,000`, `+50,000`, `+1,00,000`; each click **adds** to the current amount | `DepositForm.tsx:9,129-153` |
| Agree checkbox | Must be ticked ("I Agree To Payment & Withdrawal Policy") | `validations.ts:191`; `DepositForm.tsx:156-161` |

### Submit

`handleDepositSubmit` (`DepositMethodSection.tsx:229-280`):

1. A method must be set, and a bank (bank) or UPI (UPI) must be selected, else an error toast.
2. **Range check:** `min = Number(minDepositAmount ?? 0)` and `max = Number(maxDepositAmount ?? 0)` for bank, or `minAmount` / `maxAmount` for UPI. The amount must satisfy `min ≤ amount ≤ max`. Min and max are always set on deposit accounts (team-confirmed, Q-37; [F7](overview.md#findings)).
3. Upload the proof: [`POST /upload`](api-inventory.md#w4-uploadfile) → `url`.
4. Create the request: [`POST /{method}/deposit-withdraw-request`](api-inventory.md#w3-depositwithdrawrequest) with:

```json
{
  "type": "Credit",
  "amount": 1500,
  "UTR": "<UTR, upper-case>",
  "image": "<uploaded proof url>",
  "bankId": 12
}
```

For UPI, `UPI: <upi account id>` replaces `bankId`. `method` is moved into the URL and not sent in the body (`store/api/accountApi.ts:41-45`).

5. Success: toast, and the form resets (`triggerReset`). Failure: the backend `message` or a generic toast.

## Crypto deposit

Component `CryptoDeposit` (`pages/Deposit/components/CryptoDeposit.tsx`) with the form `Form` (`pages/Deposit/components/Form.tsx`, rendered with `type="crypto"`).

| Item | Behaviour | Source |
|---|---|---|
| Wallet picker | `<select>` of the admin crypto wallets, labelled by `network.paymentOptions[0].displayName` (or `network.name`). The first wallet is pre-selected | `CryptoDeposit.tsx:21-25,56-72` |
| Wallet card | QR, shortened address (`first 6…last 4`) with copy, "1 {chain} = {usdRate} INR", "Deposit between {min} INR and {max} INR" | `CryptoRateDisplay.tsx:26-29,58-72`; values from `CryptoDeposit.tsx:81-89` |
| No wallet | `EmptyState`, and the submit button is disabled | `CryptoDeposit.tsx:45,75-78,101` |

### Conversion and validation

The user types a **whole USDT quantity**; the INR field is computed and read-only (`CryptoRateConvertor.tsx:44-59,123-131`):

```
fiat (INR) = crypto (USDT) × usdRate
usdRate    = selected wallet .network.paymentOptions[0].usdRate
```

| Field | Rule | Source |
|---|---|---|
| Crypto (USDT) | Digits only (`/^\d*$/`), up to 8 characters; `−`/`+` buttons step by 1 | `CryptoRateConvertor.tsx:50-59,75-102` |
| INR (`fiat`) | Must be ≥ the wallet's `minDepositAmount`. **No maximum check** ([F2](overview.md#findings)) | `utils/validations.ts:243`; min from `CryptoDeposit.tsx:96` |
| Transaction hash (`utr`) | Required; letters and digits; 6–100 characters; spaces removed while typing | `validations.ts:236-241`; `Form.tsx:203-211` |
| Payment proof | Optional. JPEG, PNG or WebP, ≤ 5 MB; uploaded to [`POST /upload`](api-inventory.md#w4-uploadfile) **as soon as it is chosen** | `validations.ts:244`; `Form.tsx:93-125` |
| Quick amounts | Same six values as the INR form, but they add **USDT** (intended, Q-36; [F3](overview.md#findings)) | `Form.tsx:74-79,332-355` |
| Submit | Disabled with no wallet, while loading, or for demo users | `Form.tsx:359-361` |

### Submit

[`POST /crypto/deposit-withdraw-request`](api-inventory.md#w12-createcryptodepositwithdrawrequest) (`CryptoDeposit.tsx:28-44`):

```json
{
  "type": "Credit",
  "amount": 50,
  "cryptoId": 3,
  "image": "<uploaded proof url or empty>",
  "transactionCode": "<transaction hash>"
}
```

`amount` is the **USDT quantity** (team-confirmed, Q-32). The INR value and the rate are not sent.

## Deposit rules

Collapsible box, open by default (`DepositRules.tsx:7`). Text comes from translations (`deposit.rules.items`, `public/locales/en/common.json`), English version:

1. Deposit money only in the below available accounts to get the fastest credits and avoid possible delays.
2. Deposits made 45 minutes after the account removal from the site are valid & will be added to their wallets.
3. Site is not responsible for money deposited to Old, Inactive or Closed accounts.
4. After deposit, add your UTR and amount to receive balance.
5. NEFT receiving time varies from 40 minutes to 2 hours.

These are display text only; the frontend does not enforce them.

## Deposit history

`DepositHistorySection` (`pages/Deposit/components/DepositHistorySection.tsx`), shown under every deposit view.

| Item | Value | Source |
|---|---|---|
| API | [`GET /banker/my-deposit-withdraw`](api-inventory.md#w2-getdepositwithdraw) with `type=Credit`, `page`, `limit`, `fromDate`, `toDate` | `:62-68` |
| Default range | Last 7 days: start of the day 6 days ago → end of today (local time, sent as UTC ISO) | `:49-52,66-67` |
| Range guard | If From is after To, To is set to From | `:56-60` |
| Page size | 10 (options 10, 25, 50, 100); changing dates or size returns to page 1 | `:53-54,131-154` |

| Column | Field | Source |
|---|---|---|
| Txn ref ID | `id` | `:73` |
| Request at / Updated at | `createdAt` / `updatedAt` as `DD/MM/YYYY, hh:mm A` | `:25-28,74-75` |
| Amount | `amount` (string, as returned) | `:76` |
| Payment method | `bank` → Bank, else `crypto` → Crypto, else UPI | `:77-81` |
| UTR | `transactionCode`, else `-` | `:82` |
| Status | badge, see [overview](overview.md#request-lifecycle) | `:101-109` |
| Remark | eye icon opening `RemarkModal` when `remark` is set | `:110-125,173-177` |
