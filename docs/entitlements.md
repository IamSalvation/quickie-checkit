# Tier Entitlements (V1 vs V2)

Quickie CheckIt has two subscription tiers. Tiers are managed per account (accounts.tier). Only a platform admin can change them.

## At a glance

| Feature                                | V1                        | V2                        |
| -------------------------------------- | ------------------------- | ------------------------- |
| Operator logins                        | Yes                       | Yes                       |
| Participant registration               | Yes                       | Yes                       |
| QR badges (print + bulk)               | Yes                       | Yes                       |
| In-person kiosk check-in               | Yes (QR + photo)          | Yes (QR + photo + face)   |
| Online kiosk (public link)             | Yes (QR scan only)        | Yes (QR scan only)        |
| ID entry fallback                      | Yes (toggle per context)  | Yes (toggle per context)  |
| Check-out / check-in phase             | Yes                       | Yes                       |
| Reports (master sheet, register, grades)| Yes                      | Yes                       |
| Support messaging                      | Yes                       | Yes                       |
| Face enrollment                        | No                        | Yes                       |
| Face verification at kiosk             | No                        | Yes                       |
| Face review queue                      | No                        | Yes                       |

## What V1 gets

- Full attendance flow without face verification
- QR badge scan at kiosks
- Photo captured at check-in (for audit + review)
- Everything else (participants, programs, contexts, kiosks, reports, grades, support)

V1 is designed for:
- Schools without exam-integrity requirements
- Symposiums, workshops, one-off events
- Hotels, clinics, any context where QR + photo is sufficient

## What V2 adds

- Face enrollment: capture a 128-dim embedding from a live photo of each participant
- Kiosk verification: after QR scan, capture a live selfie, compare against the enrolled embedding
- Face review queue: mismatches and no-face cases appear as an amber card on the context detail page for admin approve/reject
- Anti-spoof: minimum face size threshold; no photos on printed badges (badge is QR + name + IDs only)

V2 is designed for:
- Schools with exam attendance requirements
- Any context where "the right person showed up" is critical

## How face verification behaves

Non-blocking:

- If a participant is not enrolled, check-in still succeeds. Flagged as not_attempted + no_enrollment (grey "Not enrolled" badge in the attendance table).
- If face does not match, check-in still succeeds. Flagged as no_match, appears in the review queue (amber).
- If no face is detected at the kiosk, check-in still succeeds. Flagged as no_face_detected, appears in the review queue (amber "No face").
- Admin reviews and either approves (keeps the check-in) or rejects (marks the participant absent).

## Changing a tier

Via the Platform Console: /platform/customers -> click the tier badge on the account row.

Or SQL:
update public.accounts set tier = 'v2' where slug = 'their-slug';

## Billing implications

None yet. Tiers are just feature gates. Billing will be added in a later phase.