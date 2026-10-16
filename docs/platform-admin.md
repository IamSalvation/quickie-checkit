# Platform Admin Guide

You are the platform admin -- the person who runs Quickie Pinkas. This doc covers everything you need to do outside the app (SQL, Supabase dashboard) plus how to use the Platform Console at /platform.

## How to access the Platform Console

1. Log in as a platform admin operator.
2. The app automatically redirects you to /platform after login.
3. Or click "Platform Console" at the bottom of the left sidebar (visible only to platform admins).

## Roles

- Platform admin: operators.is_platform_admin = true. Sees /platform, all accounts, all data. Only you have this.
- Account owner: operators.is_owner = true. Owns one account. Full control of that account's data.
- Account admin / lecturer / staff: scoped to their account only.

## Approving a new account

When someone signs up, their account has status = 'pending' and they cannot log in until you approve it.

Via the Platform Console:
1. Go to /platform/customers
2. Find the account (status badge shows "pending")
3. Click Approve

Via SQL:
update public.accounts
set status = 'active'
where slug = 'their-slug-here';

## Pausing an account

Prevents login. Data is preserved.

Via the console: /platform/customers -> find account -> Pause

Via SQL:
update public.accounts
set status = 'paused'
where slug = 'their-slug-here';

## Restoring / unpausing

Via the console: /platform/customers -> filter to Paused -> Restore

Via SQL:
update public.accounts
set status = 'active'
where slug = 'their-slug-here';

## Changing tier (V1 <-> V2)

- V1: QR badge + photo capture, no face verification.
- V2: Face enrollment, kiosk verification, review queue.

Via the console: /platform/customers -> click the tier badge on the account row -> toggles V1 <-> V2

Via SQL:
update public.accounts
set tier = 'v2'
where slug = 'their-slug-here';

## Making someone a platform admin

Grants access to /platform. Do this sparingly -- a platform admin bypasses all RLS and can see/edit every account.

SQL:
update public.operators
set is_platform_admin = true
where email = 'their-email@example.com';

To revoke:
update public.operators
set is_platform_admin = false
where email = 'their-email@example.com';

## Soft-deleting an account

Sets status = 'deleted'. Data is preserved. The account cannot log in.

Via the console: /platform/customers -> Delete

Via SQL:
update public.accounts
set status = 'deleted'
where slug = 'their-slug-here';

## Hard-deleting an account

Permanently removes the account and ALL associated data (operators, participants, contexts, kiosks, presence records, face embeddings, support messages). This is irreversible.

Via the console: /platform/customers/:id -> Danger zone -> Permanently delete account -> type the account name to confirm.

Via SQL (do not run unless certain):
delete from public.accounts where slug = 'their-slug-here';

## Support messaging

- Every account has one support thread (support_threads, unique per account_id).
- Account admins write via /messages in their own dashboard.
- You read and reply via /platform/inbox.
- Unread counts appear as red badges in the sidebar and the platform nav.

## Useful queries

List all accounts with counts:

select
  a.name, a.slug, a.status, a.tier,
  (select count(*) from public.operators o where o.account_id = a.id) as operators,
  (select count(*) from public.participants p where p.account_id = a.id) as participants,
  (select count(*) from public.contexts c where c.account_id = a.id) as contexts
from public.accounts a
order by a.created_at desc;

Find pending accounts:

select name, slug, created_at
from public.accounts
where status = 'pending'
order by created_at desc;

Check face enrollments for an account:

select p.full_name, pfe.enrolled_at
from public.participants p
left join public.participant_face_embeddings pfe on pfe.participant_id = p.id
where p.account_id = 'ACCOUNT-UUID-HERE'
order by p.full_name;