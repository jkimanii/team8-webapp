# StrathShop — Team 8

## Setup

### Database

1. Install XAMPP and DBeaver
2. Start **MySQL** in the XAMPP Control Panel
3. In DBeaver, create the database:

```sql
   CREATE DATABASE strathshop;
```

4. Import the schema and seed data: right-click the new database →
   **Tools → Execute script** → choose `db/schema.sql`

### Server

```bash
cd server
npm install
cp .env.example .env     # values work as-is on a default XAMPP install
npm run dev              # http://localhost:5000
```

### Client

```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

Both must be running. Check `http://localhost:5000/api/listings` returns JSON before opening the frontend.

# StrathShop API

StrathShop is the campus marketplace for Strathmore University. This is its REST API: it returns marketplace **listings** (wellness items and bookable counseling sessions) and **categories** as JSON, and lets a partner app change one thing on a listing, whether it is `available` or `booked`. No student, session, or user-account data is exposed.

- **Base URL (local):** `http://localhost:5000/api`
- **Format:** JSON in, JSON out. Prices are in KES and are always JSON numbers.
- **Full reference:** [`https://jkimanii.github.io/team8-webapp/`](https://jkimanii.github.io/team8-webapp/)

---

## Quickstart (60 seconds)

Once the API is running (see [Run it locally](#run-it-locally)), this is the one command to try first:

```bash
curl "http://localhost:5000/api/listings?category=wellness"
```

You should get back `200 OK` and a JSON array of wellness listings:

```json
[
  {
    "id": 14,
    "title": "Ibuprofen 200mg (24 tablets)",
    "price": 250,
    "description": "Sealed box, unopened. Pickup available on campus.",
    "category": "wellness",
    "condition": "Like New",
    "status": "available",
    "imageUrl": "https://placehold.co/400x300?text=Ibuprofen",
    "sellerName": "Strathmore Campus Pharmacy",
    "sellerCampus": "Strathmore University",
    "datePosted": "2026-09-11T08:00:00.000Z"
  }
]
```

(Your array may contain more items than this one. Each has the same shape.)

If you got a JSON array back, the API works and everything below will too. If not, jump to [If something goes wrong](#if-something-goes-wrong).

---

## Authentication

**None in this version.** You do not need a token or API key: send requests exactly as shown in this README. Authentication is being added in a later release; when it arrives, this section will say exactly which header to send.

---

## Things to know before you call it

- **Always pass a category** when listing. `GET /listings` with no `category` returns the entire StrathShop catalogue, including categories you probably don't want (textbooks, electronics, fashion, furniture, services, food).
- **Input is case-insensitive, output is always lowercase.** `?category=Wellness`, `?category=wellness` and `?category=%20WELLNESS%20` are the same request. Every category and status you get back is lowercase, so capitalise it yourself if you're displaying it.
- **`condition` is the exception:** it is free text shown as stored (e.g. `"Like New"`), so never use it to filter or compare.
- **IDs are positive integers.** Anything else (`/listings/abc`, `/listings/-1`) returns `404`, not `400`.
- **Two listing shapes.** `wellness` listings are physical items. `counseling` listings are bookable services and carry an extra `providerName` field; their `condition` is always `"N/A"`.

---

## Endpoints

All examples assume the API is running locally at `http://localhost:5000/api`. They use macOS/Linux/Git Bash syntax; see [Windows note](#windows-note) for `cmd.exe`.

| Method | Path                                          | What it does                           |
| ------ | --------------------------------------------- | -------------------------------------- |
| GET    | `/listings?category=wellness` or `counseling` | List listings in a category            |
| GET    | `/listings/{id}`                              | Get one listing                        |
| PATCH  | `/listings/{id}/availability`                 | Mark a listing `available` or `booked` |
| GET    | `/categories`                                 | List all categories                    |
| GET    | `/categories/{id}`                            | Get one category                       |

### 1. List listings by category

```bash
curl "http://localhost:5000/api/listings?category=counseling"
```

**200 OK**

```json
[
  {
    "id": 21,
    "title": "1-on-1 Counseling Session",
    "price": 1500,
    "description": "50-minute session with a licensed campus counselor.",
    "category": "counseling",
    "condition": "N/A",
    "status": "available",
    "providerName": "Dr. Wanjiku Mwangi",
    "imageUrl": "https://placehold.co/400x300?text=Counseling+Session",
    "sellerName": "Dr. Wanjiku Mwangi",
    "sellerCampus": "Strathmore University",
    "datePosted": "2026-09-11T08:00:00.000Z"
  }
]
```

An unrecognised category returns `400` (see [Errors](#errors)).

### 2. Get one listing

```bash
curl http://localhost:5000/api/listings/14
```

**200 OK**: the same object shape as in the list above, but a single object, not an array:

```json
{
  "id": 14,
  "title": "Ibuprofen 200mg (24 tablets)",
  "price": 250,
  "description": "Sealed box, unopened. Pickup available on campus.",
  "category": "wellness",
  "condition": "Like New",
  "status": "available",
  "imageUrl": "https://placehold.co/400x300?text=Ibuprofen",
  "sellerName": "Strathmore Campus Pharmacy",
  "sellerCampus": "Strathmore University",
  "datePosted": "2026-09-11T08:00:00.000Z"
}
```

Use this to check a listing's current `price` and `status` before recommending it. An id that doesn't exist returns `404`.

### 3. Update a listing's availability

This is the only write endpoint. It changes `status` and nothing else (it cannot edit a title, price or description).

```bash
curl -X PATCH http://localhost:5000/api/listings/21/availability \
  -H "Content-Type: application/json" \
  -d '{"status": "booked"}'
```

**200 OK**: echoes the new status, lowercase:

```json
{ "status": "booked" }
```

`status` must be `available` or `booked` (any capitalisation, surrounding spaces ignored). To undo the example above:

```bash
curl -X PATCH http://localhost:5000/api/listings/21/availability \
  -H "Content-Type: application/json" \
  -d '{"status": "available"}'
```

### 4. List all categories

```bash
curl http://localhost:5000/api/categories
```

**200 OK**: an array of `{ id, label }` objects. `label` is lowercase and is the exact value the `?category=` filter expects:

```json
[{ "id": 8, "label": "wellness" }]
```

(Your response will include every category, not just this one.)

### 5. Get one category

```bash
curl http://localhost:5000/api/categories/8
```

**200 OK**

```json
{ "id": 8, "label": "wellness" }
```

---

## Errors

Every failed request returns a non-2xx status code and a JSON body with a single `error` field:

```json
{ "error": "Listing not found" }
```

To tell success from failure, check the HTTP status code first. The `error` text is meant for humans and may be reworded, so don't match on it in code.

| Status            | When it happens                                                                                  | Example request                |
| ----------------- | ------------------------------------------------------------------------------------------------ | ------------------------------ |
| `400 Bad Request` | `category` is not `wellness` or `counseling`; or `status` is missing or not `available`/`booked` | `GET /listings?category=pizza` |
| `404 Not Found`   | No listing or category with that id, or the id isn't a positive integer                          | `GET /listings/9999`           |

Real example, a listing that doesn't exist:

```bash
curl -i http://localhost:5000/api/listings/9999
```

```
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{"error":"Listing not found"}
```

---

## Run it locally

These steps assume a completely clean machine with **Node.js 18+**, **Git**, and **XAMPP** (for MariaDB) installed.

**1. Clone the repo and install dependencies**

```bash
git clone https://github.com/jkimanii/team8-webapp
cd team8-webapp/server
npm install
```

**2. Start the database.** Open the XAMPP Control Panel and click **Start** next to **MySQL** (this is MariaDB). Wait until it turns green.

**3. Create the database and load the sample data.** With MariaDB running:

NO NEED TO REPEAT THIS IF YOU CONFIGURED THE DATABASE AS PER THE SETUP INSTRUCTIONS

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS strathshop;"
mysql -u root strathshop < db/schema.sql
mysql -u root strathshop < db/seed.sql
```

(`mysql` is in `C:\xampp\mysql\bin`; run these from XAMPP's **Shell** button if it isn't on your PATH.) XAMPP's default `root` user has no password. If yours does, add `-p`.

**4. Configure and start the server**

```bash
cp .env.example .env
npm start
```

You should see the server announce that it is listening on port **5000**.

**5. Check it works**

```bash
curl "http://localhost:5000/api/listings?category=wellness"
```

If that returns a JSON array, you're done.

### Windows note

In `cmd.exe`, single quotes don't work and JSON needs escaped double quotes. The PATCH example becomes:

```bat
curl -X PATCH http://localhost:5000/api/listings/21/availability -H "Content-Type: application/json" -d "{\"status\": \"booked\"}"
```

In PowerShell, `curl` is an alias for something else. Either use `curl.exe`, or run the commands in Git Bash or `cmd.exe` instead.

---

## If something goes wrong

| Symptom                                       | Likely cause                                                       | Fix                                                   |
| --------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| `Failed to connect` / `connection refused`    | Server isn't running, or it's on a different port                  | Re-run `npm start` and check the port it prints       |
| Server starts but crashes on a database error | MariaDB isn't running, or the `.env` values don't match your setup | Start MySQL in XAMPP; check `.env`                    |
| `200` but an empty array `[]`                 | Sample data wasn't loaded                                          | Re-run step 3                                         |
| `400` on a category you're sure is valid      | Typo, or a category outside `wellness` / `counseling`              | Check spelling; see `GET /categories`                 |
| `404` on an id that looks right               | The id isn't in your database, or it isn't a plain integer         | Try `GET /listings?category=wellness` to see real ids |
