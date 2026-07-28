# Warrant

**Borrow access, not own access.**

A time-bound, explainable, self-cleaning permissions system for shared resources. Instead of granting standing access that sits around forever, every grant expires, whether it was given directly or through a group. Access is requested, approved manually or by policy, used, and then it goes away on its own. And if anyone asks why a person has access to something, the system answers in a full sentence rather than a database row.

## Try it live

**Live demo:** https://warrant.ugbeadie.com
**Demo admin:** `admin@warrant.dev` / `admin12345`

This is a shared demo environment. Data may be reset periodically, and the admin account has full access, so please be gentle with it. It runs on free-tier hosting and is kept awake automatically, but a cold start can take 20 to 30 seconds.

**Seeing the approval flow.** Approving your own request is blocked by design, since approval is meant to be an independent check rather than a formality. That means the admin account can't request access and then wave it through. Two ways to see the flow:

1. **Approve an existing request.** Open **Approvals** and switch the scope toggle from **Mine** to **All**. That shows every pending request platform-wide, including ones raised by other demo users.
2. **Register a second account**, request access from it to a resource the admin owns, then log back in as admin to approve it.

You can also see the owner path with a single login: create a resource from any account and you hold access to it immediately as its owner.

## Why

Most internal tools default to permanent access. Someone requests a role once for a one-off migration, gets it, and eighteen months later still has it — not because they need it, but because nobody built a mechanism for access to end. That's how permission sprawl happens: nobody remembers who has access to what, or why.

Warrant flips the default. Access is temporary unless something actively renews it, and every grant can explain itself.

## Core features

- **Explainable access.** `checkAccess()` never returns a bare boolean. It traces why access exists: a direct grant, a group-inherited grant, or nothing at all. Denials say what's missing, not just that something is.
- **Time-bound grants.** Every grant carries an expiry. Group membership can carry one too, optionally, so a long-lived team group and a temporary project group use the same mechanism.
- **Request, approve, grant pipeline.** Users request a role on a resource with a reason and a duration. Owners approve manually, or define policy rules that auto-approve low-risk requests.
- **Auto-approval with a role ceiling.** Every policy rule is capped by `maxRoleId`. A rule can auto-approve `viewer` under 60 minutes but can never auto-approve `admin`, however well the other conditions match.
- **Role-rank comparison.** Resources declare a minimum required role. Grants are compared by rank, not by name, so a grant that outranks the requirement satisfies it.
- **Requests must escalate.** You can't request a role you already hold, or one below it. An active grant blocks anything at or under its rank, so the request pipeline only ever exists to raise access.
- **Grants supersede rather than stack.** When a higher-ranked grant is issued to the same subject on the same resource, lower ones are revoked and logged as `GRANT_SUPERSEDED`. No notification, since it's a technical detail rather than news.
- **Groups as first-class requesters.** Create a group, manage its members, and request access on behalf of the whole group through the same approval pipeline as a personal request.
- **Manual revocation.** An owner or admin can cut off an active grant early, recorded distinctly from a natural timeout.
- **Self-service surrender.** Give access back before it expires, without asking anyone.
- **Unused-access flagging.** A scheduled job flags grants that are valid but haven't been touched in N days, supporting a least-privilege cleanup workflow.
- **Notifications.** A narrow, purpose-built list of things aimed at you specifically: decisions on your requests, revocations, expiries, unused-access flags.
- **Audit log.** Every request, decision, grant, expiry, revocation, surrender and supersession, filtered and paginated server-side by actor, resource and action.
- **Admin console.** Platform-wide stats, full user list, and a global unused-access report across every resource.

## Roles

- **Requester.** Any user. Anyone can request access to a resource they don't hold.
- **Resource Owner.** Owns specific resources, decides requests for them, defines auto-approval rules. Ownership is per-resource rather than an account tier, so the same person can own some resources and be a requester on others.
- **Admin.** Sees and manages everything platform-wide, and can override any decision.

Note that `viewer`, `editor` and `admin` are a separate ranked vocabulary used for access levels on resources. They are distinct from the platform roles above.

## The two hardest pieces

### `checkAccess(user, resource)`, the explanation engine

Every meaningful access decision in the app routes through one function. It walks exactly two paths and returns a readable trace either way:

1. **Direct grant.** An active, unexpired grant on this resource with a role that satisfies the requirement.
2. **Group grant.** The user is _currently_ an active member of a group, checked live against `GroupMember` rather than the group's cached status, and that group holds a satisfying active grant.

Both branches filter on `expiresAt > now()` in the query itself rather than trusting a `status` field a cron job may not have flipped yet. Both also order by role rank descending and evaluate the strongest grant, not whichever the database happened to return first.

A successful check also stamps `lastAccessedAt` on the grant it used, which is what the unused-access report reads.

### Reliable, proactive expiry

One scheduled job, running every five minutes, sweeps `Grant` and `GroupMember` rows past their `expiresAt`, flips status, writes an audit entry, and fires a notification. It also sends a five-minute warning before a grant expires. A module-level `isRunning` flag makes it re-entrant-safe, so a slow sweep can't overlap itself.

It runs independently of any request, so access is never left in a technically invalid but still displayed state waiting to be checked on next use.

The cron job is a cleanup and notification trigger. It is never the source of truth for whether access is valid right now.

## Data model

