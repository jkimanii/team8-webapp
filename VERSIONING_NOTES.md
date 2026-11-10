# Versioning notes: StrathShop API (Group 8)

## 1. The change, in one sentence

The two list endpoints, `GET /listings` and `GET /categories`, return `{ data, count }` instead of a bare list, under a new `/api/v2` prefix.

## 2. Why it is worth a break

Wrapping the list lets us add paging later without breaking Group 9 a second time, and it gives our API the same envelope as Team 7's CampusHub. We chose the smallest change that buys that: nothing inside a listing changes, and single items, the PATCH and errors are untouched.

## 3. Prediction: which line in Group 9's code will fail?

**\_\_** (Ask Group 9 for the line where they loop over our listings, for example `listings.map(...)` or `for (const l of body)`. On v2, `body` is an object, so `.map` is not a function / the loop finds nothing.)

## 4. Evidence that v1 did not change

Comparing files v1_before.json and V1_AFTER.JSON
FC: no differences encountered

## 5. Receiving Team 7's notice

**\_\_** (one or two sentences: how it arrived, whether it said what, why, an example and a date, and the sunset date)

## 6. Who still uses v1?

From `/api/stats` and the log: `GET /api/listings` **\_\_** calls, `GET /api/v1/listings` **\_\_** calls, from caller labels **\_\_**. Is Group 9 still on v1? Could we switch v1 off today?

## 7. Reflection (150 to 250 words, in your own words)

1. What was it like to receive a breaking change on short notice? How did you find out, and what did you do first?
2. What did Team 7's notice do well, and what was missing?
3. Reading our own notice as Group 9: what would you change?
4. As the API owner next time, what is one thing you would do differently?
