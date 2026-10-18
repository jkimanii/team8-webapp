# StrathShop API

StrathShop is the campus marketplace for Strathmore University. This is its REST API: it returns marketplace **listings** (wellness items and bookable counseling sessions) and **categories** as JSON, and lets a partner app change one thing on a listing, whether it is `available` or `booked`. No student, session, or user-account data is exposed.

- **Base URL (hosted):** `https://strathshop.onrender.com/api`
- **Base URL (local):** `http://localhost:5000/api`, see [Run it locally](#run-it-locally)
- **Format:** JSON in, JSON out. Prices are in KES and are always JSON numbers.
- **Full reference:** [https://jkimanii.github.io/team8-webapp/](https://jkimanii.github.io/team8-webapp/)

---

## Quickstart (60 seconds)

Copy, paste, run. Nothing to install and nothing to sign up for.

```bash
curl "https://strathshop.onrender.com/api/listings?category=wellness"
```

**The first request can take about a minute.** The hosted server sleeps after a quiet spell and wakes on the next request. Wait for it; later requests answer in under a second.

You should get back `200 OK` and a JSON array of the wellness listings. The sample data has four (ids 13 to 16); the first is shown here:

```json
[
  {
    "id": 13,
    "title": "Ibuprofen 200mg (24 tablets)",
    "price": 250,
    "description": "Sealed box, unopened. For headaches and minor pain relief. Pickup at the campus pharmacy counter.",
    "category": "wellness",
    "condition": "Like New",
    "status": "available",
    "imageUrl": "https://placehold.co/400x300?text=Ibuprofen",
    "sellerName": "Strathmore Campus Pharmacy",
    "sellerCampus": "Strathmore University",
    "datePosted": "2026-09-11T08:41:01.000Z"
  }
]
```

If you got a JSON array back, the API works and everything below will too. If not, jump to [If something goes wrong](#if-something-goes-wrong).

---

## Authentication

**None in this version.** You do not need a token or API key: send requests exactly as shown in this README. Authentication is being added in a later release; when it arrives, this section will say exactly which header to send.

---

## Things to know before you call it

- **Always pass a category** when listing. `GET /listings` with no `category` returns the entire StrathShop catalogue (20 listings in the sample data), including categories you probably don't want (textbooks, electronics, fashion, furniture, services, food).
- **Input is case-insensitive, output is always lowercase.** `?category=Wellness`, `?category=wellness` and `?category=%20WELLNESS%20` are the same request. Every category and status you get back is lowercase, so capitalise it yourself if you're displaying it.
- **`condition` is the exception:** it is free text shown as stored (e.g. `"Like New"`), so never use it to filter or compare.
- **IDs are positive integers.** Anything else (`/listings/abc`, `/listings/-1`) returns `404`, not `400`.
- **Two listing shapes.** `wellness` listings are physical items. `counseling` listings are bookable services and carry an extra `providerName` field; their `condition` is always `"N/A"`.
- **Times are UTC.** `datePosted` ends in `Z`, which means UTC. Nairobi time (EAT) is UTC+3, so `2026-09-11T08:41:01.000Z` is 11:41 on 11 September in Nairobi.
- **Lists can be longer than the examples.** The examples below show the first listing of each list to keep this page short. The sample data has four wellness listings (ids 13 to 16) and four counseling listings (ids 17 to 20).

---

## Endpoints

All examples use the hosted server. They use macOS/Linux/Git Bash syntax; see [Windows note](#windows-note) for `cmd.exe` and PowerShell. To use your own copy instead, swap `https://strathshop.onrender.com` for `http://localhost:5000`.

| Method | Path                                          | What it does                           |
| ------ | --------------------------------------------- | -------------------------------------- |
| GET    | `/listings?category=wellness` or `counseling` | List listings in a category            |
| GET    | `/listings/{id}`                              | Get one listing                        |
| PATCH  | `/listings/{id}/availability`                 | Mark a listing `available` or `booked` |
| GET    | `/categories`                                 | List all categories                    |
| GET    | `/categories/{id}`                            | Get one category                       |

### 1. List listings by category

```bash
curl "https://strathshop.onrender.com/api/listings?category=counseling"
```

**200 OK**: an array of the four counseling listings (ids 17 to 20). The first is shown:

```json
[
  {
    "id": 17,
    "title": "1-on-1 Counseling Session",
    "price": 1500,
    "description": "50-minute confidential session with a licensed campus counselor. Weekdays, by appointment.",
    "category": "counseling",
    "condition": "N/A",
    "status": "available",
    "providerName": "Dr. Wanjiku Mwangi",
    "imageUrl": "https://placehold.co/400x300?text=Counseling+Session",
    "sellerName": "Dr. Wanjiku Mwangi",
    "sellerCampus": "Strathmore University",
    "datePosted": "2026-09-11T08:50:22.000Z"
  }
]
```

An unrecognised category returns `400` (see [Errors](#errors)).

### 2. Get one listing

```bash
curl https://strathshop.onrender.com/api/listings/13
```

**200 OK**: the same object shape as in the lists above, but a single object, not an array:

```json
{
  "id": 13,
  "title": "Ibuprofen 200mg (24 tablets)",
  "price": 250,
  "description": "Sealed box, unopened. For headaches and minor pain relief. Pickup at the campus pharmacy counter.",
  "category": "wellness",
  "condition": "Like New",
  "status": "available",
  "imageUrl": "https://placehold.co/400x300?text=Ibuprofen",
  "sellerName": "Strathmore Campus Pharmacy",
  "sellerCampus": "Strathmore University",
  "datePosted": "2026-09-11T08:41:01.000Z"
}
```

Use this to check a listing's current `price` and `status` before recommending it. An id that doesn't exist returns `404`.

### 3. Update a listing's availability

This is the only write endpoint. It changes `status` and nothing else (it cannot edit a title, price or description). It changes the live data, so undo your test afterwards.

```bash
curl -X PATCH https://strathshop.onrender.com/api/listings/17/availability \
  -H "Content-Type: application/json" \
  -d '{"status": "booked"}'
```

**200 OK**: echoes the new status, lowercase:

```json
{ "status": "booked" }
```

`status` must be `available` or `booked` (any capitalisation, surrounding spaces ignored). To undo the example above:

```bash
curl -X PATCH https://strathshop.onrender.com/api/listings/17/availability \
  -H "Content-Type: application/json" \
  -d '{"status": "available"}'
```

### 4. List all categories

```bash
curl https://strathshop.onrender.com/api/categories
```

**200 OK**: an array of `{ id, label }` objects, one per category. `label` is lowercase and is the exact value the `?category=` filter expects:

```json
[
  { "id": 1, "label": "textbooks" },
  { "id": 2, "label": "electronics" },
  { "id": 3, "label": "fashion" },
  { "id": 4, "label": "furniture" },
  { "id": 5, "label": "services" },
  { "id": 6, "label": "food" },
  { "id": 8, "label": "wellness" },
  { "id": 9, "label": "counseling" }
]
```

### 5. Get one category

```bash
curl https://strathshop.onrender.com/api/categories/8
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

| Status            | When it happens                                                                                                                        | Example request                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `400 Bad Request` | `category` is not `wellness` or `counseling`; or `status` is missing or not `available`/`booked`; or the request body isn’t valid JSON | `GET /listings?category=pizza` |
| `404 Not Found`   | No listing or category with that id, or the id isn't a positive integer                                                                | `GET /listings/9999`           |

Real example, a listing that doesn't exist:

```bash
curl -i https://strathshop.onrender.com/api/listings/9999
```

`404 Not Found`

```json
{ "error": "Listing not found" }
```

The `-i` makes curl print the status line and headers before the body, which is how you can see the status code.

---

## Run it locally

You only need this if you want your own copy. The hosted URL above needs no setup.

You need [Node.js](https://nodejs.org) 18 or newer, [Git](https://git-scm.com), and **MySQL 8** with its server running. If your terminal says `mysql` isn't recognised, run it by its full path instead (on Windows, usually `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`) or add the bin path to your system environment variables and relaunch the terminal.

**1. Clone the repo**

```bash
git clone https://github.com/jkimanii/team8-webapp
cd team8-webapp
```

**2. Create the database.** In a terminal (it asks for your MySQL root password):

```bash
mysql -u root -p -e "CREATE DATABASE strathshop;"
```

**3. Load the tables and the sample data.** Two files, run in this order:

- `db/schema.sql` creates the empty tables. **It deletes and recreates them, so only run it on a database you can afford to wipe.**
- `db/seed.sql` fills them with the sample data. Run it once: running it twice fails with `Duplicate entry`.

In the repo folder:

```bash
mysql -u root -p strathshop -e "source db/schema.sql"
mysql -u root -p strathshop -e "source db/seed.sql"
```

This form works in every shell, including PowerShell. If your MySQL isn't on port 3306, add `-h 127.0.0.1 -P <port>` to these commands.

To start over later, run `schema.sql` and then `seed.sql` again.

**4. Install, configure and start the server**

```bash
cd server
npm install
cp .env.example .env
```

On Windows `cmd.exe`, use `copy .env.example .env` instead of `cp`. Then open `server/.env` and set `DB_PASSWORD` to your MySQL password. If your MySQL isn't on the default port 3306, also change `DB_PORT`. Leave the other values as they are.

```bash
npm start
```

(`npm run dev` does the same but restarts when you change the code.) The terminal should show that the server is running on port 5000.

**5. Check it works**

```bash
curl "http://localhost:5000/api/listings?category=wellness"
```

If that returns a JSON array, you're done. To stop the server, press Ctrl-C.

**6. The website (optional).** The repo also holds the StrathShop front end, which needs the server from step 4 to be running. In a second terminal, from the repo folder:

```bash
cd client
npm install
npm run dev
```

Then open `http://localhost:5173`.

### Windows note

In `cmd.exe`, single quotes don't work and JSON needs escaped double quotes. The PATCH example becomes:

```bat
curl -X PATCH https://strathshop.onrender.com/api/listings/17/availability -H "Content-Type: application/json" -d "{\"status\": \"booked\"}"
```

In PowerShell, `curl` is a different command with different options. Type `curl.exe` instead, or run the commands in Git Bash. For the PATCH request in PowerShell, Git Bash is the easier route.

---

## If something goes wrong

| Symptom                                                          | Likely cause                                                 | Fix                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| The first hosted request takes about a minute                    | The free server was asleep                                   | Wait; it answers quickly afterwards                                                   |
| `Failed to connect` / `connection refused` on `localhost:5000`   | Your local server isn't running, or it's on a different port | Re-run `npm start` in `server/` and check the port it prints                          |
| The server crashes or returns `500` with `ECONNREFUSED`          | MySQL isn't running, or `DB_PORT` is wrong                   | Start the MySQL server (on Windows, the `MySQL80` service); check `DB_PORT` in `.env` |
| `Access denied for user 'root'`                                  | Wrong `DB_PASSWORD`                                          | Fix it in `server/.env`, then stop the server with Ctrl-C and run `npm start` again   |
| `Unknown database 'strathshop'`                                  | Step 2 was skipped, or `DB_NAME` doesn't match               | Create the database; check `DB_NAME` in `.env`                                        |
| `Table 'strathshop.listings' doesn't exist`                      | `schema.sql` wasn't run                                      | Run step 3                                                                            |
| `200` but an empty array `[]`                                    | `seed.sql` wasn't run                                        | Run `seed.sql`                                                                        |
| `Duplicate entry ... for key 'PRIMARY'` while running `seed.sql` | The sample data is already loaded                            | Run `schema.sql` first to reset, then `seed.sql`                                      |
| `mysql` is not recognised                                        | The MySQL program isn't on your PATH                         | Run it by its full path (see Run it locally), or add its folder to your PATH          |
| `400` on a category you're sure is valid                         | Typo, or a category outside `wellness` / `counseling`        | Check spelling; see `GET /categories`                                                 |
| `404` on an id that looks right                                  | The id isn't in the database, or it isn't a plain integer    | Try `GET /listings?category=wellness` to see real ids                                 |
