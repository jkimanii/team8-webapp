# Deprecation notice: StrathShop API v1 list responses

**To:** Group 9 (Strathmore Mental Health App) **From:** James Kimani, Group 8 (StrathShop) **Date:** 10 November 2026

## Summary

The v1 list endpoints of the StrathShop API are deprecated. v2 is live now. v1 will stop working on **Friday 13 November 2026**. Please move before then.

## What is changing

- `GET /listings` and `GET /categories` return `{ "data": [ ... ], "count": N }` instead of a bare `[ ... ]`.
- The new URLs start with `/api/v2`: `https://strathshop.onrender.com/api/v2/listings`.

**Nothing else changes:** the fields inside each listing and category, the `?category=` filter, `GET /listings/{id}`, `GET /categories/{id}`, `PATCH /listings/{id}/availability`, the error shape `{ "error": "..." }`, and your API key are all the same. Those endpoints are also available under `/api/v2`, so you can move every call at once.

## Why

Wrapping the list lets us add paging later (a `page` and `limit`) without another breaking change, and it matches the `{ data, ... }` shape Team 7's CampusHub API already uses.

## Before and after

v1 `GET /api/listings?category=counseling`

```json
[
  {
    "id": 17,
    "title": "1-on-1 Counseling Session",
    "price": 1500,
    "status": "available",
    "...": "..."
  }
]
```

v2 `GET /api/v2/listings?category=counseling`

```json
{
  "data": [
    {
      "id": 17,
      "title": "1-on-1 Counseling Session",
      "price": 1500,
      "status": "available",
      "...": "..."
    }
  ],
  "count": 4
}
```

## How to migrate

1. Change your base URL from `https://strathshop.onrender.com/api` to `https://strathshop.onrender.com/api/v2`. Same key, same `?category=` filter.
2. Where you loop over the listings or categories, read `body.data` instead of `body`.
3. Nothing else: single listings, the PATCH and errors look exactly as before.
4. Test it, then tell me, so I can see your calls on v2 in our `/api/stats`.

## Timeline

- **Today, 10 November:** v2 is live. v1 still works, and every v1 response now carries `Deprecation`, `Sunset` and `Link` headers.
- **Friday 13 November 2026:** v1 stops working.

## Questions

Message me any time.
