# Admin Module A7: Bet Config

`rsplay/rsplay-admin@12f0054`, paths relative to `src/pages/EventManagement/` unless stated. Part of [Event Management](overview.md).

Bet Config sets the limits every bet must meet: stake range, odds range, profit and exposure limits, and bet delay. They apply **per sport and market type**, and can be overridden **per event**. Bets on the User Panel are accepted or rejected by the backend against these values (team, 2026-11-26).

## Where it is set

| Level | Opened from | Scope sent | Applies to | Source |
|---|---|---|---|---|
| Sport default | Event Management ▸ Bet Config (`/bet-setting`, page title "Default Setting") | `{ sport, marketType }` | Every event of that sport and market type that has no event-level setting | `BetSetting.tsx:11-53` |
| Event level | Events ▸ **Bet Config** button on a row (modal "Bet Setting- {event name}") | `{ sport, marketType, eventId }` | That event only | `components/BetConfigModal.tsx:13-31`; `EventManagement.tsx:132-153` |

**Priority (team, 2026-11-26):** an event-level setting wins over the sport default.

Both levels use the same form (`components/BetConfigForm.tsx`, `hooks/useBetConfigForm.ts`). It is disabled for a role user without `EventManagement` update access (`BetSetting.tsx:12-13,46`). The event-level button is disabled the same way (`components/eventColumns.tsx:130-141`).

## Sports and market types

The sport tabs are Cricket, Soccer, Tennis, Horse Racing and Greyhound, sent as `Cricket`, `Soccer`, `Tennis`, `HorseRacing`, `Greyhound` (`utils/constent.ts:215-221 (SportsTabs)`). Each sport offers its own market tabs, and switching sport selects its first market (`BetSetting.tsx:22-26`).

| Sport | Market tabs (label → `marketType` sent) |
|---|---|
| Cricket | Match Odds → `NORMAL`, Session → `SESSION`, Fancy → `FANCY`, Bookmaker → `BOOKMAKER`, Tied Match → `TIEDMATCH`, Premium → `PREMIUM` |
| Soccer | Match Odds → `NORMAL`, Over/Under → `OVERUNDER`, Premium → `PREMIUM` |
| Tennis | Match Odds → `NORMAL`, Set → `SET`, Premium → `PREMIUM` |
| Horse Racing, Greyhound | Match Odds → `NORMAL` |

Source: `constants.ts:19-47 (MARKET_TYPES, MARKET_TYPE_LABELS, SPORT_MARKETS)`.

In the event-level modal, the tabs come from `SPORT_MARKETS[event.sport]`. If the event's `sport` value is not one of the keys above, only Match Odds is offered (`BetConfigModal.tsx:14`).

**How user-side markets fall under these types (team, 2026-11-26):** mostly each market is mapped under its own name (Match Odds, Bookmaker and so on). On request for a client, some markets are flattened and shown together under Session. The mapping is done by the backend, not by this page.

## Fields

