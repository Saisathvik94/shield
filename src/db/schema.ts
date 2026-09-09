import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const organizationRoleEnum = pgEnum("organization_role", [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "AUDITOR",
  "USER",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
  "REMOVED",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "REVOKED",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "DOCUMENT",
  "CERTIFICATE",
  "LICENSE",
  "EQUIPMENT",
  "HARDWARE",
  "INTELLECTUAL_PROPERTY",
  "DATASET",
  "CONTRACT",
  "PHYSICAL_DEVICE",
  "DIGITAL_ENTITLEMENT",
  "OTHER",
]);

export const assetClassificationEnum = pgEnum("asset_classification", [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "SECRET",
  "CRITICAL",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "CREATED",
  "REGISTERED",
  "ASSIGNED",
  "ACTIVE",
  "TRANSFER_REQUESTED",
  "TRANSFERRED",
  "REVOKED",
  "RETIRED",
]);

export const auditEventTypeEnum = pgEnum("audit_event_type", [
  "USER_CREATED",
  "USER_WALLET_LINKED",
  "USER_LOGIN",
  "ORG_CREATED",
  "ORG_UPDATED",
  "MEMBER_INVITED",
  "MEMBER_JOINED",
  "MEMBER_REMOVED",
  "ROLE_ASSIGNED",
  "ROLE_REVOKED",
  "ASSET_CREATED",
  "ASSET_UPDATED",
  "ASSET_ASSIGNED",
  "ASSET_TRANSFER_REQUESTED",
  "ASSET_TRANSFERRED",
  "ASSET_REVOKED",
  "ASSET_RETIRED",
  "ACCESS_GRANTED",
  "ACCESS_REVOKED",
  "ACCESS_DENIED",
  "BLOCKCHAIN_TX",
  "IPFS_UPLOAD",
]);

// ---------------------------------------------------------------------------
// Users & Identity
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    // DID - did:shield:<uuid>
    did: text("did").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

export const walletIdentities = pgTable(
  "wallet_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Algorand wallet address
    walletAddress: text("wallet_address").notNull(),
    walletType: text("wallet_type").notNull().default("pera"),
    isPrimary: boolean("is_primary").notNull().default(true),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("wallet_address_idx").on(t.walletAddress),
    index("wallet_user_idx").on(t.userId),
  ]
);

// next-auth v5 required tables
// Auth.js v5 / @auth/drizzle-adapter requires exact column names (snake_case)
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    uniqueIndex("account_provider_idx").on(t.provider, t.providerAccountId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("sessionToken").primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [index("session_user_idx").on(t.userId)]
);

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [uniqueIndex("vt_identifier_token_idx").on(t.identifier, t.token)]
);

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    website: text("website"),
    // Algorand App ID once registered on-chain
    algorandAppId: text("algorand_app_id"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("org_slug_idx").on(t.slug)]
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: organizationRoleEnum("role").notNull().default("USER"),
    status: membershipStatusEnum("status").notNull().default("ACTIVE"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("membership_org_user_idx").on(t.organizationId, t.userId),
    index("membership_org_idx").on(t.organizationId),
    index("membership_user_idx").on(t.userId),
  ]
);

// ---------------------------------------------------------------------------
// Organization Structure
// ---------------------------------------------------------------------------

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    headId: uuid("head_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("dept_org_idx").on(t.organizationId)]
);

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    headId: uuid("head_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("section_dept_idx").on(t.departmentId),
    index("section_org_idx").on(t.organizationId),
  ]
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    leadId: uuid("lead_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("team_org_idx").on(t.organizationId)]
);

