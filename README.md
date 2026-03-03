# QuorumOS

Privacy-first digital election infrastructure for housing societies. Email OTP authentication, anonymous voting, tamper-evident ledger, and audit-ready results. Built with Next.js and PostgreSQL.

## Features

- **Email OTP authentication** – No SMS, email-only verification
- **Identity-vote separation** – Anonymous token-based voting
- **Append-only vote ledger** – Hash-chained, tamper-evident
- **Merkle root** – Generated on election close for integrity verification
- **Audit report** – JSON export with full transparency
- **Rate limiting** – OTP brute-force protection (Upstash Redis)
- **Pluggable notifications** – Resend, SendGrid, or console (dev)

## Tech Stack

- Next.js 16 (App Router)
- Prisma + PostgreSQL
- Zod validation
- Upstash Redis (rate limiting)
- Resend (email)

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Database**

   Create a PostgreSQL database (e.g. [Neon](https://neon.tech)) and set:

   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL
   ```

3. **Run migrations**

   ```bash
   npm run db:migrate
   ```

   Or with `db push` for prototyping:

   ```bash
   npm run db:push
   ```

4. **Optional: Redis (rate limiting)**

   Add Upstash Redis credentials to `.env`:

   ```
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

   Without Redis, rate limiting is bypassed (dev only).

5. **Optional: Email (Resend)**

   For production OTP emails, use Resend or SendGrid:

   Resend:
   ```
   NOTIFICATION_PROVIDER=resend
   RESEND_API_KEY=re_xxx
   RESEND_FROM_EMAIL=elections@yourdomain.com
   ```

   SendGrid:
   ```
   NOTIFICATION_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.xxx
   SENDGRID_FROM_EMAIL=elections@yourdomain.com
   ```

   Without these, OTPs are logged to console.

6. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Workflows

### Admin

1. Create election
2. Upload voter CSV (`flat_number,email` per line)
3. Add candidates
4. Open election
5. Monitor turnout (votes cast)
6. Close election
7. View/download audit report

### Voter

1. Select open election
2. Enter flat number + email
3. Receive OTP via email
4. Enter OTP → receive voting token
5. Cast vote (one-time, anonymous)
6. Confirmation screen

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/election/create` | POST | Create election |
| `/api/election/upload-voters` | POST | Upload voter CSV |
| `/api/election/candidates` | POST/GET | Add/list candidates |
| `/api/election/open` | POST | Open election |
| `/api/election/close` | POST | Close + Merkle root |
| `/api/election/schedule` | POST | Set opensAt/closesAt |
| `/api/election/audit` | GET | Audit JSON |
| `/api/election/audit/pdf` | GET | Audit PDF |
| `/api/election/verify-vote` | GET | Verify vote hash in Merkle tree |
| `/api/cron/election-schedule` | GET | Process scheduled open/close |
| `/api/auth/request-otp` | POST | Request OTP |
| `/api/auth/verify-otp` | POST | Verify OTP, get token |
| `/api/vote` | POST | Cast vote with token |

## Admin Authentication

Admin routes (`/admin`, `/admin/new`, etc.) are protected when `ADMIN_PASSWORD` is set in `.env`. Without it, admin routes are open (dev mode).

1. Set `ADMIN_PASSWORD` and `SESSION_SECRET` in `.env`
2. Visit `/admin` – you'll be redirected to `/admin/login`
3. Enter the admin password to access the Election Control Center

## Security

- Emails stored as SHA-256(email + election_salt)
- OTP stored as SHA-256(otp + session_salt)
- Tokens stored as hash, one-time use
- Vote ledger: hash chain, no voter linkage
- Rate limiting on OTP requests

## Documentation

See `/docs` for product requirements, architecture, security model, and API spec.
