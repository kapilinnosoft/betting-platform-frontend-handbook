# Admin Module A3: Create member

`rsplay/rsplay-admin@12f0054`, paths relative to `src/`. The form is `pages/Downline/Modal/CreateMember.tsx`. It opens from "+ Add {level}" on a level list (`pages/Downline/Downline.tsx:75-77,192-199`).

## When the button appears

Both conditions must hold (`Downline.tsx:75`; `AllDownlineListing.tsx:65,77-84`):

1. `hasModuleAccess('Users', 'create')`: always true for the Owner and agents; from permissions for role users.
2. The level being viewed (`:id`) is one of the roles below the logged-in role (`roleNameToNextNameMap`), or the account is a role user.

So an account can create **any** lower level, not only the next one. For example, an Admin can create a Master directly. The team's explanation says some clients allow only the next level. Nothing in the frontend enforces that (`BACKEND CONFIRMATION REQUIRED`, Q-38).

The new member's role is the level being viewed: `roleId: Number(:id)` (`CreateMember.tsx:136`). Its upline is the logged-in account. `INFERRED`: no upline id is sent, so the backend takes it from the token.

## Fields and validation

Schema: `addMemberSchema({ minPartnership, isOwner, createUser })` (`utils/validation.tsx:359-426`).

| Field | Label | Rule | Source |
|---|---|---|---|
| `username` | Username | trimmed, 3–20 characters | `validation.tsx:369-377` |
| `mobile` | Mobile Number | optional, phone input, max length 10 | `validation.tsx:379`; `CreateMember.tsx:76-81,167` |
| `password` | Password | trimmed, 8–20 characters. "Generate Password" fills **`asdf1234`** (fixed, F1) and reveals it. "Copy" copies the field to the clipboard | `validation.tsx:381-387`; `CreateMember.tsx:25-27,109-127,183-202` |
| `partnership` | "Partnership (can not be less than {own %})", or "Partnership" when creating a User | see the partnership rule below | `validation.tsx:392-419`; `CreateMember.tsx:88-94` |
| `creditLimit` | Deposit Amount | optional; if filled: positive, at least 1, at most 999,999,999 | `validation.tsx:420-425`; `CreateMember.tsx:95-100` |

`createUser` is true when the level being viewed is the USER role (`CreateMember.tsx:39-40`). `minPartnership` is the logged-in account's `partnership` from `/users/me`, or `1` when it is missing (`:42-44`).

## Partnership (percentage) rule

This is the frontend side of the team's rule that a child's percentage must be above its parent's.

| Who creates | Creating | Allowed value | Error text | Source |
|---|---|---|---|---|
| any role | a **User** | exactly **100**. The field is disabled and pre-filled with 100 | "User must have 100% partnership" (Owner) / range message | `validation.tsx:401-405`; `CreateMember.tsx:66,93` |
| **Owner** | an agent level | integer **1–99** | "Subadmin partnership must be between 1% and 99%" | `validation.tsx:407-410,436-438` |
| an agent or a role user | an agent level | integer **greater than own partnership** and **at most 99** | "Partnership must be between {own + 1}% and 99%" | `validation.tsx:412-413,440` |

Example: the Owner creates an Admin at 10. That Admin can create a Super Master at 11–99, but not at 10.

How the percentage difference turns into commission or profit share is decided by the backend (team: "depending on your platform's business rules"). `BACKEND CONFIRMATION REQUIRED`. The frontend only shows `partnership` (Partnership %) and `downlinePlInPercent` (Upline P/L) in the lists ([member listing](member-listing.md)).

## Request

`POST /users/sub-user` (`addMember`, `store/api/commonApi.ts:12-33`; [DL4](api-inventory.md#dl4-addmember)). Body as built in `CreateMember.tsx:131-142`:

```json
{
  "username": "agent_example",
  "mobile": "9000000000",
  "password": "********",
  "roleId": 5,
  "fromAccount": "<logged-in username>",
  "partnership": 25,
  "creditLimit": 1000
}
```

| Field | Value |
|---|---|
| `mobile` | only when filled |
| `roleId` | `:id` of the level list |
| `fromAccount` | logged-in account's **username** (the variable is named `loggedInRoleName`); `'ADMIN'` if it is empty |
| `partnership` | 100 for a User, else the entered number |
| `creditLimit` | the "Deposit Amount" value, or omitted when empty. `INFERRED`: an opening deposit moved from `fromAccount` to the new member |

The mutation invalidates `Bankers` and `Members`, so the open level list refetches.

| Result | UI |
|---|---|
| Success | toast "Member Added Successfully!", the modal closes, the form resets |
| Error | `error.data.message` (or "Failed to create member") as a toast and a red banner in the form |

The commented-out fields `transactionCode` (a 5-digit transaction password) and `confirmPassword` show that an earlier version of the form had them (`CreateMember.tsx:68,72,101-106`).
