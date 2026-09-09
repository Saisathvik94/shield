# SHIELD

**Blockchain-Based Secure Platform for Identity, Access Control & Digital Asset Management**

| | |
|---|---|
| **SIH Problem Statement** | SIH26125 |
| **Organization** | Bharat Electronics Limited (BEL) |
| **Theme** | Blockchain & Cybersecurity |
| **Stack** | Next.js 16 · Neon PostgreSQL · Algorand · IPFS/Pinata · Pera Wallet |

---

## What is SHIELD?

SHIELD is a full-stack enterprise security platform where every user has **one global identity** anchored to an **Algorand Pera Wallet**, and that identity can participate in **multiple organizations** - each with its own hierarchy, roles, and assets.

Think of it as Jira for organizations, but with:
- Cryptographic wallet-based identity (no passwords)
- Blockchain-anchored audit proofs on Algorand
- Decentralized file storage via IPFS/Pinata with SHA-256 integrity
- Non-fungible asset tokenization as Algorand Standard Assets (ASAs)
- A public QR-based verification page for physical assets

---

## Architecture

```
SHIELD
│
├── Global Identity
│   └── Name + Email + Algorand Wallet + DID (did:shield:<uuid>)
│
├── Organizations  (multi-tenant, one user can be in many)
│   ├── Departments → Sections → Teams
│   ├── Members + Roles (OWNER / ADMIN / MANAGER / AUDITOR / USER)
│   └── Assets (digital + physical)
│       ├── Owner + Custodian
│       ├── Lifecycle (REGISTERED → ACTIVE → TRANSFER_REQUESTED → TRANSFERRED → REVOKED/RETIRED)
│       ├── IPFS Documents (Pinata)
│       └── Algorand ASA (tokenized, clawback-controlled)
│
├── Trust Layer - Algorand TestNet
│   ├── Identity Registration proofs
│   ├── Asset Creation / Transfer / Revocation
│   └── Audit Event anchoring (SHA-256 hashed notes)
│
└── Content Layer - IPFS via Pinata
    ├── Document upload (any format, 50 MB max)
    └── SHA-256 integrity verification
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.4 (App Router, React 19, Server Components) |
| Language | TypeScript 5 |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| Auth | Auth.js v5 (next-auth beta) - wallet Credentials provider |
| Wallet | @perawallet/connect (Algorand) |
| Blockchain | algosdk v3 - Algod + Indexer |
| Storage | Pinata SDK v2 (IPFS) |
| Styling | Tailwind CSS v4 + Radix UI primitives |
| Toasts | Sonner |

---

## Features

### 1. Wallet-Based Identity (No Passwords)

- Connect Pera Wallet → SHIELD either signs you in instantly (if wallet is known) or walks you through a one-time name/email registration
- Every user gets a **Decentralized Identifier (DID)**: `did:shield:<uuid>`
- **Cryptographic proof of wallet ownership**: server generates a one-time nonce (`/api/auth/nonce`), Pera signs it with `signData`, Auth.js verifies with `algosdk.verifyBytes` before creating a session
- DID + wallet address is anchored on Algorand as an immutable identity proof on registration
- JWT sessions - no server-side session storage required

### 2. Multi-Tenant Organizations

- Create unlimited organizations (one user can own or join many)
- Org creation anchors a `ORG_CREATED` proof on Algorand
- Sidebar org switcher - switch context without re-login
- Organization overview: member count, asset count, department count, recent activity

### 3. Organization Hierarchy

**Departments → Sections → Teams** - up to 3 levels deep:

- Add departments, expand to add sections inside them, expand sections to add teams
- Assign a **department head** (any org member) via dropdown
- Assign a **section head** independently
- All structure changes are reflected in member placement and asset scoping

### 4. Member Management

**Invite by link (no email required):**
- OWNER/ADMIN creates an invitation with: email, role, optional department/section
- System generates a shareable `/invite/<token>` link (7-day expiry)
- Invite dialog shows the full URL with a one-click copy button
- **Invitations tab** on the members page lists all pending invites with status, target, and copy-link button
- OWNER/ADMIN can revoke any pending invite

**Role management:**
- Three-dot menu on each member row → change role to USER/AUDITOR/MANAGER/ADMIN
- Full rank enforcement: you cannot promote someone to your level or above, and you cannot modify someone of equal or higher rank (unless you are OWNER)

**Member removal:**
- Remove member from the same three-dot menu (with confirmation)
- Sets membership status to `REMOVED`; creates a `MEMBER_REMOVED` audit event

**Roles and their access:**

| Role | Invite | Manage Assets | Approve Transfers | View Audit | Anchor Events |
|---|---|---|---|---|---|
| OWNER | ✓ | ✓ | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| MANAGER | - | ✓ | ✓ | ✓ | - |
| AUDITOR | - | - | - | ✓ | - |
| USER | - | - | - | ✓ | - |

### 5. Asset Registry

Register any digital or physical asset:

**Asset Types:** DOCUMENT · CERTIFICATE · LICENSE · EQUIPMENT · HARDWARE · INTELLECTUAL_PROPERTY · DATASET · CONTRACT · PHYSICAL_DEVICE · DIGITAL_ENTITLEMENT · OTHER

**Classifications (security level):**

| Level | Color |
|---|---|
| PUBLIC | Green |
| INTERNAL | Blue |
| CONFIDENTIAL | Yellow |
| SECRET | Orange |
| CRITICAL | Red |

**Lifecycle statuses:** CREATED → REGISTERED → ASSIGNED → ACTIVE → TRANSFER_REQUESTED → TRANSFERRED → REVOKED → RETIRED

**Registration form fields:** Asset ID (e.g. `RADAR-001`) · Name · Description · Type · Classification · Department · Location · **Physical Identifier** (QR/NFC/serial number)

**CRITICAL/SECRET/CONFIDENTIAL assets are automatically anchored on Algorand** at the moment of registration.

### 6. Digital Asset Passport

Every asset has a dedicated passport page at `/dashboard/orgs/[orgId]/assets/[assetId]`:

- **Classification-coloured header stripe** (red for CRITICAL, orange for SECRET, etc.)
- Full metadata sidebar: type, organization, department/section, owner, custodian, location, physical identifier, timestamps
- **Tokenise on Algorand** button (visible to managers when not yet on-chain) - creates a real ASA (total=1, non-fungible) with the treasury as clawback authority
- Primary IPFS CID and Algorand ASA ID with copy buttons
- QR icon linking to the public verification page

### 7. Asset Transfer Flow

1. MANAGER/ADMIN/OWNER clicks **Request transfer** → selects target member + enters reason
2. Asset status becomes `TRANSFER_REQUESTED` (yellow banner shown to all viewers)
3. MANAGER/ADMIN/OWNER can **Approve** (completes transfer, new custodian set, status → `TRANSFERRED`) or **Reject** (requires reason, reverts to `ACTIVE`)
4. If the asset is tokenized, approval triggers an Algorand clawback transfer on-chain
5. All steps create anchored audit events

### 8. Retire Asset

OWNER/ADMIN can retire any active asset (end-of-life) from the Danger Zone panel at the bottom of the passport. Sets status to `RETIRED`, creates a `ASSET_RETIRED` audit event.

### 9. IPFS Document Management

- **Drag-and-drop** file upload from the asset passport → pinned to Pinata → CID stored in `ipfs_objects` table and `assets.ipfsCid`
- **SHA-256 computed automatically** on every upload for later integrity checks
- Files listed as expandable rows showing: filename, CID, hash, MIME type, uploader, pin date, gateway download link
- **File integrity verifier**: paste any CID + re-upload the same file → SHIELD re-hashes it and compares against the stored SHA-256. Any byte-level change is detected immediately and flagged as `TAMPERED`

### 10. Algorand Trust Layer

Every critical operation creates an on-chain proof via the SHIELD treasury account:

| Operation | Mechanism | Note field |
|---|---|---|
| Identity registration | 0-ALGO self-payment | `op: IDENTITY_REGISTRATION`, DID, wallet, userId |
| Org creation | Audit anchor | `op: AUDIT_ANCHOR`, SHA-256 event hash |
| Asset registration (CRITICAL/SECRET/CONFIDENTIAL) | Audit anchor | Auto-triggered on save |
| Asset tokenization | ASA creation (total=1, decimals=0) | ARC-69 metadata, IPFS URL |
| Asset transfer | ASA clawback via `assetSender` | From → To wallet |
| Asset revocation | ASA clawback to treasury | Reason field |
| Manual anchor | 0-ALGO self-payment | Any audit event on demand |

All transactions use **AlgoNode free TestNet** - no API token or paid account needed.

### 11. Audit Trail

- **21 event types** tracked: user lifecycle, org changes, member changes, role changes, asset lifecycle, IPFS uploads, blockchain anchors
- Org-level audit page with colour-coded timeline (dot colour per event type)
- Stats bar: total events · on-chain proofs · IPFS anchored · unique actors
- **Per-event "Anchor" button** (OWNER/ADMIN only) - pushes any unanchored event to Algorand with one click
- AlgoExplorer TX links for all anchored events

### 12. Public Asset Verification

`/verify/RADAR-001` - fully public, no login required. Designed to be linked from a QR code on a physical asset.

**What it checks:**

| Check | Source |
|---|---|
| Registry record | SHIELD database |
| Blockchain anchor | Local `blockchain_records` table |
| Live ASA exists | Algorand Indexer (real-time) |
| Metadata consistency | Cross-check ASA name vs SHIELD registry |
| Not revoked/retired | Asset status field |

**Three possible outcomes:**
- ✅ **Verified** - blockchain anchor + live ASA + metadata matches
- ⚠️ **Partial** - some proofs present but live Indexer check incomplete
- ℹ️ **Registry record** - found in DB only, not yet tokenized

### 13. Identity Page

Personal dashboard at `/dashboard/identity`:
- DID with copy button
- Wallet address with verification timestamp and copy button
- All organization memberships with roles
- Full personal event history with on-chain badges

---

## Database Schema

16 tables:

| Table | Purpose |
|---|---|
| `users` | Global identity (name, email, DID) |
| `wallet_identities` | Algorand wallet addresses linked to users |
| `accounts` / `sessions` / `verificationTokens` | Auth.js internals |
| `organizations` | Org registry with slug and Algorand App ID field |
| `organization_memberships` | User ↔ Org with role and status |
| `departments` | Org hierarchy level 1 |
| `sections` | Org hierarchy level 2 (belongs to department) |
| `teams` | Org hierarchy level 3 (belongs to section) |
| `member_assignments` | Maps a membership to dept/section/team |
| `invitations` | Invitation tokens with expiry and role |
| `assets` | Asset registry with lifecycle and passport fields |
| `audit_events` | Immutable event log with optional blockchain TX ID |
| `ipfs_objects` | Every pinned file with CID, SHA-256, and metadata |
| `blockchain_records` | Every Algorand transaction with record type and note |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/              Wallet connect → sign in or register
│   │   └── invite/[token]/     Invitation acceptance
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── page.tsx              Dashboard home
│   │       ├── identity/             Global identity page
│   │       └── orgs/
│   │           ├── new/              Create organization
│   │           └── [orgId]/
│   │               ├── page.tsx      Org overview
│   │               ├── members/      Members + Invitations tabs
│   │               ├── assets/       Asset registry list
│   │               │   └── [assetId]/  Digital Asset Passport
│   │               ├── audit/        Audit trail with anchor buttons
│   │               └── settings/     Org settings + Dept/Section/Team structure
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/   Auth.js route handler
│   │       └── nonce/          One-time wallet challenge endpoint
│   └── verify/[assetId]/       Public asset verification (no auth)
│
├── components/
│   ├── ui/                 Badge, Button, Card, Dialog, Input
│   └── dashboard/          Sidebar, CopyButton
│
├── db/
│   ├── schema.ts           Complete Drizzle schema
│   ├── index.ts            Neon connection
│   └── queries/            assets, audit, organizations, users
│
└── lib/
    ├── auth.ts             Auth.js config + wallet Credentials provider + sig verification
    ├── utils.ts            cn, shortAddress, relativeTime, classificationColor, roleColor
    ├── actions/            Server Actions: asset, auth, invite, member, org, transfer
    ├── algorand/           client, identity-registry, asset-registry, audit-anchor, indexer-queries, algorand-actions
    ├── ipfs/               pinata-client, ipfs-actions
    └── wallet/             pera-client (lazy singleton), wallet-context (React provider)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Pinata](https://pinata.cloud) account (free tier works)
- An Algorand TestNet wallet with test ALGO ([dispenser](https://testnet.algoexplorer.io/dispenser))

### 1. Clone and install

```bash
git clone <repo-url>
cd shield
npm install
```

### 2. Configure environment

Copy and fill in `.env.local`:

```bash
# Neon PostgreSQL
DATABASE_URL="postgresql://user:pass@host/neondb?sslmode=require"

