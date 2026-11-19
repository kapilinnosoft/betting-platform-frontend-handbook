# Modules 5–7: Scorecard, Live TV and Raw scorecard (API inventory)

rsplay `@810884b`; paths relative to `src/`. Both endpoints are in `store/api/eventsApi.ts` and inject into the shared `apiSlice` (bearer token, one retry after `POST /auth/refresh` on 401; see [application architecture §2.3](../../00-overview/application-architecture.md#23-authentication-and-tokens)).

Response shapes come from the TypeScript types and the fields the code reads. They are not captured backend responses.

## Summary

| # | Endpoint name | Request | Trigger | Frequency | Consumer |
|---|---|---|---|---|---|
| M1 | `getScorecard` | `GET events/scorecard/:eventId` | `ON_MOUNT` | Once per event (cached 60 s after leaving) | `useCatalogData` (game detail), `RacingInside` (race detail) |
| M2 | `getLiveScorecard` | `GET /events/raw-scorecard/:eventId` | `ON_MOUNT` + polling | **1 s** while mounted | `CustomLiveScoreCard` (game detail, cricket) |

Scorecard (Module 5) and Live TV (Module 6) share M1. The raw scorecard (Module 7) uses M2, a different path. `eventsApi.ts` also defines an unused duplicate for the M2 path; it never runs and is not documented here. Neither request adds `t=<now>`, and none has cache tags.

---

## M1 `getScorecard`

| Item | Value |
|---|---|
| Definition | `store/api/eventsApi.ts:318-323` (`builder.query<any, number>`) |
| Calls | `pages/GameDetails/Hooks/useCatalogData.ts:27-29`; `pages/RacingInside/index.tsx:29-31` |
| Skip | game detail: `!eventId \|\| isDemoUser \|\| !isAuthenticated`; race detail: `isDemoUser \|\| !eventId \|\| !isAuthenticated` |
| Path | `events/scorecard/${eventId}`, no leading slash (resolves the same; see [central API inventory](../../../inventory/api-inventory.md#method-how-this-list-was-produced)) |

**Request.** No query parameters and no body. `eventId` is the route parameter converted with `Number()`.

**Response.** Typed `any`. Fields read:

| Field | Used for |
|---|---|
| `scorecardUrl` | [Scorecard iframe](scorecard-and-live-tv.md#scorecard-iframe-module-5) (game detail only) |
| `liveTvUrl` | [Live TV iframe](scorecard-and-live-tv.md#live-tv-module-6) (game detail and race detail) |

Everything else in the response is `NOT CONFIRMED FROM SOURCE`. Team (Q-31): the URLs open a direct stream in an iframe, so a one-time fetch is enough; turning Live TV off and on reloads the stream.

## M2 `getLiveScorecard`

| Item | Value |
|---|---|
| Definition | `store/api/eventsApi.ts:360-366` |
| Call | `pages/GameDetails/components/CustomLiveScoreCard.tsx:35-38` |
| Options | `skip: !eventId \|\| !isAuthenticated`, `pollingInterval: 1000` |
| Transform | `dropScorecardUrl` (`eventsApi.ts:283-287`): if `scorecard` is a string (a URL), it becomes `null` |

**Request.** No parameters or body.

**Response** `LiveScorecardResponse` (`eventsApi.ts:266-274`):

```ts
{
  success: boolean;
  message: string;
  scorecard: { status: boolean; msg: string; data: LiveScorecardData | [] } | null;
}
```

The source comment says the endpoint "returns either scorecard data or a plain scorecard URL" (`eventsApi.ts:276`); the URL form is dropped because M1 already provides it.

`LiveScorecardData` (`eventsApi.ts:228-264`), grouped:

| Group | Fields |
|---|---|
| Match | `match_id`, `series_id`, `match_type`, `toss`, `result`, `first_circle?`, `second_circle?`, `current_inning`, `batting_team`, `balling_team` |
| Teams | `team_a_id`, `team_a`, `team_a_short`, `team_a_img`, and the same for `team_b` |
| Scores | `team_a_score` / `team_b_score` (map of innings key → `{ score, wicket, ball, over, declare }`, plus `team_id`), `team_a_scores`, `team_a_over`, `team_b_scores`, `team_b_over`, `c_team_score`, `trail_lead` |
| Rates | `curr_rate`, `rr_rate`, `target`, `need_run_ball` |
| Players | `batsman[]` (`player_id`, `name`, `img`, `strike_status`, `run`, `ball`, `fours`, `sixes`, `strike_rate`), `bolwer`, `last_bolwer` (`player_id`, `name`, `img`, `run`, `maiden`, `over`, `wicket`, `economy`) |
| Recent balls | `last4overs[]` (`over`, `balls[]`, `runs`), `last36ball[]` |

`bolwer`/`last_bolwer`/`balling_team` are spelled as in the type, which is `INFERRED` to mirror the API. Field-by-field display: [raw-scorecard.md](raw-scorecard.md#live-card-field-mapping).

Example (sanitised, shortened):

```json
{
  "success": true,
  "message": "…",
  "scorecard": {
    "status": true,
    "msg": "…",
    "data": {
      "team_a_short": "AAA", "team_b_short": "BBB",
      "batting_team": "1", "current_inning": "1",
      "team_a_id": 1, "team_a_score": { "team_id": 1, "1": { "score": 120, "wicket": 3, "ball": 0, "over": "15.2", "declare": 0 } },
      "curr_rate": "7.83", "toss": "…", "first_circle": "ball",
      "batsman": [], "bolwer": { "name": "-" }, "last4overs": []
    }
  }
}
```