// Maps users to their department/section/team within an org
export const memberAssignments = pgTable(
  "member_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => organizationMemberships.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    sectionId: uuid("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("assignment_membership_idx").on(t.membershipId)]
);

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invitedById: uuid("invited_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: organizationRoleEnum("role").notNull().default("USER"),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    sectionId: uuid("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    token: text("token").notNull().unique(),
    status: invitationStatusEnum("status").notNull().default("PENDING"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("invitation_org_idx").on(t.organizationId),
    index("invitation_email_idx").on(t.email),
    uniqueIndex("invitation_token_idx").on(t.token),
  ]
);

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    sectionId: uuid("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    // Human-readable asset ID, e.g. RADAR-001
    assetId: text("asset_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    assetType: assetTypeEnum("asset_type").notNull().default("OTHER"),
    classification: assetClassificationEnum("classification")
      .notNull()
      .default("INTERNAL"),
    status: assetStatusEnum("status").notNull().default("CREATED"),
    // Current owner (user)
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Current custodian (user holding/managing the asset)
    custodianId: uuid("custodian_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Physical location for physical assets
    location: text("location"),
    // QR code / NFC identifier for physical assets
    physicalIdentifier: text("physical_identifier"),
    // Algorand ASA ID once tokenised
    algorandAssetId: text("algorand_asset_id"),
    // IPFS CID of the asset metadata / document
    ipfsCid: text("ipfs_cid"),
    // Algorand transaction ID of the creation tx
    blockchainTxId: text("blockchain_tx_id"),
    metadata: text("metadata"), // JSON string for extra fields
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("asset_org_idx").on(t.organizationId),
    uniqueIndex("asset_org_assetid_idx").on(t.organizationId, t.assetId),
  ]
);

// ---------------------------------------------------------------------------
// Audit Events
// ---------------------------------------------------------------------------

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(
      () => organizations.id,
      { onDelete: "set null" }
    ),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: auditEventTypeEnum("event_type").notNull(),
    resourceType: text("resource_type"), // "user" | "org" | "asset" | etc.
    resourceId: text("resource_id"),
    description: text("description"),
    // Blockchain proof - tx ID on Algorand
    blockchainTxId: text("blockchain_tx_id"),
    // IPFS proof
    ipfsCid: text("ipfs_cid"),
    metadata: text("metadata"), // JSON
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_org_idx").on(t.organizationId),
    index("audit_actor_idx").on(t.actorId),
    index("audit_created_idx").on(t.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  walletIdentities: many(walletIdentities),
  accounts: many(accounts),
  sessions: many(sessions),
  memberships: many(organizationMemberships),
  invitations: many(invitations),
  ownedAssets: many(assets, { relationName: "assetOwner" }),
  custodiedAssets: many(assets, { relationName: "assetCustodian" }),
  auditEvents: many(auditEvents),
}));

export const walletIdentitiesRelations = relations(
  walletIdentities,
  ({ one }) => ({
    user: one(users, {
      fields: [walletIdentities.userId],
      references: [users.id],
    }),
  })
);

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    createdBy: one(users, {
      fields: [organizations.createdById],
      references: [users.id],
    }),
    memberships: many(organizationMemberships),
    departments: many(departments),
    assets: many(assets),
    auditEvents: many(auditEvents),
    invitations: many(invitations),
  })
);