# Auth.js - generate with: openssl rand -base64 32
AUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Pinata (IPFS)
PINATA_JWT="eyJhbGc..."                    # from app.pinata.cloud/developers/api-keys
PINATA_GATEWAY="xxxx.mypinata.cloud"       # from app.pinata.cloud/gateway

# Algorand (TestNet - free, no token needed)
ALGORAND_NODE_URL="https://testnet-api.algonode.cloud"
ALGORAND_NODE_TOKEN=""
ALGORAND_INDEXER_URL="https://testnet-idx.algonode.cloud"
ALGORAND_TREASURY_MNEMONIC="word1 word2 ... word25"
```

**Pinata API key permissions needed:** V3 Resources → Files: Write, Gateways: Read

**Treasury wallet:** Create a new Algorand TestNet account, fund it from the dispenser, paste the 25-word mnemonic. Each anchor transaction costs ~0.001 ALGO.

> All Algorand and Pinata calls are **gracefully skipped** if credentials are not configured - the app works fully without them.

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Install [Pera Web Wallet](https://web.perawallet.app) or use the Pera mobile app.

---

## Database Commands

```bash
npm run db:push       # Push schema to Neon (development)
npm run db:generate   # Generate migration files
npm run db:migrate    # Run migrations
npm run db:studio     # Open Drizzle Studio UI
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Random secret for Auth.js (min 32 chars) |
| `NEXTAUTH_URL` | ✅ | App base URL |
| `PINATA_JWT` | Phase 4 | Pinata API JWT token |
| `PINATA_GATEWAY` | Phase 4 | Pinata gateway hostname |
| `PINATA_GROUP_ID` | Optional | Pinata group ID for file organization |
| `ALGORAND_NODE_URL` | Phase 5 | Algod node URL |
| `ALGORAND_NODE_TOKEN` | Phase 5 | Node API token (empty for AlgoNode) |
| `ALGORAND_INDEXER_URL` | Phase 5 | Indexer URL for read queries |
| `ALGORAND_TREASURY_MNEMONIC` | Phase 5 | 25-word mnemonic for protocol account |

