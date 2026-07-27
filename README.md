# Warrant

**Borrow access, not own access.**

A time-bound access management system — every permission expires by default, and every grant can explain exactly why it exists. Built to go deeper into Node.js, PostgreSQL, and the actual hard problems behind access control: explainability, expiry, and least privilege.

## The idea

Most internal tools grant access once and never take it back. Warrant flips that: access is requested, scoped to a role and a duration, and automatically expires. Nothing is permanent unless it's genuinely meant to be (like resource ownership). If someone asks "why does this person have access to that?", the system can answer — in plain English, not just a database row.

## Core features

- **Explainable access** — `checkAccess()` doesn't just return true/false. It traces *why*: a direct grant, a group-inherited grant, or nothing at all — and says so in a full sentence.
- **Time-bound everything** — grants and group memberships both carry an expiry. A background job sweeps expired access every few minutes, logs it, and notifies the affected user.
- **Request → approve → grant pipeline** — users request a role on a resource with a reason and a duration. Owners approve or deny manually, or define policy rules that auto-approve low-risk requests within a role and duration ceiling.
- **Role-rank system** — resources declare a minimum required role; grants are compared by rank, not by name. A grant that outranks the requirement always satisfies it.
- **Groups** — create a group, add or remove members, and request access *on behalf of the whole group* — going through the same approval pipeline as a personal request.
- **Self-service surrender** — give up access early, without waiting for it to expire or asking an owner to revoke it.
- **Unused-access flagging** — a nightly job flags grants that exist but haven't actually been used in days, so owners can clean up standing access nobody's touching.
- **Full audit trail** — every request, approval, expiry, revocation, and surrender is logged and searchable.

## Tech stack

**Backend:** Node.js, Express, PostgreSQL, Prisma, JWT auth, node-cron
**Frontend:** React, TypeScript, Tailwind CSS, Axios

## Why PostgreSQL over MongoDB this time

Access control is an inherently relational problem — grants reference resources, roles, users, and groups, and the correctness of the whole system depends on those relationships actually being enforced. Postgres gives real foreign keys and referential integrity; Prisma's `include` performs actual SQL joins instead of the multiple round-trips `.populate()` requires in Mongoose. For a system whose entire premise is "reason correctly about who has access to what," that mattered more than familiarity.

## Getting started

### Backend

\`\`\`bash
cd backend
npm install
\`\`\`

Create \`.env\` from \`.env.example\` and fill in your own values:
\`\`\`
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
JWT_SECRET="your_jwt_secret_here"
PORT=7001
\`\`\`

\`\`\`bash
npx prisma migrate dev
npm run seed
npm run dev
\`\`\`

The seed script creates the base roles (\`viewer\`, \`editor\`, \`admin\`) and one bootstrap admin account — check \`prisma/seed.js\` for the credentials.

### Frontend

\`\`\`bash
cd frontend
pnpm install
\`\`\`

Create \`.env\`:
\`\`\`
VITE_API_BASE_URL=http://localhost:7001/api
\`\`\`

\`\`\`bash
pnpm run dev
\`\`\`

## The core function

Everything in this project is designed around one function: \`checkAccess(userId, resourceId)\`. It never trusts a cached status — it always re-derives access from real timestamps, checks direct grants before group grants, picks the strongest grant when multiple exist, and returns a full explanation either way. Every other feature — the request pipeline, the expiry job, the Why Panel on the frontend — exists to feed that function good data, or to display what it says.

## What I'd build next

- A cumulative-duration check to close a known gap where someone could split one long access need into several short auto-approved requests
- Server-side audit log filtering (currently client-side, fine at this scale, not at real scale)
- Approval/denial events written to the audit log (currently only request creation, expiry, and grant lifecycle events are logged — decisions themselves aren't yet)