export const organizationMembershipsRelations = relations(
  organizationMemberships,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [organizationMemberships.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMemberships.userId],
      references: [users.id],
    }),
    assignments: many(memberAssignments),
  })
);

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.organizationId],
    references: [organizations.id],
  }),
  head: one(users, { fields: [departments.headId], references: [users.id] }),
  sections: many(sections),
  teams: many(teams),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  department: one(departments, {
    fields: [sections.departmentId],
    references: [departments.id],
  }),
  organization: one(organizations, {
    fields: [sections.organizationId],
    references: [organizations.id],
  }),
  head: one(users, { fields: [sections.headId], references: [users.id] }),
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one }) => ({
  section: one(sections, {
    fields: [teams.sectionId],
    references: [sections.id],
  }),
  department: one(departments, {
    fields: [teams.departmentId],
    references: [departments.id],
  }),
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  lead: one(users, { fields: [teams.leadId], references: [users.id] }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  organization: one(organizations, {
    fields: [assets.organizationId],
    references: [organizations.id],
  }),
  department: one(departments, {
    fields: [assets.departmentId],
    references: [departments.id],
  }),
  section: one(sections, {
    fields: [assets.sectionId],
    references: [sections.id],
  }),
  owner: one(users, {
    fields: [assets.ownerId],
    references: [users.id],
    relationName: "assetOwner",
  }),
  custodian: one(users, {
    fields: [assets.custodianId],
    references: [users.id],
    relationName: "assetCustodian",
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedById],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [invitations.departmentId],
    references: [departments.id],
  }),
  section: one(sections, {
    fields: [invitations.sectionId],
    references: [sections.id],
  }),
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditEvents.organizationId],
    references: [organizations.id],
  }),
  actor: one(users, {
    fields: [auditEvents.actorId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Types - inferred from schema
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WalletIdentity = typeof walletIdentities.$inferSelect;
export type NewWalletIdentity = typeof walletIdentities.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMembership =
  typeof organizationMemberships.$inferSelect;
export type NewOrganizationMembership =
  typeof organizationMemberships.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;

// ---------------------------------------------------------------------------
// IPFS Objects  (Phase 4)
// ---------------------------------------------------------------------------

export const ipfsObjectTypeEnum = pgEnum("ipfs_object_type", [
  "ASSET_DOCUMENT",
  "ASSET_CERTIFICATE",
  "ASSET_METADATA",
  "ASSET_IMAGE",
  "ORG_DOCUMENT",
  "AUDIT_PROOF",
  "OTHER",
]);

export const ipfsObjects = pgTable(
  "ipfs_objects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // IPFS content identifier
    cid: text("cid").notNull(),
    // Pinata file ID (for management)
    pinataId: text("pinata_id"),
    // Gateway URL for access
    gatewayUrl: text("gateway_url"),
    objectType: ipfsObjectTypeEnum("object_type").notNull().default("OTHER"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    // SHA-256 hash of the original file (for integrity verification)
    sha256Hash: text("sha256_hash"),
    // Who uploaded it
    uploadedById: uuid("uploaded_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Which asset this is attached to (optional)
    assetId: uuid("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id").references(
      () => organizations.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ipfs_cid_idx").on(t.cid),
    index("ipfs_asset_idx").on(t.assetId),
    index("ipfs_org_idx").on(t.organizationId),
  ]
);

// ---------------------------------------------------------------------------
// Blockchain Records  (Phase 5)
// ---------------------------------------------------------------------------

export const blockchainRecordTypeEnum = pgEnum("blockchain_record_type", [
  "IDENTITY_REGISTRATION",
  "IDENTITY_REVOCATION",
  "ASSET_CREATION",
  "ASSET_TRANSFER",
  "ASSET_REVOCATION",
  "ROLE_ASSIGNMENT",
  "AUDIT_ANCHOR",
  "ORG_REGISTRATION",
]);

export const blockchainRecords = pgTable(
  "blockchain_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Algorand transaction ID
    txId: text("tx_id").notNull(),
    // Round (block number) confirmed in
    confirmedRound: text("confirmed_round"),
    recordType: blockchainRecordTypeEnum("record_type").notNull(),
    // What was anchored - could be userId, assetId, orgId, auditEventId
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    organizationId: uuid("organization_id").references(
      () => organizations.id,
      { onDelete: "set null" }
    ),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Note payload stored in the Algorand note field (base64 decoded)
    notePayload: text("note_payload"),
    // Algorand ASA ID if this tx created an asset
    algorandAssetId: text("algorand_asset_id"),
    network: text("network").notNull().default("testnet"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("blockchain_txid_idx").on(t.txId),
    index("blockchain_resource_idx").on(t.resourceType, t.resourceId),
    index("blockchain_org_idx").on(t.organizationId),
  ]
);

// Relations for new tables
export const ipfsObjectsRelations = relations(ipfsObjects, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [ipfsObjects.uploadedById],
    references: [users.id],
  }),
  asset: one(assets, {
    fields: [ipfsObjects.assetId],
    references: [assets.id],
  }),
  organization: one(organizations, {
    fields: [ipfsObjects.organizationId],
    references: [organizations.id],
  }),
}));

export const blockchainRecordsRelations = relations(
  blockchainRecords,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [blockchainRecords.organizationId],
      references: [organizations.id],
    }),
    actor: one(users, {
      fields: [blockchainRecords.actorId],
      references: [users.id],
    }),
  })
);

// Extend assets relation to include ipfs objects
export const assetsIpfsRelation = relations(assets, ({ many }) => ({
  ipfsObjects: many(ipfsObjects),
}));

export type IpfsObject = typeof ipfsObjects.$inferSelect;
export type NewIpfsObject = typeof ipfsObjects.$inferInsert;
export type BlockchainRecord = typeof blockchainRecords.$inferSelect;
export type NewBlockchainRecord = typeof blockchainRecords.$inferInsert;