All ten values are shown and saved together. The form loads them from `GET /betconfig/dynamic` ([EM10](api-inventory.md#em10-getdynamicbetconfig)) and converts each with `Number(value) || 0`, so a missing or empty value appears as **0** (`utils.ts:10,19-30`; [BC2](#findings)).

| Section | Label | Key | Meaning (form hint) | Enforced at bet placement |
|---|---|---|---|---|
| Stake Limits ▸ In-play ("Match is live") | Min Stake, Max Stake | `inPlayMinStake`, `inPlayMaxStake` | "Smallest and largest bet a player can place." Used while the event is in play | Yes (team). In-play follows the event's in-play flag, which the Events **Inplay** checkbox can override |
| Stake Limits ▸ Off-play ("Before the match starts") | Min Stake, Max Stake | `offPlayMinStake`, `offPlayMaxStake` | Same, before the match starts | Yes (team) |
| Odds Range | Min Odds, Max Odds | `minOdd`, `maxOdd` | "Lowest and highest odds a bet can be placed at." | Yes (team) |
| Profit Limits | Max Profit per Bet | `maxProfitPerBet` | "The most one bet can win" | `BACKEND CONFIRMATION REQUIRED` (Q-68) |
| Profit Limits | Max Profit per Market | `maxProfit` | "…and the most that can be won in total on one market." | `BACKEND CONFIRMATION REQUIRED` (Q-68) |
| Exposure and Bet Delay | Exposure Limit per Market | `overallExposure` | "Total risk allowed on one market" | `BACKEND CONFIRMATION REQUIRED` (Q-68) |
| Exposure and Bet Delay | Bet Delay (Seconds) | `betTiming` | "how long a bet is held before it is accepted." | Yes (team). Added on top of the backend's own processing time, usually 2-3 s |

Sources: `components/BetConfigForm.tsx:79-168`; `constants.ts:69-80 (BET_CONFIG_FIELD_LABELS)`; `types.ts:60-77 (DynamicBetConfig)`.

### Validation (browser)

| Rule | Message | Source |
|---|---|---|
| Every field required | "{label} is required" | `validationSchema.ts:3-14 (numberField)` |
| Not negative | "{label} cannot be negative" | same |
| At most 9,999,999,999 | "{label} must be max 10 digits" | same |
| Min ≤ Max for in-play stake, off-play stake and odds | "{pair} Min cannot be greater than Max" on the min field and "{pair} Max must be greater than or equal to Min" on the max field | `validationSchema.ts:16-39,54-58` |
| Editing one side of a pair re-checks the other | — | `constants.ts:60-67 (MIN_MAX_PAIRS)`; `useBetConfigForm.ts:46-52` |

There is no other cross-field check. For example, odds may be 0 and a stake of 0 is accepted ([BC5](#findings)).

## Saving

1. **Update** with no real change shows "Nothing to update." A field counts as changed only when it was edited **and** its number differs from the saved value. The footer shows "N unsaved change(s)" (`useBetConfigForm.ts:54-65`; `BetConfigForm.tsx:170-175`).
2. All fields are validated, then **"Save these changes?"** opens. It shows "{sport} · {marketType} · N change(s)" and either "This applies to this event only." or "This applies to every event of this sport and market type.", then each changed field with its old value struck through and the new value next to it (`components/UpdateConfirmModal.tsx:42-60`). `marketType` is shown as the raw key, for example `NORMAL` ([BC3](#findings)).
3. **Confirm and update** sends `PUT /betconfig/dynamic` with the scope and **all ten values**, not only the changed ones, plus `stakeOverride` ([EM11](api-inventory.md#em11-updatedynamicbetconfig); `utils.ts:38-55 (buildBetConfigBody)`; [BC1](#findings)).
4. Success: "Bet config updated!". The event-level modal closes; the default page stays open. The `BetConfig` tag refetches the values and the form resets to them. Failure: the backend message as a toast (`useBetConfigForm.ts:67-81`).

### Stake source and Reset stakes

Stakes can come from three places. The form's text names them: saved values, "the live feed", then "the platform default" (`BetConfigForm.tsx:83-85`; `components/StakeResetConfirm.tsx:19-25`).

| Item | Behaviour | Source |
|---|---|---|
| `stakeOverride` sent on save | `true` when any of the four stake fields changed, or when it was already `true`. Once stakes are saved they keep overriding the feed until reset | `useBetConfigForm.ts:68-73` |
| Hint when overriding | "Smallest and largest bet a player can place. Saved values override the live feed." | `BetConfigForm.tsx:83-85` |
| Badge | "Stake source: {stakeSource}" from the API. The possible values are not known (Q-68) | `BetConfigForm.tsx:87-91` |
| **Reset stakes** | Disabled unless `stakeOverride` is true ("No saved stakes to reset"). Asks "Clear saved stakes for {sport} · {marketType}? Stakes will follow the live feed, then the platform default. Other settings are not changed." | `BetConfigForm.tsx:92-113`; `StakeResetConfirm.tsx` |
| Reset request | `PATCH /betconfig/dynamic/reset-stake` with the scope (`eventId` included at event level), then "Stakes reset. Other settings are unchanged." | `useBetConfigForm.ts:83-92`; [EM12](api-inventory.md#em12-resetdynamicbetconfigstake) |

## Event-level settings

- The modal's form sends `eventId: Number(event.id)` with every request, so loading, saving and resetting all apply to that event only (`BetConfigModal.tsx:23-30`; `utils.ts:32-36 (toBetConfigScope)`).
- **Cancel** closes the modal. A successful save also closes it (`BetConfigModal.tsx:28-29`).
- What `GET /betconfig/dynamic?eventId=…` returns for an event with no setting of its own is not confirmed; it is presumably the sport default (`INFERRED`, Q-68). Because a save sends all ten values, saving one change at event level probably stores all ten for that event ([BC1](#findings)).

## What the User Panel sees

| Setting | Shown to the user | Checked in the browser | Label | Source (`rsplay-user@7a89e53`) |
|---|---|---|---|---|
| Stake range | "Min … \| Max …" in the bet slip and min/max beside market rows, from the catalogue's `minBetAmount` / `maxBetAmount` | **No.** The slip removes `min` and `max` and sends the bet; the backend rejects a stake outside the range | Display and no check `OBSERVED`; enforcement team. That the catalogue values are the resolved setting (event or sport, in-play or off-play) is `INFERRED` (Q-68) | `components/BetSlip.tsx:128,263`; `pages/GameDetails/components/InnerMarketRow.tsx:153,203`; `hooks/useBetSlip.ts:51-64`; `pages/GameDetails/Hooks/useCatalogData.ts:61-62` |
| Odds range | Not shown. The catalogue's `minRate` / `maxRate` are read but never used, and the team says these old fields are no longer in use | No | `OBSERVED`; team | `useCatalogData.ts:63-64` |
| Profit and exposure limits | Not shown | No | `OBSERVED` | — |
| Bet delay | No countdown. The slip stays in its loading state until the backend answers: the delay plus 2-3 s of processing | No | `OBSERVED`; timing team | `hooks/useBetSlip.ts:51-70` |
| A rejected bet | Error toast with the backend message, or "Failed to place bet" | — | `OBSERVED` | `useBetSlip.ts:63-64` |

Bet placement itself is documented in [User Panel Module 3](../../01-user-panel/03-game-detail/bet-placement-flow.md).

## Findings

| # | Finding | Where |
|---|---|---|
| BC1 | **Every save sends all ten values.** At event level, saving a single change probably stores every field for that event. Later changes to the sport default would then no longer reach that event for any field, not only the one that was edited (`INFERRED`, Q-68 a) | `utils.ts:38-55`; `useBetConfigForm.ts:71-73` |
| BC2 | **Missing values become 0.** `Number(v) \|\| 0` turns `null` or empty into 0 in the form, and the next save sends 0. Whether 0 means "no limit" or a real limit of 0 is not confirmed (Q-68 b) | `utils.ts:10,19-30` |
| BC3 | **Confirmation texts use raw keys.** "Save these changes?" and "Reset stakes" show `NORMAL`, `TIEDMATCH` and so on instead of the tab labels. At event level, "Reset stakes" also does not say it affects only this event ([F4](overview.md#findings), Q-69) | `UpdateConfirmModal.tsx:44`; `StakeResetConfirm.tsx:20-24` |
| BC4 | **Event-level tabs depend on the event's `sport` value.** A value that is not a `SPORT_MARKETS` key gives only Match Odds | `BetConfigModal.tsx:14` |
| BC5 | **Few value checks.** Only "not negative", "at most 10 digits" and min ≤ max. Odds of 0 and stakes of 0 pass the browser; any further rule is the backend's (Q-69) | `validationSchema.ts` |
| BC6 | **"Stake source" values are not documented** (Q-68 c) | `BetConfigForm.tsx:87-91` |
