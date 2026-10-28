# DigiKhata — Supabase-connected app

This project now uses Supabase Auth and Postgres for business setup, customers, suppliers, ledger entries, expenses, bank accounts, bank transactions, and team invitations. Browser localStorage is only a cache; it is not an authentication or source-of-truth database.

## 1. Configure the frontend

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` to your Supabase project URL.
3. Set `VITE_SUPABASE_ANON_KEY` to your project's publishable key (or legacy anon key).
4. Set `VITE_SUPABASE_STORAGE_BUCKET` only if you have configured that bucket. File storage policies still need to be configured separately for your desired public/private attachment strategy.
5. Do **not** put the service-role key in `.env.local`, any `VITE_` variable, source code, or a public repository.

## 2. Apply the database migration

Open Supabase Dashboard → SQL Editor, paste and run:

`supabase/migrations/20261028000001_digikhata_initial_schema.sql`

The migration creates tenant tables, membership/role enums, indexes, RLS policies, profile synchronization, atomic business creation, atomic ledger posting, opening-balance creation, and atomic bank transaction posting.

Run it against a test project first. If the earlier incomplete migration has already been run in production, back up your database and review the existing data/schema before applying changes. Do not reset a database containing real financial records without a migration plan.

## 3. Deploy the team invitation function

Team invitations require the Supabase server-side Admin API; that must never be called from browser code.

Install the Supabase CLI and sign in, then from the project directory run:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy invite-team-member
supabase secrets set APP_URL=https://YOUR-APP-DOMAIN.example
```

The Edge Function uses Supabase's server-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` environment variables. Keep the service-role key server-side only. Configure your real deployed URL in `APP_URL` and in Supabase Auth → URL Configuration → Redirect URLs.

## 4. Run locally

```sh
npm install
npm run dev
```

Create `.env.local` before starting Vite. Restart Vite after environment variable changes.

## 5. Supabase Auth configuration

- Configure Site URL and allowed redirect URLs in Supabase Auth.
- For email confirmation, users must confirm their email before signing in if confirmation is enabled.
- Configure custom SMTP for production; the built-in email service has strict rate limits.
- Test signup, confirmation, sign-in, sign-out, password recovery, owner business creation, and tenant isolation with two separate test accounts.

## Notes / remaining production checklist

- File uploads need Storage bucket policies and signed/private URLs appropriate to the data. Do not use a public bucket for private receipts or identity documents.
- The current UI has no product/inventory database tables in the supplied schema; stock dashboard values are placeholders until an inventory schema and screens are implemented.
- Team invitation requires the deployed Edge Function above.
- Verify role-specific authorization and RLS policies in a separate test project before using real financial data.
