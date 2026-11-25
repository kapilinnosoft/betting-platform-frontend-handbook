# Module 11: Bonuses (API inventory)

rsplay `@7a89e53`; paths relative to `src/`. All endpoints inject into the single RTK Query `apiSlice` (`store/api/apiSlice.ts`), which adds the bearer token (see [application architecture §2.3](../../00-overview/application-architecture.md#23-authentication-and-tokens)).

Response shapes come from the TypeScript types and the fields the page reads. They are not captured backend responses. All examples are sanitised placeholders.

## Summary

| # | Endpoint name | Request | Tags | Trigger | Consumer |
|---|---|---|---|---|---|
| B1 | `getBonusApplicants` | `GET /bonuses/applicants/list` | none (`providesTags` commented out) | `ON_MOUNT`, `ON_STATE_CHANGE` (category, Go, Reset, search, page, size) | Bonus Statement table |
| B2 | `getUserWallets` | `GET /users/me/wallets` | none | `POLLING` 5 s (header) | Profile drawer "Bonus Balance" |

---

## B1 `getBonusApplicants`

| Item | Value |
|---|---|
| Definition | `store/api/bonusApi.ts:6-13` (`getBonusApplicants`) |
| Hook | `useGetBonusApplicantsQuery`, called in `pages/BonusStatement/index.tsx:61-72` (`BonusStatement`) |
| Method and path | `GET /bonuses/applicants/list` |
| Parameters | The argument object is passed as `params` unchanged. No `t` cache-buster |
| Skip | Until `state.user.profile.id` exists |
| Cache tags | None: `providesTags: ['BonusApplicants']` is commented out (`bonusApi.ts:12`) |

### Parameters sent by the page

| Parameter | Value | When |
|---|---|---|
| `page` | Current page, from 1 | always |
| `limit` | 25 by default; 10, 25, 50 or 100 | always |
| `userId` | `Number(profile.id)` | always ([F1, F2](overview.md#findings)) |
| `fromDate`, `toDate` | Applied range, `toISOString()` | always |
| `category` | `JoiningBonus`, `DepositBonus` or `ReferralBonus` | not ALL |
| `search` | Bonus name text | not empty |
| defined in the type, not sent | `username`, `status`, `releaseType` | — |

Parameter type: `GetBonusApplicantsQuery` (`types/bonus.ts`). Example (sanitised):

```
GET /bonuses/applicants/list?page=1&limit=25&userId=<user-id>&fromDate=2026-10-30T18:30:00.000Z&toDate=2026-11-25T18:29:59.999Z&category=DepositBonus
```

### Response

`BonusApplicantsResponse` (`types/bonus.ts`): `{ bonusApplicants: BonusApplicantItem[], pagination: { currentPage, totalPages, totalItems, limit } }`. The page reads `bonusApplicants` and `pagination.totalItems`.

| Field | Shown as |
|---|---|
| `id` | Row key; which instalment list is open |
| `bonus.name`, `bonus.id`, `bonus.category` | Bonus Name, Bonus ID, Category |
| `bonus.installments` | Installments count; the button appears when it is greater than 1 |
| `awardedAmount` | Awarded Amount |
| `turnoverCompleted`, `turnoverRequired` | Turnover (Completed / Required); `turnoverRequired` also feeds the [instalment calculation](overview.md#calculation-total-turnover-required-per-instalment) |
| `awardedAt`, `expireAt` | Dates |
| `status`, `rejectReason` | Status and the reason modal |
| `installments[]`: `installmentNo`, `amount`, `releaseDate`, `status`, `rejectReason` | Instalment rows |
| not read | `userId`, `bonusId`, `triggerEvent`, `timesClaimed`, `timesRejected`, `createdAt`, `user`, `bonus.releaseType` |

Example (sanitised):

```json
{
  "bonusApplicants": [
    {
      "id": 1,
      "bonusId": 10,
      "awardedAmount": 500,
      "turnoverRequired": 3000,
      "turnoverCompleted": 1200,
      "awardedAt": "2026-11-20T10:00:00.000Z",
      "expireAt": null,
      "status": "ACTIVE",
      "rejectReason": "",
      "bonus": { "id": 10, "name": "<bonus name>", "category": "DepositBonus", "releaseType": "FIXED", "installments": 3 },
      "installments": [
        { "id": 1, "installmentNo": 1, "amount": 166.67, "releaseDate": null, "status": "PENDING", "rejectReason": null }
      ]
    }
  ],
  "pagination": { "currentPage": 1, "totalPages": 1, "totalItems": 1, "limit": 25 }
}
```

Status values in the type: `PENDING`, `APPROVED`, `REJECTED`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `EXPIRED`, `CLAIMED` (`BonusApplicantStatus`). Release types: `FIXED`, `PERCENTAGE` (`ReleaseType`, not shown).

Backend questions (Q-62): does the list use the token's user or the `userId` parameter; is turnover split equally across instalments.

## B2 Bonus wallet (`GET /users/me/wallets`)

Documented in full in [Module 9 › W10](../09-wallet/api-inventory.md#w10-getuserwallets). Bonus-specific rule: `walletSlice` takes the wallet whose `type` (lower-cased) is `bonus` and stores `Number(amount)` as `bonusBalance`. When there is no such wallet, it is 0 (`store/slices/walletSlice.ts:32-58`). The profile drawer shows it with 2 decimals (`components/ProfileDrawer.tsx:57,146-150`).
