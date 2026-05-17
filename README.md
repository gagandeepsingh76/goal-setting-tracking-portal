# Goal Setting & Tracking Portal

Production-ready Next.js 14 goal setting, approval, tracking, check-in, reporting, audit, shared-goal, and escalation portal for Employee, Manager, and Admin roles.

## Prerequisites

- Node.js 18+
- PostgreSQL running locally
- A database named `goalportal` or an equivalent database referenced by `DATABASE_URL`

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in values:

   ```bash
   cp .env.local.example .env.local
   ```

3. Push the Prisma schema:

   ```bash
   npx prisma db push
   ```

4. Seed demo data:

   ```bash
   npx prisma db seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Seeded Credentials

- Admin: `admin@company.com` / `Password@123`
- Manager: `manager@company.com` / `Password@123`
- Employee Alice: `alice@company.com` / `Password@123`
- Employee Bob: `bob@company.com` / `Password@123`
- Employee Carol: `carol@company.com` / `Password@123`

The login page includes Quick Login buttons for Alice, Manager, and Admin.

## Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "db:push": "prisma db push",
  "db:seed": "ts-node --compiler-options \"{\\\"module\\\":\\\"CommonJS\\\"}\" prisma/seed.ts",
  "db:studio": "prisma studio"
}
```

## Notes

- SMTP is optional for local demo. If SMTP env vars are missing, emails are logged to the console with the same HTML content and deep links.
- The seeded active cycle is `FY 2025-26` with the exact date windows requested in the prompt.
- All portal routes require authentication, with role checks in both middleware and API route handlers.
