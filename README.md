# StrathShop — Team 8

Campus marketplace for Strathmore students. React (Vite) frontend + Express/MariaDB API.

## Setup

### Database

1. Install XAMPP and DBeaver
2. Start **MySQL** in the XAMPP Control Panel
3. In DBeaver, create the database:

```sql
   CREATE DATABASE strathmore_marketplace;
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
