## 1. No way to retrieve or list Advertisements after creating one

`POST /events/{id}/advertise` creates an `Advertisement`, and its
`status` field can be `scheduled`, `active`, or `expired` — but there's
no `GET` endpoint anywhere in the contract to read one back. Once we
create an ad, how do we check its current status, list all the ads
we've created, or find out when one is about to expire? Is a read
endpoint (e.g. `GET /events/{id}/advertise` or `GET /advertisements`)
planned, or is status tracking meant to be computed locally on our side
from `startDate`/`endDate` instead?

## 2. `category` field has no enum — `Club.category` and `/clubs?category=`

Both the schema field and the query parameter are typed as a plain
`string` with a single example (`"Technology"`), but no `enum` listing
the full set of valid categories. Without that, we can't build a
reliable category filter on our side, and any category value we send
might not match one of theirs. Can you share the full list of valid
category values, and would you consider adding it as an `enum` in the
schema?

## 3. `contactEmail` on `Club` — shared address or personal email?

It's not clear from the schema or description whether this is always a
club-level shared contact address, or whether it can sometimes be an
individual student officer's personal email. This affects whether it's
safe for us to display in StrathShop's UI — we've drawn a hard line
around not exposing personal student data