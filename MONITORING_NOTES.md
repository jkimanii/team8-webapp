# Monitoring notes: StrathShop API (Group 8)

## 1. Predictions (written before we had any data)

**Slowest endpoint:** `GET /listings?category={wellness|counseling}`, because it can return several listings and has to join three tables and filter by category, where `/listings/{id}` looks up one row by its primary key.

**Most errors:** `PATCH /listings/{id}/availability`, because it is the only write endpoint, it is the only one that needs a key that can write, and two doctors or students could try to claim the same slot at the same moment.

## 2. What the data showed

Copy your real `/api/stats` output here (no keys), then fill in the table.

```json
(paste /api/stats here)
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

(For example: "GET /api/listings averaged ** ms against ** ms for GET /api/listings/:id, and ** of its ** calls were 400s from ?category=pizza.")

---

## 4. Why we think it happens, and what we would check next

---

## 5. One alert we would want in production

**\_\_** (pick one number from /api/stats, a threshold, and what happens when it fires. Example: errorRatePercent above 5% for five minutes pages the on-call developer. While they fix it, the Clubs page already keeps working from saved data with its banner, and campushubFallbacks shows how often that is happening.)

## Sample log lines (no keys)

```
(paste at least one 200 and one 401 line from requests.log)
```
