# SkyRoute Schedule

Employee scheduling and attendance tracking system built with React + Firebase.

## Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Email/Password** authentication
3. Create a **Firestore** database (start in test mode for development)
4. Copy `.env.example` to `.env` and fill in your Firebase config values
5. Install dependencies: `npm install`
6. Run dev server: `npm run dev`

## Seed Demo Data

Visit `/seed` in the browser and click "Run Seed" to populate Firebase with demo accounts and data.

**Demo Accounts:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@skyrouteco.com | Admin@123 |
| Employee | alice@skyrouteco.com | Employee@123 |
| Employee | bob@skyrouteco.com | Employee@123 |
| Employee | carol@skyrouteco.com | Employee@123 |
| Employee | dan@skyrouteco.com | Employee@123 |

## Features

- Admin: weekly schedule manager with shift add/delete and week navigation
- Admin: attendance reports per employee with date filtering
- Employee: personal schedule viewer with week navigation
- Employee: clock in/clock out with time tracking
- Firebase Authentication + Firestore

## Firestore Collections

- `users` — user profiles (uid, email, name, role)
- `shifts` — scheduled shifts (userId, date, startTime, endTime, weekStart)
- `attendance` — clock records (userId, date, clockIn, clockOut, duration)

## Firebase Indexes Required

In Firestore, create a composite index for `attendance`:
- Fields: `userId` (ASC), `date` (ASC), `__name__` (ASC)