---

## SIH Demo Flow

The complete demo story for judges:

**Setup:** BEL Research org, Electronics Department → Radar Section, asset `RADAR-001`

1. **Admin registers** → connects Pera Wallet → SHIELD creates identity + DID + anchors on Algorand
2. **Creates organization** BEL Research → `ORG_CREATED` anchored on-chain
3. **Builds structure** → adds Electronics Department, Radar Section, assigns section head
4. **Invites Rahul** → creates invite link → Rahul opens `/invite/<token>` → connects wallet → joins as Manager
5. **Registers RADAR-001** → CRITICAL classification → auto-anchored on Algorand
6. **Tokenizes RADAR-001** → one click → ASA created on Algorand TestNet
7. **Uploads certificate** → drags PDF onto passport → pinned to IPFS → CID stored
8. **Unauthorized user** tries to access → role check denies → `ACCESS_DENIED` event recorded
9. **Rahul requests transfer** → Admin approves → ASA clawback transfer on-chain → custodian updated
10. **Auditor opens audit trail** → sees full timeline → clicks Anchor on critical event → TX proof created
11. **Scan QR code** on physical radar → opens `/verify/RADAR-001` → 5-check verification against live Algorand Indexer
12. **Verify document** → re-upload certificate → `verified - not tampered`

---

## Algorand Note Schema

All on-chain proofs use a structured JSON note field (max 1024 bytes):

```json
{
  "shield": "1.0",
  "op": "IDENTITY_REGISTRATION | ASSET_CREATION | AUDIT_ANCHOR | ...",
  "did": "did:shield:...",
  "assetDbId": "...",
  "eventType": "...",
  "eventHash": "sha256-of-event-payload",
  "ts": 1234567890
}
```

These are verifiable by anyone with access to the Algorand Indexer - no SHIELD account required.

---

## License

MIT
