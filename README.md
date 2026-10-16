# Quickie Pinkas

Presence tracking for everything that is not work. Schools, symposiums, bootcamps, hotels, events - anything where people check in to a session, stay, or context.

Sibling product: Quickie ClockIt - workforce attendance and payroll.

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Vercel (hosting)

## Structure

apps/admin/ - React + Vite frontend
supabase/migrations/ - SQL migrations
docs/ - Product and platform docs

## Local dev

cd apps/admin
npm install
npm run dev

## Deploy

Vercel, root directory apps/admin.