```
User          - id, email, username, password, platformRole (USER | ADMIN)
Group         - id, name, ownerId
GroupMember   - id, groupId, userId, expiresAt (nullable), status (ACTIVE | EXPIRED)
Role          - id, name, rank        (ranked vocabulary: viewer / editor / admin)
Resource      - id, name, requiredRoleId, ownerId
AccessRequest - id, requesterId, resourceId, requestedRoleId, reason,
                durationMinutes, status, approverId, decidedAt, onBehalfOfGroupId
Grant         - id, requestId, subjectType (USER | GROUP), userId | groupId,
                resourceId, roleId, grantedAt, expiresAt, lastAccessedAt,
                status (ACTIVE | EXPIRED | REVOKED | SURRENDERED)
PolicyRule    - id, resourceId, condition (json), autoApprove, maxRoleId
Notification  - id, userId, type, message, read, createdAt
AuditLog      - id, actorId, action, resourceId, detail (json), createdAt
```

`GrantStatus` has four values rather than two, so the audit trail can distinguish a natural timeout from an owner's revocation, a subject's voluntary surrender, and a grant superseded by a higher one.

Resources are intentionally flat, with no parent/child nesting and no inherited access chains. See [Design decisions](#design-decisions).

## Audit actions

Every way access can begin, change hands or end has its own action, so the log reads differently for each:

```
REQUEST_PENDING_APPROVAL              a request awaiting a human
REQUEST_APPROVED / REQUEST_DENIED     a human decided
REQUEST_AUTO_APPROVED                 a policy rule decided
OWNER_ACCESS_REQUEST_AUTO_APPROVED    an owner took access to their own resource
GRANT_SUPERSEDED                      replaced by a higher-ranked grant
GRANT_REVOKED                         pulled by an owner or admin
GRANT_SURRENDERED                     given back voluntarily
GRANT_EXPIRED                         ran out
GROUP_MEMBERSHIP_EXPIRED              membership ran out
```

Three of those describe an approval. Collapsing them into one would have made the log say "approved" without saying who or what did the approving.

## Notable implementation details

- **Revoke and surrender are deliberately distinct.** Surrender is self-service: giving up access you hold. Revoke is privileged: an owner or admin pulling someone else's. Both end a grant, and the audit log records which happened and by whom, so "why did this access disappear" is always answerable.
- **Group-owned grants surrender by proxy.** A user can only surrender a grant that is genuinely theirs (`subjectType: USER`). Group-derived access has no individual owner, so only the group's owner can surrender it on the group's behalf.
- **Approving your own request is blocked**, even for an admin. Approval represents an independent check, not a formality.
- **An owner taking access to their own resource is logged, not blocked.** It bypasses approval, because there's nobody above them to ask, but it gets its own audit action so it never looks like a policy decision.
- **JWTs carry identity only.** No role or permission data. The auth middleware re-reads the user from the database on every request, so `platformRole` comes from the database rather than the token, and a deleted user is rejected immediately rather than when their token expires.
- **Revoking a group grant notifies every active member.** A revocation is something people need to know about; the individual grant case notifies the one person affected.

## Design decisions

**PostgreSQL over MongoDB.** Access control is inherently relational. Grants reference resources, roles, users and groups, and the correctness of the whole system depends on those relationships actually being enforced. Postgres gives real foreign keys and referential integrity, and Prisma's `include` performs actual SQL joins instead of the multiple round-trips `.populate()` needs in Mongoose. For a system whose entire premise is reasoning correctly about who has access to what, that mattered more than familiarity.

**Flat resources, no folder nesting.** Inherited access down a resource tree is a natural feature to want, and it was cut deliberately. It adds a third structural dimension without strengthening either centerpiece, the explanation engine or the expiry job. It also introduces a real failure mode for free: a circular parent reference crashing a recursive `checkAccess()`. Cutting a feature that removes a class of bug is a different kind of win from cutting one that just saves time.

## Known limitations

- **Policy auto-approval doesn't track cumulative duration.** Someone could split a long access need into several short auto-approved requests back to back to route around manual review. Closing it needs a summed recent-access check per user and resource, which was scoped out to keep the approval endpoint simple. This is separate from the `maxRoleId` cap, which is implemented and does prevent auto-approval of high-privilege roles.
- **The audit filter matches a single action string.** Filtering and pagination are both server-side, but several UI filter values map to more than one raw action — "approved" covers a manual approval, a policy auto-approval and an owner self-grant. Expressing that needs `action IN (...)` rather than `action = ...`.
- **The group branch of `checkAccess` runs one query per group.** Memberships per user are small in practice, so it hasn't mattered, but it's an N+1 and the fix is a single `groupId: { in: [...] }` query.
- **Surrendering a group grant notifies nobody.** Revocation notifies every active member; surrender writes the audit entry and stops. Members of a group whose owner gives back access aren't told.
- **Access decisions cost a live database read**, by design. Correctness over token-only performance.

## Getting started

### Backend

```bash
cd backend
npm install
```

Create `.env` from `.env.example`:

```
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
JWT_SECRET="your_jwt_secret_here"
PORT=7001
```

```bash
npx prisma migrate dev
npm run seed
npm run dev
```

The seed script creates the base roles (`viewer`, `editor`, `admin`) and one bootstrap admin account. Credentials are in `prisma/seed.js`.

### Frontend

```bash
cd frontend
pnpm install
```

Create `.env`:

```
VITE_API_BASE_URL=http://localhost:7001/api
```

```bash
pnpm run dev
```

## Stack

**Backend:** Node.js, Express, PostgreSQL, Prisma, JWT auth, node-cron
**Frontend:** React, TypeScript, Tailwind CSS, Axios

## What I'd build next

- A cumulative-duration check to close the auto-approval limit-stretching gap
- Multi-value action matching in the audit filter, so a single UI filter value can cover the several raw actions it maps to
- Collapse the group branch of `checkAccess` into one query
- Notify group members when their owner surrenders a grant
- Resource ownership transfer as a first-class flow rather than a field update

---

_Warrant — access that explains itself, and cleans up after itself._
