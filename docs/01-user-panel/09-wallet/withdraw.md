# Module 9: Withdraw

rsplay `@810884b`; paths relative to `src/`. Page `pages/Withdraw/index.tsx` (`WithdrawPage`) renders `WithdrawAccountsSection`, `WithdrawRules` and `WithdrawHistorySection` (`:6-14`).

There is no separate withdraw form: **each saved account is a card with its own amount box and Withdraw button.** The user withdraws to an account by using that account's card.

## Saved accounts

`WithdrawAccountsSection` (`pages/Withdraw/components/WithdrawAccountsSection.tsx`):

| List | API | Card | Source |
|---|---|---|---|
| Bank accounts | [`GET /bank`](api-inventory.md#w5-getbankaccount) → `banks[]` | `AccountCard type="bank"`: bank name, holder name, account number, IFSC | `:15,52-54`; `AccountCard.tsx:86-112` |
| UPI accounts | [`GET /upi`](api-inventory.md#w6-getupiaccount) → `upi[]` | `AccountCard type="upi"`: name, UPI ID, phone | `:16,55-57`; `AccountCard.tsx:113-133` |
| Crypto wallets | [`GET /crypto`](api-inventory.md#w13-getcryptoaccounts) → `wallets[]` | `CryptoWithdrawForm`: QR, address with copy, rate converter | `CryptoAccountList.tsx:7-30` |

While the bank or UPI list loads, "Loading accounts" is shown (`WithdrawAccountsSection.tsx:46-49`). With no accounts the grid is simply empty.

## Adding an account

"Add account" opens `AddAccountModal` with three tabs: Account (bank), UPI and Crypto (`WithdrawAccountsSection.tsx:33-42,64-66`; `AddAccount.tsx:10-36`). Each form closes the modal on success; the new account appears because the list's cache tag is invalidated.

| Tab | Fields and rules | Request | Source |
|---|---|---|---|
| Account | Type: savings / current. Bank name 2–50. Holder name 2–50. Account number 8–18 digits. IFSC 11 characters, `^[A-Z]{4}0[A-Z0-9]{6}$` (typed upper-case) | [`POST /bank`](api-inventory.md#w7-addbankaccount) `{ accountNumber, ifsc, accountHolder, accountType: 'Savings'\|'Current', bankName, selectType: 'Account1' }` | `utils/validations.ts:152-170`; `AccountForm.tsx:30-46` |
| UPI | Name 2–50. UPI ID `^[\w.-]+@[\w.-]+$`. Phone `^[6-9]\d{9}$` (10-digit Indian mobile) | [`POST /upi`](api-inventory.md#w8-addupiaccount) `{ name, upiId, number, type: 'QR1' }` | `validations.ts:196-205`; `UpiForm.tsx:28-42` |
| Crypto | Network from [`GET /crypto/networks`](api-inventory.md#w14-getcryptonetwork) (required). Wallet address 10–100 letters and digits. QR image required (JPEG/PNG/WebP), uploaded on selection via [`POST /upload`](api-inventory.md#w4-uploadfile) | [`POST /crypto`](api-inventory.md#w15-addcryptoaccount) `{ walletAddress, qrImage, networkId }` | `validations.ts:268-277`; `CryptoAccountForm.tsx:32-73`; `CryptoNetworkSelector.tsx:15-16` |

## Deleting an account

The red delete icon on each card deletes immediately; there is no confirmation ([F6](overview.md#findings)).

| Account | Request | Source |
|---|---|---|
| Bank / UPI | [`DELETE /{bank\|upi}/:id`](api-inventory.md#w9-deleteaccount) | `AccountCard.tsx:59-70,79` |
| Crypto | [`DELETE /crypto/:id`](api-inventory.md#w16-deletecryptoaccount) | `CryptoWithdrawForm.tsx:63-72,100` |

## Withdrawable balance

Every withdraw card computes the same limit from the `wallet` Redux slice (`OBSERVED`):

```
withdrawable = mainBalance − lockedAmount + exposure
```

| Term | Wallet field (`type: 'main'` wallet) | Source |
|---|---|---|
| `mainBalance` | `amount` | `store/slices/walletSlice.ts:46-47` |
| `lockedAmount` | `lockedAmount` | `walletSlice.ts:49` |
| `exposure` | `exposureAmount` (≤ 0; team-confirmed, Q-34) | `walletSlice.ts:48` |

So the limit is the main balance minus the locked amount minus the absolute exposure. It is consistent with the header balance, `amount − |exposureAmount|` (`components/Header.tsx:62-65`), minus the locked amount. The wallet also returns `withdrawableBalance`, which the slice stores (`walletSlice.ts:50`) but these pages do not use; the team confirmed the frontend formula is the intended one (Q-34).

The wallet data comes from `GET /users/me/wallets`, polled every 5 s by the header (`components/Header.tsx:57-60`), so the limit follows the balance with up to 5 s delay ([F11](overview.md#findings)). The bonus wallet is never withdrawable (rule 2 below; the slice keeps it separately as `bonusBalance`).

## Bank and UPI withdraw

`AccountCard` (`pages/Withdraw/components/AccountCard.tsx`) with `AmountInput`:

| Item | Value | Source |
|---|---|---|
| Range | **100** to withdrawable (INR) | `AccountCard.tsx:30-31`; schema `createWithdrawAmountSchema` (`utils/validations.ts:250-264`) |
| Input | Digits and one decimal point, up to 8 characters; `−` / `+` step by 50 | `AmountInput.tsx:40-50,98-106` |
| Quick amounts | `+500`, `+1,000`, `+5,000`, `+10,000`, `+25,000`; each **adds** to the amount | `AmountInput.tsx:21,134-158` |
| Too little balance | When withdrawable < 100: the input is replaced by "You need at least ₹100 … Your current balance is ₹{max}" and the button is disabled | `AmountInput.tsx:54-68`; `AccountCard.tsx:151` |

Submit (`AccountCard.tsx:39-57`): [`POST /{bank|upi}/deposit-withdraw-request`](api-inventory.md#w3-depositwithdrawrequest)

```json
{ "type": "Debit", "amount": 2000, "bankId": 12 }
```

For UPI, `UPI: <id>` replaces `bankId`. No UTR or image is sent. Success: backend message (or a generic toast) and the amount resets.

## Crypto withdraw

`CryptoWithdrawForm` (`pages/Withdraw/CryptoWithdrawForm.tsx`), one per saved wallet:

| Item | Value | Source |
|---|---|---|
| Range | **1** to withdrawable, in **INR** (team-confirmed unit, Q-32) | `CryptoAccountList.tsx:22-23`; `CryptoWithdrawForm.tsx:32-36,177-185` |
| Rate converter | Shows `crypto × usdRate = INR` for the wallet's network, starting at 1 USDT. **Display only:** not sent ([F5](overview.md#findings)) | `CryptoWithdrawForm.tsx:49-56,147-171` |
| Amount icon | USDT icon, although the value is INR ([F4](overview.md#findings)) | `:184` |

Submit (`CryptoWithdrawForm.tsx:74-87`): [`POST /crypto/deposit-withdraw-request`](api-inventory.md#w12-createcryptodepositwithdrawrequest)

```json
{ "type": "Debit", "amount": 2000, "cryptoId": 3 }
```

The form resets after both success and failure (`finally`).

## Withdraw rules

Collapsible box, **closed** by default (`WithdrawRules.tsx:7`). Translation key `withdraw.rules.items` (`public/locales/en/common.json`), English version:

1. Withdrawal of funds is subject to the approval of the admin.
2. The bonus wallet amount cannot be withdrawn using this form.
3. Do not place a withdraw request without betting with the deposited amount. Such activity may be identified as suspicious.
4. If multiple users use the same withdrawal account, all linked users will be blocked.
5. Maximum withdrawal processing time is 45 minutes. Raise a complaint only after that.

Rules 3 and 4 are backend or operations rules (`BACKEND CONFIRMATION REQUIRED` for how they are enforced); the frontend does not check them.

## Withdraw history

`WithdrawHistorySection` (`pages/Withdraw/components/WithdrawHistorySection.tsx`). Same API, date range, guard and paging as [deposit history](deposit.md#deposit-history), with `type=Debit` (`:70-76`).

| Column | Field | Source |
|---|---|---|
| Txn ref ID, Request at, Updated at, Amount | as in deposit history | `:81-84` |
| Payment method | `bank` → Bank, else `crypto` → Crypto, else UPI | `:85-89` |
| Bank / UPI | `bank.bankName`, else `upi.upiId`, else `-` | `:90` |
| Wallet address | `crypto.walletAddress` with copy button, else `-` | `:91,112-135` |
| Status | badge, see [overview](overview.md#request-lifecycle) | `:137-145` |
| Image | `image` icon opens `ImagePreviewModal` when set (what the image shows for a withdrawal is `NOT CONFIRMED FROM SOURCE`) | `:95,146-156,222-226` |
| Remark | `RemarkModal` when `remark` is set | `:93-94,158-170` |
