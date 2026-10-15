# School Onboarding Walkthrough

How to onboard a new school onto Quickie CheckIt. Should take 15-30 minutes for a small school (up to a few hundred students).

## Prerequisites

- The school admin has an email address
- You (the platform admin) are logged in
- The school tier is decided (V1 or V2)

## Step 1 -- School signs up

Send the school admin this URL:

  https://quickie-checkit.vercel.app/signup

They fill in:
- Their name
- School name (this becomes their account name)
- Preset: School
- Email + password

They land on a pending approval screen.

## Step 2 -- You approve the account

Log in as platform admin.

Option A (UI):
1. Go to /platform/customers
2. Find the new account (badge shows "pending")
3. Click Approve

Option B (SQL):
update public.accounts set status = 'active'
where slug = 'the-schools-slug';

## Step 3 -- Set the tier

If the school needs face verification (V2):

update public.accounts set tier = 'v2'
where slug = 'the-schools-slug';

Or via /platform/customers -> click the tier badge.

## Step 4 -- School admin logs in

They go to /login, enter email + password, land on /dashboard.

## Step 5 -- School admin creates courses (programs)

In their dashboard:
1. Sidebar -> Courses
2. Click "Add Course"
3. Name: Mathematics 101, Code: MTH101, Type: Course
4. Repeat for each course

Bulk import via CSV is planned for a later phase.

## Step 6 -- School admin registers students

1. Sidebar -> Students
2. Click "Add Student"
3. Each student gets an auto-generated ID (PREFIX-00001, PREFIX-00002, etc.)
4. If the school has existing matric numbers, enter them as "External ID"

## Step 7 -- Print QR badges

1. Sidebar -> Students -> Print badges (top-right)
2. Preview shows all students, 8 per A4 page
3. Browser print dialog -> Save as PDF, or send to printer
4. Hand out badges to students

Note: badges contain QR + name + school ID. No photo on the badge (anti-spoof).

## Step 8 -- (Optional) V2 face enrollment

If the school is on V2:
1. Open each student detail page
2. Click "Enroll face"
3. Capture the face (live, front camera, close-up)
4. Confirm consent checkbox
5. Save

Enrollment captures a 128-dim embedding plus a profile photo.

Do this in bulk during registration week: a tablet on a desk, students line up one by one.

## Step 9 -- Register a kiosk

1. Sidebar -> Kiosks
2. Click "Register device"
3. Name: Lecture Hall A (or Main Gate, Front Desk, etc.)
4. Note the setup URL (something like /kiosk/setup/DEVICE-TOKEN)

On the tablet:
1. Open Chrome or Safari, navigate to the setup URL
2. It stores the device token in localStorage and redirects to /kiosk/scan
3. Grant camera permission when prompted
4. The kiosk is now live: it shows the open session name and waits for QR scans

Bookmark the kiosk page on the tablet so it can be reopened easily.

## Step 10 -- Run the first session

1. Sidebar -> Sessions
2. Click "Add Session"
3. Label: MTH101 Week 1 - Mon 8am, Type: Lecture, Course: Mathematics 101
4. Set starts + ends (optional)
5. Save, then click into the session detail page
6. Click "Open for check-in" -- status flips to open
7. Kiosk now shows the session as open. Students walk up, scan, done.
8. If the school needs check-out: click "Switch to check-out" to flip the phase
9. Click "Close session" when done

## Optional -- Online check-in for hybrid classes

While a session is open:
1. Session detail page -> Online check-in
2. Click "Open online check-in" -> pick 15/30/60 min or manual
3. Copy the link and share with students (WhatsApp, email, LMS)
4. Students enter their system ID (or scan their badge QR) from their phone

## Step 11 -- Track attendance

On the session detail page:
- Live list of check-ins with name, time, method, face status
- Live count: present / absent / online / in-person
- Auto-refresh every 5 seconds while the session is open

Reports (from the sidebar Reports page):
- Course Master Sheet: one row per student, one column per session + attendance percent
- Session Register: one session, all students, present/absent

## Step 12 -- Grades (school preset only)

1. Sidebar -> Grades -> CA components (settings icon)
2. Define the CA structure once: Test 1 (max 10), Test 2 (max 10), Assignment (max 5), Quiz (max 5)
3. Save. This applies to all courses.
4. Back to Grades, pick a course, enter CA scores per student + exam score
5. Total + Grade auto-compute on the Nigeria scale (A 70+, B 60-69, C 50-59, D 45-49, E 40-44, F 0-39)
6. Override a grade manually if needed: click the grade cell, type, save

## Support

Students or the school admin can message you from their sidebar -> Messages. You reply from /platform/inbox.

## Checklist

- [ ] School admin signed up
- [ ] Account approved
- [ ] Tier set (V1 or V2)
- [ ] Courses created
- [ ] Students registered
- [ ] Badges printed
- [ ] Face enrolled (V2 only)
- [ ] Kiosk registered + paired on tablet
- [ ] First session opened
- [ ] First student checked in
- [ ] Reports verified
- [ ] CA components defined
- [ ] Support thread started