# Monitoring notes: StrathShop API (Group 8)

## 1. Predictions (written before we had any data)

**Slowest endpoint:** `GET /listings?category={wellness|counseling}`, because it can return several listings and has to join three tables and filter by category, where `/listings/{id}` looks up one row by its primary key.

**Most errors:** `PATCH /listings/{id}/availability`, because it is the only write endpoint, it is the only one that needs a key that can write, and two doctors or students could try to claim the same slot at the same moment.

## 2. What the data showed

Copy your real `/api/stats` output here (no keys), then fill in the table.

```json
{
  "startedAt": "2026-11-10T14:50:49.906Z",
  "uptimeSeconds": 81120,
  "total": 279,
  "clientErrors": 5,
  "serverErrors": 0,
  "errorRatePercent": 0,
  "avgMs": 239.4,
  "campushubFallbacks": 0,
  "routes": {
    "HEAD /": {
      "count": 1,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 7.4,
      "maxMs": 7.4
    },
    "GET /": {
      "count": 4,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 0.9,
      "maxMs": 1.4
    },
    "HEAD /api/health": {
      "count": 266,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 241.5,
      "maxMs": 1476.9
    },
    "PATCH /api/v2/listings/:id/availability": {
      "count": 3,
      "clientErrors": 1,
      "serverErrors": 0,
      "avgMs": 486.5,
      "maxMs": 1106.2
    },
    "PATCH (no route)": {
      "count": 1,
      "clientErrors": 1,
      "serverErrors": 0,
      "avgMs": 1,
      "maxMs": 1
    },
    "GET (no route)": {
      "count": 3,
      "clientErrors": 3,
      "serverErrors": 0,
      "avgMs": 1.6,
      "maxMs": 3.4
    },
    "GET /api/v2/listings": {
      "count": 1,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 1061.8,
      "maxMs": 1061.8
    }
  }
}
```

| Question                                            | Prediction               | Actual numbers |
| --------------------------------------------------- | ------------------------ | -------------- |
| Slowest on average (`avgMs`)                        | `GET /api/listings`      | **\_\_**       |
| Slowest single request (`maxMs`)                    |                          | **\_\_**       |
| Most errors (per route)                             | `PATCH .../availability` | **\_\_**       |
| Error rate (`errorRatePercent`)                     |                          | **\_\_** %     |
| 401s: mistakes or probing? (`caller: "none"` lines) |                          | **\_\_**       |
| CampusHub fallbacks served (`campushubFallbacks`)   |                          | **\_\_**       |

Were we right? **\_\_**

## 3. One real pattern, with figures

Over 22.5 hours on Render, 266 of 279 requests (95%) were HEAD /api/health from UptimeRobot. Every route that touches the database is slow, and routes that don’t are fast. GET / averaged 0.9 ms. HEAD /api/health, which only runs SELECT 1, averaged 241.5 ms, with a worst case of 1,476.9 ms. The real endpoints were slower still: GET /api/v2/listings took 1,061.8 ms, and the PATCH averaged 486.5 ms with a maximum of 1,106.2 ms. The error rate was 0%.

## 4. Why we think it happens, and what we would check next

SELECT 1 does no work, so its 240 ms is almost all network time between Render and our Aiven database, which uses TLS. The 1-second worst cases may come from Aiven closing idle connections, so the first query after a quiet spell has to open a new encrypted connection. To find out, we would check that Render and Aiven are in the same region, time the database query separately from the rest of each request, and see whether the slow requests are the first ones after an idle period.

## 5. One alert we would want in production

Raise an alert if /api/health returns 503, or takes more than 1,000 ms on three checks in a row. Either means the database is unreachable or struggling, and every endpoint Group 9 uses depends on it. While it’s being fixed, our Clubs page keeps working from saved CampusHub data, but listings have no fallback, so Group 9 would get 500s.)

## Sample log lines (no keys)

```
{"time":"2026-11-11T13:09:17.935Z","method":"GET","path":"/api/v2/listings","status":401,"ms":6,"caller":"none"}
{"time":"2026-11-11T13:09:27.000Z","method":"GET","path":"/api/v2/listings","status":200,"ms":7,"caller":"key-681e53"}
```
