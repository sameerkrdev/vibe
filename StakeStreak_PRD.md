# StakeStreak — Product Requirements Document (PRD)
### Version: 1.1 | Status: v0 / Hackathon Build
### Last Updated: April 2026
### Changelog v1.1: Added TrustPod group concept, peer-voting verification for recurring groups, video proof support, public recurring groups, community tab, group wallet pool UI, ProofVote schema.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Authentication](#5-authentication)
6. [Token System (Wallet)](#6-token-system-wallet)
7. [Bet Types — Deep Dive](#7-bet-types--deep-dive)
8. [Bet Lifecycle](#8-bet-lifecycle)
9. [Proof Submission & AI Verification](#9-proof-submission--ai-verification)
10. [Daily Check-in & Scheduling](#10-daily-check-in--scheduling)
11. [Notification System](#11-notification-system)
12. [User Dashboard](#12-user-dashboard)
13. [API Routes](#13-api-routes)
14. [User Flows (End-to-End)](#14-user-flows-end-to-end)
15. [UI/UX Design System](#15-uiux-design-system)
16. [Pages & Components](#16-pages--components)
17. [Edge Cases & Business Logic](#17-edge-cases--business-logic)
18. [Redis Usage](#18-redis-usage)
19. [Environment Variables](#19-environment-variables)
20. [Folder Structure](#20-folder-structure)

---

## 1. Product Overview

### 1.1 Product Name
**StakeStreak** — Bet on your habits, not just your willpower.

### 1.2 Tagline
Put your tokens where your streaks are.

### 1.3 What is StakeStreak?
StakeStreak is a web-based habit accountability platform where users create or join monetary-style commitment groups tied to daily habits. Instead of real money, users use platform **tokens** (1 INR = 1 Token for demo purposes). Users commit tokens upfront, complete daily habit check-ins by posting **photo or video proof**, and earn or lose tokens based on their consistency.

The platform has two core group mechanics with two different verification systems:
- **Recurring Groups (TrustPods)** — Fixed-duration accountability groups with **peer voting** verification. Group members vote on each other's daily proofs. Majority acceptance = check-in recorded.
- **Last Man Standing Bets** — Open-ended streak competitions where proof is verified by **AI (GPT-4o Vision)** for speed and objectivity.

### 1.4 TrustPod Concept
A **TrustPod** is a temporary, purpose-bound micro-group (implemented as a Recurring Group in this platform) where members commit to a shared real-world task for a fixed duration and are held accountable through **social/peer verification** and monetary incentives. The "pod" framing reflects that these are trusted small circles — friends, colleagues, or community members — who verify each other's progress. The term TrustPod is used in the UI when referring to Recurring-type groups.

### 1.5 Core Value Proposition
- Real financial accountability without real-money complexity (token-based for v0)
- Social commitment with friends or the public community
- **Dual verification system**: Peer voting for group accountability (Recurring), AI verification for competitive fairness (LMS)
- Photo AND video proof support — flexible for different habit types
- Two distinct mechanics: collaborative accountability vs. competitive elimination

### 1.6 Target Users
- Friend groups wanting social accountability (gym, reading, coding, diet)
- Community members joining public challenges open to everyone
- Competitive individuals wanting a "last one standing" streak challenge
- Anyone who needs financial skin-in-the-game for motivation

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + TypeScript | SPA UI |
| Styling | Tailwind CSS + shadcn/ui | Component system, dark/light mode |
| Routing | React Router v6 | Client-side routing |
| State | React Query (TanStack) + Zustand | Server state + client state |
| Backend | Node.js + Express + TypeScript | REST API server |
| Database | PostgreSQL via Prisma ORM | Primary data store |
| Cache | Redis (ioredis) | Sessions, job queues, rate limiting |
| Job Queue | BullMQ (Redis-backed) | Scheduled daily checks, notifications |
| Auth | Passport.js | Google OAuth2 + Local strategy |
| Sessions | express-session + connect-redis | Session persistence |
| AI Verification | OpenAI GPT-4o Vision API | Image proof verification (LMS bets only) |
| Media Upload | Multer + Cloudinary | Proof image storage (JPG/PNG/WEBP, max 5MB) |
| Email | Nodemailer (or Resend) | Invite emails, notifications |
| Build | Vite | Frontend bundler |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (React)                    │
│  React + TypeScript + shadcn/ui + TanStack Query     │
└────────────────────┬────────────────────────────────┘
                     │ HTTP REST
┌────────────────────▼────────────────────────────────┐
│               NODE.JS EXPRESS API                    │
│  TypeScript | Passport.js | Multer | BullMQ          │
└──────┬───────────────────────────┬──────────────────┘
       │                           │
┌──────▼──────┐           ┌────────▼────────┐
│  PostgreSQL  │           │     Redis        │
│  (Prisma)   │           │  Sessions + Queue│
└─────────────┘           └─────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   BullMQ Workers     │
                        │ - daily-check cron   │
                        │ - notification queue │
                        │ - token settlement   │
                        └──────────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   OpenAI GPT-4o      │
                        │   Vision API         │
                        └──────────────────────┘
```

---

## 4. Database Schema

> Written as Prisma schema. All timestamps are UTC.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  username         String    @unique
  passwordHash     String?   // null if Google OAuth user
  googleId         String?   @unique
  avatarUrl        String?
  displayName      String
  tokenBalance     Int       @default(500) // Starting tokens for demo
  totalDeducted    Int       @default(0)   // Lifetime tokens lost
  totalEarned      Int       @default(0)   // Lifetime tokens gained
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  betsCreated      Bet[]     @relation("BetCreator")
  participations   BetParticipant[]
  proofSubmissions ProofSubmission[]
  notifications    Notification[]
  transactions     TokenTransaction[]
}

// ─────────────────────────────────────────────────────────────
// BET
// ─────────────────────────────────────────────────────────────
enum BetType {
  RECURRING      // Fixed duration, per-miss deduction
  LAST_MAN_STANDING  // No end date, prize pool, last streak wins
}

enum BetStatus {
  DRAFT          // Created but not yet started by admin
  ACTIVE         // Running, check-ins accepted
  COMPLETED      // Ended (RECURRING: after end date; LMS: one winner remains)
  CANCELLED      // Admin cancelled before start
}

enum BetVisibility {
  PRIVATE        // Invite link only (both types)
  PUBLIC         // Discoverable in explore (LAST_MAN_STANDING only)
}

model Bet {
  id                String        @id @default(cuid())
  title             String
  description       String?
  type              BetType
  status            BetStatus     @default(DRAFT)
  visibility        BetVisibility @default(PRIVATE)

  creatorId         String
  creator           User          @relation("BetCreator", fields: [creatorId], references: [id])

  // Token configuration
  tokenPerMiss      Int           // Deducted per missed day (RECURRING)
  // For RECURRING: totalStake = tokenPerMiss * totalActiveDays
  // For LMS: each participant locks a flat entryTokens amount

  entryTokens       Int           // Tokens locked upfront per participant
  // RECURRING: entryTokens = tokenPerMiss * count(scheduledDays)
  // LMS: flat amount set by admin

  // Schedule configuration (customizable calendar)
  // activeDays stores which weekdays are active: ["MON","TUE","WED","THU","FRI"]
  // OR specific dates for one-off schedules
  scheduleDays      String[]      // e.g. ["MON","WED","FRI"] or ISO dates for custom
  scheduleType      String        @default("WEEKDAYS") // "WEEKDAYS" | "CUSTOM_DATES"

  // Date range (RECURRING only)
  startDate         DateTime?
  endDate           DateTime?

  // Proof configuration
  proofDescription  String        // e.g. "Post a selfie at the gym with equipment visible"

  // Invite
  inviteCode        String        @unique @default(cuid())

  prizePool         Int           @default(0) // Auto-calculated: sum of all entryTokens

  createdAt         DateTime      @default(now())
  startedAt         DateTime?
  completedAt       DateTime?

  participants      BetParticipant[]
  checkInDays       BetCheckInDay[]
  proofSubmissions  ProofSubmission[]
}

// ─────────────────────────────────────────────────────────────
// BET PARTICIPANT
// ─────────────────────────────────────────────────────────────
enum ParticipantStatus {
  JOINED         // Joined, tokens locked, bet not started
  ACTIVE         // Bet running, participant still in
  ELIMINATED     // LMS: missed a day, out of prize pool
  COMPLETED      // RECURRING: bet ended, settlement done
  WITHDRAWN      // Left before bet started (refund issued)
}

model BetParticipant {
  id              String            @id @default(cuid())
  betId           String
  bet             Bet               @relation(fields: [betId], references: [id])
  userId          String
  user            User              @relation(fields: [userId], references: [id])

  status          ParticipantStatus @default(JOINED)
  tokensLocked    Int               // entryTokens locked at join
  tokensDeducted  Int               @default(0) // Running total deducted (RECURRING)
  streak          Int               @default(0) // Current consecutive days checked in
  longestStreak   Int               @default(0)
  eliminatedAt    DateTime?         // LMS: when they missed a day
  claimedAt       DateTime?         // When they claimed their payout

  joinedAt        DateTime          @default(now())

  @@unique([betId, userId])
}

// ─────────────────────────────────────────────────────────────
// BET CHECK-IN DAY (one record per participant per scheduled day)
// ─────────────────────────────────────────────────────────────
enum DayStatus {
  PENDING        // Day not yet reached
  OPEN           // Today — check-in window is open
  CHECKED_IN     // User submitted valid proof
  MISSED         // Window closed, no valid proof
  SKIPPED        // Not a scheduled day (informational)
}

model BetCheckInDay {
  id            String     @id @default(cuid())
  betId         String
  bet           Bet        @relation(fields: [betId], references: [id])
  participantId String
  scheduledDate DateTime   // The date this check-in is for (date only, no time)
  status        DayStatus  @default(PENDING)
  tokensDeducted Int       @default(0)
  deadlineAt    DateTime   // End of day in user's timezone (default: 23:59:59 UTC)
  checkedInAt   DateTime?

  proofSubmissions ProofSubmission[]

  @@unique([betId, participantId, scheduledDate])
}

// ─────────────────────────────────────────────────────────────
// PROOF SUBMISSION
// ─────────────────────────────────────────────────────────────
enum ProofStatus {
  PENDING_REVIEW   // Uploaded, not yet processed
  // ── Peer voting flow (RECURRING groups / TrustPods) ──────────
  PEER_VOTING      // Awaiting votes from group members
  PEER_PASSED      // Majority accepted — check-in recorded
  PEER_FAILED      // Majority rejected — user can resubmit (attempt <= 2)
  // ── AI verification flow (LAST_MAN_STANDING) ─────────────────
  AI_REVIEWING     // In flight to OpenAI
  AI_PASSED        // AI approved
  AI_FAILED        // AI rejected — user can resubmit (attempt <= 2)
}

model ProofSubmission {
  id              String         @id @default(cuid())
  betId           String
  bet             Bet            @relation(fields: [betId], references: [id])
  participantId   String
  userId          String
  user            User           @relation(fields: [userId], references: [id])
  checkInDayId    String
  checkInDay      BetCheckInDay  @relation(fields: [checkInDayId], references: [id])

  imageUrl        String         // Cloudinary URL — JPG/PNG/WEBP, max 5MB

  status          ProofStatus    @default(PENDING_REVIEW)

  // AI verdict fields (LMS bets only)
  aiVerdict       String?        // "AI_PASSED" | "AI_FAILED"
  aiReason        String?        // AI explanation returned to user

  // Peer voting summary (RECURRING groups only)
  totalVotes      Int            @default(0)
  acceptVotes     Int            @default(0)
  rejectVotes     Int            @default(0)
  votingDeadline  DateTime?      // Votes open until 23:59 same day

  attemptNumber   Int            @default(1)  // 1 or 2 max

  submittedAt     DateTime       @default(now())
  reviewedAt      DateTime?

  votes           ProofVote[]
}

// ─────────────────────────────────────────────────────────────
// PROOF VOTE (peer voting — RECURRING groups / TrustPods only)
// ─────────────────────────────────────────────────────────────
enum VoteChoice {
  ACCEPT
  REJECT
}

model ProofVote {
  id                String          @id @default(cuid())
  proofSubmissionId String
  proofSubmission   ProofSubmission @relation(fields: [proofSubmissionId], references: [id])
  voterId           String          // Must be an ACTIVE participant of the same bet
  voter             User            @relation("VotesCast", fields: [voterId], references: [id])
  vote              VoteChoice
  createdAt         DateTime        @default(now())

  @@unique([proofSubmissionId, voterId]) // One vote per person per proof
}

// ─────────────────────────────────────────────────────────────
// TOKEN TRANSACTION (audit log)
// ─────────────────────────────────────────────────────────────
enum TransactionType {
  LOCK           // Tokens locked into bet escrow on join
  DEDUCT         // Tokens deducted for a missed day
  REFUND         // Tokens returned (e.g., bet cancelled)
  PAYOUT         // Prize pool claimed
  REDISTRIBUTE   // RECURRING: deducted tokens split among winners
  SIGNUP_BONUS   // Initial 500 tokens on registration
}

model TokenTransaction {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id])
  betId       String?
  type        TransactionType
  amount      Int             // Positive = credit, Negative = debit
  balanceBefore Int
  balanceAfter  Int
  description String
  createdAt   DateTime        @default(now())
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATION
// ─────────────────────────────────────────────────────────────
enum NotificationType {
  BET_INVITE              // Someone invited you to a bet/group
  BET_STARTED             // Admin started the bet/group you joined
  CHECK_IN_REMINDER       // Daily reminder to check in
  PROOF_PASSED            // Your proof was approved (either peer or AI)
  PROOF_FAILED            // Your proof was rejected (either peer or AI)
  TOKENS_DEDUCTED         // Missed a day, tokens deducted
  PARTICIPANT_ELIMINATED  // LMS: someone was eliminated
  BET_COMPLETED           // Bet/group is over
  PAYOUT_AVAILABLE        // You can now claim your payout
  BET_CANCELLED           // Bet cancelled, refund issued
  // ── Peer voting specific (RECURRING / TrustPod) ───────────────
  VOTE_NEEDED             // A group member submitted proof — go vote
  VOTE_RESULT             // Voting closed on someone's proof (they see result)
  MEMBER_PROOF_REJECTED   // Group member's proof was rejected by vote (for visibility)
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  type      NotificationType
  title     String
  body      String
  isRead    Boolean          @default(false)
  betId     String?
  createdAt DateTime         @default(now())
}
```

---

## 5. Authentication

### 5.1 Strategies

**Strategy 1: Google OAuth 2.0**
- User clicks "Continue with Google"
- Passport.js Google strategy redirects to Google consent screen
- On callback: find or create User by `googleId` / `email`
- New users get `tokenBalance = 500` + `SIGNUP_BONUS` transaction
- Session created via `express-session` + `connect-redis`

**Strategy 2: Username / Password (Local)**
- Registration: `POST /api/auth/register` — `{ email, username, displayName, password }`
- Password hashed with `bcrypt` (saltRounds: 12)
- Login: `POST /api/auth/login` — `{ emailOrUsername, password }`
- Same session flow as OAuth

### 5.2 Session Configuration
```typescript
// Session stored in Redis with 7-day TTL
session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
})
```

### 5.3 Auth Middleware
```typescript
// isAuthenticated — attach to all protected routes
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Unauthorized' });
};
```

### 5.4 Auth Flow (Frontend)
- On app load: `GET /api/auth/me` — returns user or 401
- If 401: redirect to `/login`
- Protected routes wrapped in `<AuthGuard>` component
- Zustand `useAuthStore` holds current user state

---

## 6. Token System (Wallet)

### 6.1 Token Rules
- All new users start with **500 tokens** (signup bonus)
- 1 Token = 1 INR in value (for display/context only — no real money movement in v0)
- Tokens are locked into escrow when a user joins a bet
- Tokens cannot go below 0 — joining a bet requires sufficient balance
- All token movements are recorded in `TokenTransaction`

### 6.2 Token Locking (Escrow Model)

When a user joins a bet:
1. `tokensLocked` is deducted from `user.tokenBalance` immediately
2. A `LOCK` transaction is recorded
3. The tokens conceptually sit in the bet's escrow
4. At bet completion: tokens are redistributed or claimed
5. At bet cancellation: all locked tokens are fully refunded

### 6.3 Token Deduction (Recurring Bets — Missed Days)

When a scheduled day closes and user has not submitted valid proof:
- `tokenPerMiss` is deducted from the escrowed pool (tracked in `BetParticipant.tokensDeducted`)
- A `DEDUCT` transaction is recorded
- An in-app `TOKENS_DEDUCTED` notification is created

### 6.4 Token Settlement — Recurring Bet

At bet end (after `endDate` passes and all days are processed):

**Pool of deducted tokens:** Total tokens deducted from ALL participants across all missed days.

**Distribution logic (Splitwise-style):**
- Each participant's share = proportional to days they completed
- A participant **cannot receive back their own deducted tokens** — only others' deducted tokens
- Formula:
  ```
  totalDeductedPool = SUM(allParticipants.tokensDeducted)
  participantShare = (participant.checkedInDays / totalCheckedInDays across all) * totalDeductedPool
  but participant.share -= participant.tokensDeducted (can't self-receive)
  ```
- Net payout = `tokensLocked` - `tokensDeducted` + `redistributedShare`
- Record as `REDISTRIBUTE` + `PAYOUT` transactions
- Update `user.tokenBalance`

### 6.5 Token Settlement — Last Man Standing

When only 1 participant remains ACTIVE:
- Winner receives the entire `bet.prizePool` (sum of all entryTokens)
- Record as `PAYOUT` transaction
- If there's a tie (all remaining participants miss on the same day), prize pool is split equally

### 6.6 Wallet Page
Displays:
- Current token balance
- Full transaction history (sorted by date, paginated)
- Each transaction: type badge, bet name, amount (+/-), running balance, timestamp

---

## 7. Bet Types — Deep Dive

### 7.1 Recurring Group (TrustPod)

**Concept:** A fixed-duration accountability group (called a **TrustPod** in the UI) where members commit to a shared habit task. Missing scheduled days costs tokens from the upfront stake. Missed tokens accumulate in a **group pool wallet** and are redistributed at the end based on performance. Proof is verified through **peer voting** — group members collectively vote on each submission.

**Visibility: PUBLIC or PRIVATE** (both are now supported)
- **PRIVATE**: Invite-link only. Admin shares a link; only people with the link can join.
- **PUBLIC**: Listed on the Community tab. Any platform user can discover and join before the group starts.

**Key Parameters (set at creation):**
| Parameter | Description | Example |
|---|---|---|
| `title` | Group name | "30-Day Gym Challenge" |
| `proofDescription` | What proof to submit | "Selfie at the gym with equipment visible" |
| `scheduleDays` | Which days require check-in | ["MON","TUE","WED","THU","FRI"] |
| `startDate` | First check-in day | 2026-05-01 |
| `endDate` | Last check-in day | 2026-05-30 |
| `tokenPerMiss` | Deducted per missed day | 10 tokens |
| `visibility` | PUBLIC or PRIVATE | PRIVATE |

**Auto-calculated:**
- `activeDayCount` = number of scheduled days between startDate and endDate
- `entryTokens` = `tokenPerMiss` × `activeDayCount`
  - Example: 10 tokens/miss × 30 days = 300 tokens locked upfront
- Users must have ≥ `entryTokens` to join

**Proof Verification: Peer Voting**
- After a member submits proof (image), all OTHER active group members receive a `VOTE_NEEDED` notification
- Each member can vote ACCEPT or REJECT on the proof
- Voting window: same day as submission, closes at 23:59
- Verdict rule: **simple majority of votes cast determines outcome**
  - More ACCEPTs than REJECTs → `PEER_PASSED` → check-in recorded, no deduction
  - More REJECTs than ACCEPTs → `PEER_FAILED` → user can resubmit (up to 2 attempts)
  - Tie or zero votes by deadline → defaults to `PEER_PASSED` (benefit of the doubt)
- Submitter cannot vote on their own proof
- Voters can see the submitted image before voting

**Group Pool Wallet:**
- Each missed day: `tokenPerMiss` moves from participant's escrow into the group's pool
- `bet.prizePool` field tracks the running total of pooled missed tokens
- Displayed on Bet Detail page as "Group Pool: ◈ X tokens"
- At bet end: pool distributed via Splitwise-style redistribution (see Section 6.4)

**Join Flow:**
1. Admin creates group → gets invite link (`/join/{inviteCode}`)
2. If PUBLIC: group also appears on Community tab
3. Members join by paying entry tokens (locked from wallet)
4. Once admin is ready → "Start Group" → ACTIVE, no new joins
5. Check-ins begin on `startDate`

---

### 7.2 Last Man Standing Bet

**Concept:** An open-ended streak competition. Each participant pays a flat entry into a prize pool. Miss a scheduled day and you're eliminated. The last participant with an unbroken streak claims the entire prize pool.

**Proof Verification: AI (GPT-4o Vision)**
Because LMS bets can be public and competitive, proof is verified by AI rather than peers. This prevents collusion (friends voting each other through) and gives instant verdicts. Only **images** are accepted (JPG/PNG/WEBP, max 5MB, uploaded to Cloudinary).

**Key Parameters:**
| Parameter | Description | Example |
|---|---|---|
| `title` | Bet name | "No Rest Day Coding Streak" |
| `proofDescription` | What proof to submit | "Screenshot of GitHub commits today" |
| `scheduleDays` | Active days | ["MON","TUE","WED","THU","FRI","SAT","SUN"] |
| `entryTokens` | Flat stake per person | 50 tokens |
| `visibility` | PRIVATE or PUBLIC | PUBLIC |

**No end date.** The bet runs until one person remains.

**Auto-calculated:**
- `prizePool` = `entryTokens` × number of joined participants (updated as people join before start)

**Public Bets:**
- Appear on "Explore" page
- Anyone can join before the admin starts it
- Once started: no more joins

**Private Bets:**
- Invite link only
- Same join/start flow as Recurring

**Elimination Logic:**
- If a participant does not submit valid proof by `deadlineAt` on a scheduled day → status = ELIMINATED
- `eliminatedAt` is recorded
- `PARTICIPANT_ELIMINATED` notification sent to all remaining participants
- Eliminated participants can still view the bet as spectators

**Win Condition:**
- Only 1 participant remains ACTIVE → they win
- Tie scenario: if on the same day, all remaining participants miss → prize pool split equally among all tied participants

---

## 8. Bet Lifecycle

### 8.1 Recurring Bet Lifecycle

```
DRAFT ──► (admin starts) ──► ACTIVE ──► (endDate passes + all days settled) ──► COMPLETED
  │                                                                                  │
  └──► (admin cancels before start) ──► CANCELLED ──────────────────── refund all  ─┘
```

**State transitions:**
- `DRAFT → ACTIVE`: Admin clicks "Start Bet". Requires at least 2 participants (including admin). Sets `startedAt`. Queues all `BetCheckInDay` records for each participant × each scheduled date.
- `ACTIVE → COMPLETED`: BullMQ cron job runs at midnight UTC. After `endDate`, once the final day's check-in window closes, triggers settlement job.
- `DRAFT → CANCELLED`: Admin cancels before starting. All locked tokens refunded.

### 8.2 Last Man Standing Lifecycle

```
DRAFT ──► (admin starts) ──► ACTIVE ──► (1 or 0 remain) ──► COMPLETED
  │
  └──► CANCELLED (before start)
```

**State transitions:**
- `DRAFT → ACTIVE`: Same as recurring. No end date set.
- `ACTIVE → COMPLETED`: When `activeParticipantCount` drops to ≤ 1 after any day's deadline processing.

### 8.3 Participant Status Flow

**RECURRING:**
```
JOINED ──► (bet starts) ──► ACTIVE ──► (bet ends) ──► COMPLETED ──► (claim) ──► paid out
```

**LMS:**
```
JOINED ──► (bet starts) ──► ACTIVE ──► (missed day) ──► ELIMINATED
                                     └──► (last one standing) ──► COMPLETED ──► (claim) ──► paid out
```

---

## 9. Proof Submission & Verification

### 9.1 Overview

On each scheduled check-in day, during the open window (00:00 to 23:59 IST), participants submit an **image** as proof of completing their habit (JPG/PNG/WEBP, max 5MB, uploaded to Cloudinary). Verification method depends on bet type:

| Bet Type | Verification Method | Who decides |
|---|---|---|
| Recurring Group (TrustPod) | **Peer Voting** | All other active group members vote |
| Last Man Standing | **AI (GPT-4o Vision)** | OpenAI returns instant verdict |

---

### 9.2 Media Upload (Common to Both)

```
User clicks "Check In Today" →
  Opens check-in modal →
  Image upload zone (click to select or drag & drop) →
  Preview shown after selection →
  Click "Submit Proof" →
  Image uploaded to Cloudinary (JPG/PNG/WEBP, max 5MB) →
  ProofSubmission created with imageUrl (status: PENDING_REVIEW) →
  Routes to appropriate verification flow based on bet.type
```

---

### 9.3A Verification Flow — Recurring Groups (Peer Voting)

```
ProofSubmission created (PENDING_REVIEW) →
  status → PEER_VOTING →
  votingDeadline set to 23:59 same day →
  VOTE_NEEDED notification sent to ALL other ACTIVE participants in the group →
  
  [Members vote throughout the day — each sees proof media + ACCEPT / REJECT buttons]
  
  BullMQ vote-tallier runs at 23:59 for all PEER_VOTING proofs →
  
  IF acceptVotes > rejectVotes OR totalVotes == 0:
    status → PEER_PASSED
    BetCheckInDay.status = CHECKED_IN
    BetParticipant.streak += 1
    Notification (submitter): PROOF_PASSED ("Your proof was accepted by the group!")
    
  IF rejectVotes >= acceptVotes AND totalVotes > 0:
    status → PEER_FAILED
    Notification (submitter): PROOF_FAILED ("Group rejected your proof. Reason: majority vote.")
    IF attemptNumber < 2: allow resubmit → new ProofSubmission (attemptNumber: 2)
    IF attemptNumber == 2: no more attempts → day will be MISSED at deadline
```

**Voting UI for group members:**
- A "Pending Votes" section appears on the Bet Detail page and Dashboard
- Each pending proof shown as a card:
  - Submitter's name + avatar
  - Proof image preview
  - Habit requirement reminder text
  - ACCEPT (green) / REJECT (red) buttons
  - Current vote count shown (e.g., "2 accepted, 1 rejected")
  - If already voted: shows your vote with ability to change until voting deadline

**Vote change policy:** Members can change their vote any time before the voting deadline (23:59).

---

### 9.3B Verification Flow — Last Man Standing (AI)

```
ProofSubmission created (PENDING_REVIEW) →
  status → AI_REVIEWING →
  API calls OpenAI GPT-4o Vision asynchronously →
  GPT-4o returns JSON verdict →
  
  IF "AI_PASSED":
    status → AI_PASSED
    BetCheckInDay.status = CHECKED_IN
    BetParticipant.streak += 1
    Notification: PROOF_PASSED ("Your proof was verified! ✓")
    
  IF "AI_FAILED":
    status → AI_FAILED
    Show aiReason to user
    IF attemptNumber < 2: allow resubmit
    IF attemptNumber == 2: no more attempts
```

### 9.4 Attempt Limits (Both Verification Types)
- Each user gets **exactly 2 submission attempts** per scheduled day per bet
- `ProofSubmission.attemptNumber` tracks this (1 or 2)
- After 2 failed attempts: the check-in window is effectively closed for that user
- The day is marked `MISSED` by the midnight cron job regardless

---

### 9.5 OpenAI Vision Prompt (LMS only)

```typescript
const systemPrompt = `You are a strict but fair proof verifier for a habit accountability app.
Determine whether the submitted image proves the user completed their habit.

Respond ONLY with this JSON (no preamble, no markdown):
{
  "verdict": "AI_PASSED" | "AI_FAILED",
  "reason": "One sentence shown to the user explaining your decision."
}

Guidelines:
- If image is blurry, irrelevant, clearly staged/recycled, or unrelated → AI_FAILED
- If image credibly shows the activity described → AI_PASSED
- Be lenient with lighting/quality but strict with relevance.`;

const userPrompt = `Habit requirement: "${bet.proofDescription}"
Does this image prove the user completed the habit today?`;
```

```typescript
// API call — image only
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  max_tokens: 200,
  messages: [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        {
          type: "image_url",
          image_url: {
            url: proof.imageUrl,  // Cloudinary image URL
            detail: "low"         // cheaper, sufficient for verification
          }
        }
      ]
    }
  ]
});
```

---

### 9.6 Check-in Window
- Opens: 00:00:00 IST of the scheduled day
- Closes: 23:59:59 IST of the same day
- After close: midnight cron marks all non-CHECKED_IN open days as MISSED
- Peer voting deadline: also 23:59:59 IST same day (aligns with check-in window close)

---

## 10. Daily Check-in & Scheduling

### 10.1 BullMQ Cron Jobs

**Job 1: `daily-checkin-scheduler`** — Runs at 00:01 AM IST every day
- Queries all ACTIVE bets
- For each bet, checks if today is a scheduled day
- Creates `BetCheckInDay` records for each ACTIVE participant for today (status: OPEN)
- Sends `CHECK_IN_REMINDER` notifications to all ACTIVE participants

**Job 2: `peer-vote-tallier`** — Runs at 11:58 PM IST every day (RECURRING groups only)
- Queries all `ProofSubmission` records with status `PEER_VOTING` where `votingDeadline` <= now
- For each: tally votes → update `acceptVotes`, `rejectVotes`, `totalVotes`
- Apply verdict:
  - `acceptVotes > rejectVotes` OR `totalVotes == 0` → `PEER_PASSED`
  - `rejectVotes >= acceptVotes AND totalVotes > 0` → `PEER_FAILED`
- On `PEER_PASSED`: update `BetCheckInDay.status = CHECKED_IN`, increment `BetParticipant.streak`
- Send `PROOF_PASSED` / `PROOF_FAILED` notification to submitter
- On `PEER_FAILED` and `attemptNumber == 2`: day treated as missed at next job

**Job 3: `daily-deadline-processor`** — Runs at 11:59 PM IST every day
- Queries all OPEN `BetCheckInDay` records where `scheduledDate` = today
- For each still OPEN (not CHECKED_IN):
  - Mark as MISSED
  - For RECURRING groups: deduct `tokenPerMiss` from participant's escrowed tokens, add to `bet.prizePool`, create DEDUCT notification
  - For LMS bets: set participant status to ELIMINATED, send PARTICIPANT_ELIMINATED to all
- After processing LMS eliminations: check if only 1 (or 0) remain → trigger completion job

**Job 4: `bet-settlement`** — Triggered after RECURRING group endDate processing
- Calculates each participant's net payout using redistribution logic
- Updates `user.tokenBalance`
- Creates REDISTRIBUTE + PAYOUT transactions
- Marks bet as COMPLETED
- Sends PAYOUT_AVAILABLE + BET_COMPLETED notifications

### 10.2 Schedule Configuration at Bet Creation

**Option A: Weekdays Picker**
- User selects days of the week: Mon, Tue, Wed, Thu, Fri, Sat, Sun (toggle buttons)
- System auto-generates check-in days based on day of week within date range

**Option B: Custom Calendar Dates** (advanced)
- User picks specific dates from a calendar picker (multi-select)
- Useful for "every other day" or irregular schedules

For v0: **weekdays picker is the primary flow.** Custom calendar dates are a stretch goal.

### 10.3 Timezone Handling
- All dates stored as UTC in DB
- Display converted to IST (UTC+5:30) for v0
- Future: user-selectable timezone stored in User profile

---

## 11. Notification System

### 11.1 In-App Notifications (v0 scope — no push)

All notifications are stored in the `Notification` table and served via API.

**Notification Bell (Header)**
- Shows unread count badge
- Clicking opens a notification drawer/dropdown
- All notifications listed newest-first
- "Mark all as read" button
- Each notification links to the related bet

### 11.2 Notification Types & Triggers

| Type | Trigger | Recipients |
|---|---|---|
| `BET_INVITE` | User joins via invite link | Joiner only |
| `BET_STARTED` | Admin starts the bet | All participants |
| `CHECK_IN_REMINDER` | Daily cron at 00:01 | All ACTIVE participants |
| `PROOF_PASSED` | Proof accepted (peer or AI) | Submitter only |
| `PROOF_FAILED` | Proof rejected (peer or AI) | Submitter only |
| `TOKENS_DEDUCTED` | Day marked MISSED (RECURRING) | Affected participant |
| `PARTICIPANT_ELIMINATED` | Someone eliminated (LMS) | All remaining ACTIVE participants |
| `BET_COMPLETED` | Bet settlement done | All participants |
| `PAYOUT_AVAILABLE` | Payout calculated, ready to claim | Eligible participants |
| `BET_CANCELLED` | Admin cancels before start | All participants who joined |
| `VOTE_NEEDED` | Group member submitted proof — go vote | All OTHER active group members (RECURRING only) |
| `VOTE_RESULT` | Voting closed on your proof | Submitter (RECURRING only) |
| `MEMBER_PROOF_REJECTED` | A member's proof was voted down | All active members (RECURRING only) |

### 11.3 Notification API
- `GET /api/notifications` — Returns all for current user, newest first, paginated
- `GET /api/notifications/unread-count` — Returns `{ count: N }`
- `PATCH /api/notifications/:id/read` — Mark single as read
- `PATCH /api/notifications/read-all` — Mark all as read

---

## 12. User Dashboard

### 12.1 Dashboard Sections

**Section 1: Stats Bar**
- Token Balance (with Wallet link)
- Active Bets/Groups count
- Total Tokens Earned (lifetime)
- Total Tokens Lost (lifetime)
- Longest Streak (across all bets)

**Section 2: Today's Check-ins (Priority — shown first)**
- Cards for every bet where today is a scheduled day AND status is OPEN
- Each card shows: bet title, type badge (TrustPod / Last Man Standing), proof requirement, "Check In Now" CTA
- If already checked in: green "✓ Checked In" state
- If window closed / missed: "Missed" state in red

**Section 3: Pending Votes (RECURRING groups only — shown second if applicable)**
- Cards for any group member's proof that is in `PEER_VOTING` state and the current user hasn't voted yet
- Each card: submitter name + avatar, proof thumbnail/preview, habit requirement, ACCEPT / REJECT buttons
- Badge on "Pending Votes" section header showing count of unvoted proofs
- "You've voted on all proofs today" empty state

**Section 4: Active Bets & Groups**
- All bets/groups with status = ACTIVE where user is a participant
- Card shows: title, type badge, days remaining or streak count, participant count, token stake, group pool (for RECURRING)

**Section 5: Past Bets & Groups**
- COMPLETED and CANCELLED entries
- Shows outcome and tokens gained/lost

### 12.2 Bet Detail Page (`/bets/:id`)

**Header:** Title, type, status badge, admin name, created date

**My Status Panel:**
- Current streak | Longest streak
- Tokens locked | Tokens deducted (RECURRING) or Pool share (LMS)
- Days checked in | Days missed
- "Check In Today" button (if applicable)

**Participants Table:**
- Name, streak, status, tokens at risk
- Eliminated participants shown with strikethrough (LMS)

**Check-in History (for current user):**
- Calendar view showing each scheduled day
- Green = CHECKED_IN, Red = MISSED, Grey = PENDING/future
- Click on CHECKED_IN day: view submitted proof image and AI verdict

**Prize Pool / Stake Info:**
- RECURRING: Show each participant's total deducted so far, projected redistribution
- LMS: Show prize pool total, # eliminated, # remaining

---

## 13. API Routes

### Base URL: `/api`

### Authentication
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register with email + password |
| POST | `/auth/login` | No | Login with credentials |
| GET | `/auth/google` | No | Initiate Google OAuth |
| GET | `/auth/google/callback` | No | Google OAuth callback |
| POST | `/auth/logout` | Yes | Destroy session |
| GET | `/auth/me` | Yes | Get current user |

### Bets
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/bets` | Yes | Create a new bet |
| GET | `/bets` | Yes | Get current user's bets (active + past) |
| GET | `/bets/explore` | Yes | List public LMS bets (not yet started) |
| GET | `/bets/:id` | Yes | Get bet details |
| PATCH | `/bets/:id/start` | Yes (admin) | Start a DRAFT bet |
| PATCH | `/bets/:id/cancel` | Yes (admin) | Cancel a DRAFT bet |
| GET | `/bets/join/:inviteCode` | Yes | Preview bet via invite link |
| POST | `/bets/join/:inviteCode` | Yes | Join a bet (locks tokens) |

### Check-ins & Proof
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/bets/:id/checkins` | Yes | Get user's check-in days for a bet |
| GET | `/bets/:id/checkins/today` | Yes | Get today's check-in status |
| POST | `/bets/:id/checkins/:dayId/proof` | Yes | Submit proof image |
| GET | `/bets/:id/checkins/:dayId/proof` | Yes | Get proof submissions for a day |

### Wallet & Transactions
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/wallet` | Yes | Get token balance + transaction history |
| POST | `/wallet/claim/:betId` | Yes | Claim payout after bet completion |

### Notifications
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Yes | Get all notifications (paginated) |
| GET | `/notifications/unread-count` | Yes | Get unread count |
| PATCH | `/notifications/:id/read` | Yes | Mark single as read |
| PATCH | `/notifications/read-all` | Yes | Mark all as read |

### Users
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Yes | Full profile with stats |
| PATCH | `/users/me` | Yes | Update displayName, avatarUrl |

---

## 14. User Flows (End-to-End)

### Flow 1: Register & Onboard
```
1. Visit stakestreak.app
2. Click "Get Started"
3. Choose: "Continue with Google" OR "Sign up with Email"
   a. Google: OAuth redirect → callback → account created → Dashboard
   b. Email: Fill form (displayName, username, email, password) → Submit → Dashboard
4. Dashboard shows welcome message + 500 token balance (signup bonus)
5. Notification: "Welcome! You've received 500 tokens to start betting."
```

### Flow 2: Create a Recurring Bet (Admin)
```
1. Dashboard → Click "Create Bet"
2. Select bet type: "Recurring Bet"
3. Fill form:
   - Title: "30-Day Morning Run Challenge"
   - Description (optional)
   - Proof requirement: "Post a selfie on your running route"
   - Schedule days: Toggle MON, TUE, WED, THU, FRI, SAT, SUN
   - Start Date (calendar picker)
   - End Date (calendar picker)
   - Tokens per miss: input (e.g., 10)
   - System shows: "Total entry = 10 × 26 active days = 260 tokens"
   - System shows: "Your current balance: 500 tokens — sufficient ✓"
4. Click "Create Bet"
5. Bet created in DRAFT status, admin auto-joined
6. Admin taken to Bet Detail page showing:
   - Invite link (copy button + QR code)
   - "Waiting for participants... Start bet when ready"
```

### Flow 3: Join a Recurring Bet (Participant)
```
1. Receive invite link: stakestreak.app/join/abc123
2. If not logged in: redirected to login, then back to invite page
3. Bet preview shown:
   - Title, description, proof requirement
   - Schedule days, start/end dates
   - Tokens required: 260
   - Current participants: [avatars]
4. "Join Bet" button (disabled if insufficient balance)
5. Confirm modal: "Joining will lock 260 tokens from your wallet. Proceed?"
6. Click Confirm → tokens locked → participant added → JOINED status
7. Notification: "You've joined '30-Day Morning Run Challenge'. 260 tokens locked."
8. Redirected to Bet Detail page (view-only until bet starts)
```

### Flow 4: Admin Starts the Bet
```
1. Admin opens Bet Detail page
2. Sees participant list (e.g., 4 people joined)
3. Clicks "Start Bet" button
4. Confirmation: "Starting this bet will open check-ins. No new members can join."
5. Bet status → ACTIVE, startedAt recorded
6. BullMQ queues first check-in day records
7. All participants notified: "Bet '30-Day Morning Run Challenge' has started! First check-in is today."
```

### Flow 5: Daily Check-in (Participant)
```
1. Open app (or see dashboard notification: "Time to check in!")
2. Dashboard shows "Today's Check-ins" card for the bet
3. Click "Check In Now"
4. Bet detail page opens → "Check In Today" CTA prominent at top
5. Click "Check In Today"
6. Bottom sheet / modal opens:
   - Shows proof requirement: "Post a selfie on your running route"
   - Image upload zone (drag & drop or click to upload)
7. User selects/takes photo → preview shown
8. Click "Submit Proof"
9. Loading state: "AI is verifying your proof..."
10a. IF PASSED:
    - Success screen: "✓ Proof Verified! Great job!"
    - Confetti animation
    - Streak counter increments
    - Check-in day marked CHECKED_IN
10b. IF FAILED:
    - "Proof not accepted" screen with AI reason displayed
    - "Try Again" button (if attempt < 2)
    - Second attempt: same flow
    - After 2nd failure: "No more attempts today. Check-in window closes at midnight."
```

### Flow 6: Create Last Man Standing Bet (Public)
```
1. "Create Bet" → Select "Last Man Standing"
2. Fill form:
   - Title: "Infinite Coding Streak"
   - Proof requirement: "Screenshot of your code editor with today's date visible"
   - Schedule days: MON–FRI
   - Entry tokens per person: 50
   - Visibility: PUBLIC
3. Create → DRAFT status → admin auto-joined (50 tokens locked)
4. Option: Share invite link OR let it appear on Explore page
5. Admin can view current participants on Bet Detail page
6. Admin clicks "Start Bet" when satisfied with group size
7. prizePool confirmed: 50 × N participants tokens
```

### Flow 7: LMS Elimination
```
1. Scheduled day passes
2. BullMQ deadline job runs at 23:59
3. Participant X has not submitted valid proof
4. Participant X status → ELIMINATED, eliminatedAt set
5. All remaining ACTIVE participants get notification:
   "Participant @username has been eliminated from 'Infinite Coding Streak'. 
    Prize pool: 250 tokens. 3 participants remain."
6. Participant X can still view the bet as spectator
7. If 1 participant remains → bet → COMPLETED → winner gets full prize pool
8. Winner sees "Claim Payout" button on bet detail page
```

### Flow 8: Claim Payout
```
1. Bet marked COMPLETED
2. User with PAYOUT_AVAILABLE notification opens app
3. Notification links to Bet Detail page
4. "Claim Your Payout: +180 tokens" button shown (calculated by settlement job)
5. Click Claim → tokens added to wallet → transaction recorded
6. Wallet balance updated in header
7. Toast: "180 tokens added to your wallet!"
```

### Flow 9: Explore & Join Public LMS Bet
```
1. Dashboard → Click "Explore" tab
2. List of public DRAFT LMS bets shown
3. Each card: Title, proof requirement, current participants, entry cost, schedule
4. Click any bet → bet detail preview
5. "Join Bet" → confirm → join → redirect to bet detail
6. If admin starts before you join: bet shows "Started — No longer accepting joins"
```

---

## 15. UI/UX Design System

### 15.1 Theme
- Dark mode by default, light mode toggle available
- Stored in `localStorage` + CSS class on `<html>`
- Use shadcn/ui with a custom theme palette

### 15.2 Color Palette (CSS Variables)
```css
/* Dark Mode (default) */
--background: 222 47% 7%;         /* Deep dark navy */
--foreground: 210 40% 98%;
--card: 222 47% 11%;
--card-foreground: 210 40% 98%;
--primary: 262 83% 58%;           /* Vivid purple — brand color */
--primary-foreground: 210 40% 98%;
--secondary: 217 32% 17%;
--secondary-foreground: 210 40% 98%;
--accent: 38 92% 50%;             /* Amber — token/money color */
--accent-foreground: 222 47% 7%;
--destructive: 0 84% 60%;         /* Red — deductions, missed */
--success: 142 71% 45%;           /* Green — passed, streaks */
--muted: 217 32% 17%;
--muted-foreground: 215 20% 65%;
--border: 217 32% 20%;
--ring: 262 83% 58%;
--radius: 0.75rem;

/* Light Mode */
--background: 0 0% 98%;
--foreground: 222 47% 7%;
--card: 0 0% 100%;
--primary: 262 83% 55%;
--accent: 38 92% 45%;
```

### 15.3 Typography
- Font: `Inter` (Google Fonts) — variable weight
- Headings: `font-bold` with tight tracking
- Monospace: `JetBrains Mono` for token amounts, streaks, numbers

### 15.4 Key UI Patterns

**Token Amount Display:** Always amber-colored with a ◈ token icon prefix
```
◈ 260 tokens
```

**Streak Display:** Fire emoji + number + "day streak" in green
```
🔥 14-day streak
```

**Status Badges:**
- ACTIVE: green pill
- DRAFT: yellow pill
- COMPLETED: blue pill
- CANCELLED: grey pill
- ELIMINATED: red strikethrough

**Check-in Calendar View:**
- Grid of day circles
- Green filled = CHECKED_IN
- Red filled = MISSED
- Grey outlined = future/PENDING
- Today highlighted with ring

**Bet Cards:**
- Glassmorphism-style on dark mode
- Left border accent color by bet type (purple = RECURRING, amber = LMS)
- Token amount displayed prominently

### 15.5 Animations
- Proof success: Framer Motion confetti burst
- Token deduction: Red flash animation on wallet balance
- Check-in submitted: Pulse animation on submit button
- Page transitions: Subtle fade-in

---

## 16. Pages & Components

### 16.1 Pages

| Route | Component | Auth Required | Description |
|---|---|---|---|
| `/` | `LandingPage` | No | Hero, features, CTA |
| `/login` | `LoginPage` | No | Login form + Google button |
| `/register` | `RegisterPage` | No | Registration form |
| `/dashboard` | `Dashboard` | Yes | Main user hub |
| `/bets/create` | `CreateBetPage` | Yes | Multi-step bet creation form |
| `/bets/:id` | `BetDetailPage` | Yes | Bet overview, check-ins, participants |
| `/bets/:id/checkin` | `CheckInPage` | Yes | Daily check-in flow with proof upload |
| `/join/:inviteCode` | `JoinBetPage` | Yes (redirect to login if not) | Bet preview + join |
| `/explore` | `ExplorePage` | Yes | Public LMS bets |
| `/wallet` | `WalletPage` | Yes | Balance + transaction history |
| `/notifications` | `NotificationsPage` | Yes | All notifications |
| `/profile` | `ProfilePage` | Yes | User profile + stats |
| `*` | `NotFoundPage` | No | 404 |

### 16.2 Core Components

**Layout**
- `AppLayout` — sidebar (desktop) + bottom nav (mobile) + header
- `Header` — Logo, notification bell with badge, wallet balance, user avatar menu
- `Sidebar` — Dashboard, Explore, Wallet, Profile links
- `BottomNav` — Mobile navigation

**Bet Components**
- `BetCard` — Summary card used in dashboard + explore lists
- `BetTypeSelector` — Toggle between RECURRING and LMS at creation
- `BetCreationForm` — Multi-step form (shadcn Form + React Hook Form + Zod)
  - Step 1: Basic info (title, description, type, visibility)
  - Step 2: Schedule (day picker, date range for recurring)
  - Step 3: Token config (tokenPerMiss or entryTokens)
  - Step 4: Proof setup (description, example)
  - Step 5: Review + Create
- `ParticipantList` — Table of participants with streaks and status
- `CheckInCalendar` — Month grid showing check-in history
- `CheckInButton` — Big CTA with status-aware states
- `ProofUploader` — Drag-and-drop + preview + AI status display
- `BetStatusBanner` — DRAFT / ACTIVE / COMPLETED contextual banner

**Wallet Components**
- `TokenBalance` — Animated balance display in header
- `TransactionList` — Paginated transaction history
- `TransactionItem` — Single transaction row with type badge

**Notification Components**
- `NotificationBell` — Header icon with unread badge
- `NotificationDrawer` — Slide-out list of notifications
- `NotificationItem` — Single notification with icon, title, body, time

**Auth Components**
- `LoginForm` — Email/password form
- `RegisterForm` — Registration form
- `GoogleAuthButton` — Styled Google OAuth button
- `AuthGuard` — HOC/wrapper for protected routes

### 16.3 Key Form Validations (Zod Schemas)

```typescript
// Bet Creation
const createBetSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['RECURRING', 'LAST_MAN_STANDING']),
  visibility: z.enum(['PRIVATE', 'PUBLIC']),
  proofDescription: z.string().min(10).max(300),
  scheduleDays: z.array(z.enum(['MON','TUE','WED','THU','FRI','SAT','SUN'])).min(1),
  // RECURRING only
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  tokenPerMiss: z.number().min(1).max(1000).optional(),
  // LMS only
  entryTokens: z.number().min(10).max(10000).optional(),
}).refine(data => {
  if (data.type === 'RECURRING') {
    return data.startDate && data.endDate && data.tokenPerMiss;
  }
  return data.entryTokens;
}, { message: "Missing required fields for bet type" });

// Register
const registerSchema = z.object({
  displayName: z.string().min(2).max(50),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});
```

---

## 17. Edge Cases & Business Logic

### 17.1 Token Validation
- User must have `tokenBalance >= entryTokens` to join a bet
- If balance is insufficient: show "Insufficient tokens" error with current balance displayed
- Token deductions cannot make balance negative (tokens are pre-locked)

### 17.2 Bet Start Validation
- Admin cannot start a RECURRING bet if `startDate` is in the past
- Minimum 2 participants required to start (including admin)
- Admin must be a participant (auto-joined at creation)

### 17.3 Proof Submission Guards
- Cannot submit proof if bet is not ACTIVE
- Cannot submit proof if today is not a scheduled day
- Cannot submit proof if already CHECKED_IN for today
- Cannot submit proof if attempt count >= 2 (regardless of FAILED status)
- Cannot submit proof if deadline has passed (after 23:59)

### 17.4 Duplicate Join Prevention
- `@@unique([betId, userId])` on BetParticipant prevents DB duplicates
- API also checks for existing participation before processing

### 17.5 Bet Cancellation
- Only DRAFT bets can be cancelled
- ACTIVE bets cannot be cancelled (to prevent admin abuse after everyone's tokens are locked)
- On cancellation: all participants' `tokensLocked` are returned via REFUND transactions

### 17.6 Admin Leaving
- Admin cannot leave a bet once created (they are committed)
- Admin can cancel DRAFT bet which effectively ends it for everyone

### 17.7 LMS Tie Resolution
- If all remaining ACTIVE participants miss on the same day:
  - All eliminated simultaneously
  - Prize pool split equally among all tied-out participants
  - `prizePool / N` each, rounded down (remainder stays in prize pool — v0 simplification)

### 17.8 Recurring Bet — Missed Days Beyond Stake
- `entryTokens = tokenPerMiss × activeDays` so theoretically a user could "lose all" by missing every day
- Deductions are tracked against escrowed tokens, not live balance
- User can miss at most `activeDays` days, meaning max deduction = entryTokens (full escrow)

### 17.9 LMS — No End Date Handling
- Bets with no participants checking in for 7 consecutive days: auto-complete (safety mechanism)
- Orphan bets (all eliminated, prize pool unclaimed for 30 days): admin can claim residual

### 17.10 Invite Link Expiry
- For DRAFT bets: invite links are always valid
- For ACTIVE/COMPLETED/CANCELLED bets: invite link returns appropriate error
- Invite codes are UUIDs (effectively unguessable)

---

## 18. Redis Usage

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `session:{sessionId}` | Hash | 7 days | User sessions |
| `rate:proof:{userId}:{betId}:{date}` | String (counter) | 24 hours | Rate limit proof submissions |
| `rate:api:{userId}` | String (counter) | 60 seconds | General API rate limiting |
| `bet:participants:{betId}` | String (JSON) | 5 minutes | Cached participant list |
| `user:balance:{userId}` | String | 1 minute | Cached token balance |
| BullMQ queues | Managed by BullMQ | — | Job queues (daily-check, deadline, settlement) |

**Cache Invalidation:**
- `user:balance:{userId}` invalidated on any token transaction
- `bet:participants:{betId}` invalidated on join/start/elimination

---

## 19. Environment Variables

```env
# App
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
SESSION_SECRET=your_super_secret_session_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stakestreak

# Redis
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# OpenAI
OPENAI_API_KEY=sk-...

# Cloudinary (image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend (Vite)
VITE_API_URL=http://localhost:5000/api
```

---

## 20. Folder Structure

```
stakestreak/
├── client/                          # React Frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui primitives
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── BottomNav.tsx
│   │   │   ├── bets/
│   │   │   │   ├── BetCard.tsx
│   │   │   │   ├── BetCreationForm.tsx
│   │   │   │   ├── BetTypeSelector.tsx
│   │   │   │   ├── CheckInCalendar.tsx
│   │   │   │   ├── CheckInButton.tsx
│   │   │   │   ├── ParticipantList.tsx
│   │   │   │   └── ProofUploader.tsx
│   │   │   ├── wallet/
│   │   │   │   ├── TokenBalance.tsx
│   │   │   │   └── TransactionList.tsx
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   └── NotificationDrawer.tsx
│   │   │   └── auth/
│   │   │       ├── LoginForm.tsx
│   │   │       ├── RegisterForm.tsx
│   │   │       ├── GoogleAuthButton.tsx
│   │   │       └── AuthGuard.tsx
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CreateBetPage.tsx
│   │   │   ├── BetDetailPage.tsx
│   │   │   ├── CheckInPage.tsx
│   │   │   ├── JoinBetPage.tsx
│   │   │   ├── ExplorePage.tsx
│   │   │   ├── WalletPage.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── hooks/
│   │   │   ├── useBets.ts
│   │   │   ├── useWallet.ts
│   │   │   ├── useNotifications.ts
│   │   │   └── useAuth.ts
│   │   ├── store/
│   │   │   └── useAuthStore.ts      # Zustand auth state
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios instance + interceptors
│   │   │   ├── queryClient.ts       # TanStack Query client config
│   │   │   └── utils.ts             # cn(), formatTokens(), etc.
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/                          # Node.js Backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── bets.ts
│   │   │   ├── checkins.ts
│   │   │   ├── wallet.ts
│   │   │   ├── notifications.ts
│   │   │   └── users.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── bets.controller.ts
│   │   │   ├── checkins.controller.ts
│   │   │   ├── wallet.controller.ts
│   │   │   └── notifications.controller.ts
│   │   ├── services/
│   │   │   ├── token.service.ts     # All token movement logic
│   │   │   ├── bet.service.ts       # Bet lifecycle logic
│   │   │   ├── proof.service.ts     # OpenAI proof verification
│   │   │   ├── notification.service.ts
│   │   │   └── settlement.service.ts # Payout calculation
│   │   ├── jobs/
│   │   │   ├── queues.ts            # BullMQ queue definitions
│   │   │   ├── daily-checkin.job.ts
│   │   │   ├── daily-deadline.job.ts
│   │   │   └── bet-settlement.job.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── upload.middleware.ts  # Multer config
│   │   │   └── rateLimit.middleware.ts
│   │   ├── config/
│   │   │   ├── passport.ts
│   │   │   ├── redis.ts
│   │   │   └── cloudinary.ts
│   │   ├── prisma/
│   │   │   └── client.ts            # Prisma client singleton
│   │   └── index.ts                 # Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts                  # Demo data seeder
│   │   └── migrations/
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                     # Root monorepo config (optional)
└── README.md
```

---

## Appendix A: Demo Seed Data

For hackathon demo, seed the following:

```typescript
// prisma/seed.ts
// Create 5 demo users, each with 500 tokens
// Create 1 ACTIVE RECURRING bet (gym challenge, 3 participants, 5 days in)
// Create 1 ACTIVE LMS bet (coding streak, 4 participants, 2 eliminated)
// Create 1 DRAFT bet with invite code for live demo joins
// Create sample proof submissions (1 PASSED, 1 FAILED)
// Create sample notifications for all users
// Create sample token transactions showing the flow
```

---

## Appendix B: V1 Roadmap (Post-Hackathon)

- Real money integration (Razorpay / Stripe)
- Push notifications (FCM)
- Custom timezone per user
- Custom calendar dates schedule type
- Bet comments / activity feed
- Leaderboard (most streaks across platform)
- Mobile app (React Native)
- Admin dashboard for moderation
- Referral system for token bonuses
- Video proof support
- Periodic payout (weekly redistribution for long RECURRING bets)

---

*End of PRD — StakeStreak v0*
*This document is intended for use by developers, designers, and AI coding assistants to build the full application.*
