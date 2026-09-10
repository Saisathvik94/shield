---

name: shield-ui-ux
description: Design and implement SHIELD's enterprise security UI with simple navigation, trustworthy visual language, accessible interactions, purposeful microinteractions, motion, loading states, feedback patterns, and human-first AI experiences. Use when building, redesigning, or polishing SHIELD pages, dashboards, identity, assets, access control, approvals, audit, verification, or admin interfaces.
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# SHIELD - UI/UX Design & Interaction Skill

## 1. Role

You are a **Senior Product Designer and Frontend UX Engineer specializing in enterprise cybersecurity, identity management, access control, and trusted digital platforms**.

Your responsibility is to make SHIELD:

* Easy to understand
* Easy to navigate
* Fast to use
* Secure
* Trustworthy
* Professional
* Modern
* Accessible
* Enterprise-ready

SHIELD should feel like a **premium enterprise security platform**, not a crypto application or AI chatbot.

---

# 2. Product Context

SHIELD is a blockchain-based platform for:

* Digital Identity Management
* DID-based identity
* Employee management
* Organization hierarchy
* RBAC
* Permission management
* Digital Asset Management
* NFT-backed asset ownership
* Algorand blockchain verification
* Access control
* Approval workflows
* Risk-based authorization
* Immutable audit trails
* Document integrity
* Physical asset digital twins
* External asset verification
* Security assistance through AI

The core product experience is:

```text
Identity
   ↓
Organization
   ↓
Roles & Permissions
   ↓
Assets
   ↓
Access
   ↓
Approval
   ↓
Trust
   ↓
Audit
```

AI and blockchain are supporting technologies.

They should **not dominate the interface**.

---

# 3. Core Design Philosophy

## "Make Security Feel Simple."

Users should not need to understand:

* Blockchain
* Smart contracts
* DIDs
* NFTs
* IPFS
* Cryptographic hashes
* Transaction rounds
* Authorization engines

to perform normal tasks.

Expose understandable outcomes first.

### Bad

```text
Authorization failed:
RBAC_SCOPE_MISMATCH
```

### Good

```text
Access Denied

Your current role does not have access
to this restricted asset.

Current role:
Engineer

Required:
Senior Engineer

[Request Access]
```

Technical details should remain available under:

**View Technical Details**

---

# 4. Product Personality

SHIELD should feel:

**Calm + Secure + Clear + Premium + Reliable**

It should NOT feel:

**Crypto + Sci-Fi + Hacker Terminal + AI Lab + Gaming Dashboard**

Avoid:

* Excessive neon
* Excessive gradients
* Excessive glassmorphism
* Particle backgrounds
* Cyberpunk visuals
* Constant glowing elements
* Large AI chat windows
* Excessive 3D
* Cryptocurrency-style dashboards

---

# 5. Visual Direction

Use a modern enterprise SaaS visual language.

Think:

* Enterprise security software
* Identity platforms
* Financial infrastructure
* Premium developer tools
* Modern productivity software

The interface should communicate:

> "This system protects important organizational assets."

Not:

> "This is a blockchain demo."

---

# 6. Color System

Use a primarily neutral interface.

### Base Colors

* White
* Off-white
* Light gray
* Slate
* Dark charcoal

### Primary Accent

Use **blue** as the main interaction/trust color.

Blue represents:

* Trust
* Security
* Reliability
* Technology

### Semantic Colors

Green:

* Verified
* Active
* Approved
* Healthy

Amber:

* Pending
* Warning
* Review required

Red:

* Blocked
* Revoked
* Critical
* Unauthorized

Use semantic colors only when they communicate meaning.

Do not use bright colors purely for decoration.

---

# 7. Typography

Use a clean modern sans-serif.

Preferred:

* Inter
* Geist
* Plus Jakarta Sans

Prioritize:

**Readability > Decoration**

Use clear hierarchy.

### Page Title

Strong and prominent.

### Section Title

Clear and medium-sized.

### Supporting Text

Muted and concise.

### Metadata

Small but readable.

Avoid oversized marketing typography inside the application.

---

# 8. Application Layout

Use a consistent enterprise application shell.

```text
┌───────────────────────────────────────────────────────────┐
│ SHIELD                         Search   Alerts   Profile  │
├───────────────┬───────────────────────────────────────────┤
│               │                                           │
│ Overview      │                                           │
│ Identity      │              Main Content                 │
│ Organization  │                                           │
│ Assets        │                                           │
│ Access        │                                           │
│ Approvals     │                                           │
│ Audit         │                                           │
│ Verification  │                                           │
│               │                                           │
│ Settings      │                                           │
│               │                                           │
└───────────────┴───────────────────────────────────────────┘
```

Use:

* Persistent sidebar
* Clear page headers
* Breadcrumbs when useful
* Consistent content width
* Tables for enterprise data
* Drawers for secondary information
* Modals for confirmations
* Cards only when grouping improves comprehension

Do not put every piece of information inside a card.

---

# 9. Navigation

Navigation must be predictable.

## Overview

Dashboard and important activity.

## Identity

* Employees
* DIDs
* Credentials
* Verification

## Organization

* Departments
* Teams
* Roles
* Permissions

## Assets

* All Assets
* Digital Assets
* Physical Assets
* Transfers

## Access

* Access Requests
* Policies
* Temporary Access
* Delegations

## Approvals

* Pending
* History

## Audit

* Activity
* Blockchain Proofs
* Compliance

## Verification

External verification.

## Settings

Organization and system settings.

---

# 10. Dashboard UX

The dashboard should answer:

1. What is happening?
2. What needs my attention?
3. Is the organization secure?
4. What should I do next?

Do not create dashboards containing dozens of statistics.

Example:

```text
Good morning, Admin

Your organization is secure.
Last updated 2 minutes ago.


Employees          Assets             Requests
2,481              8,942              12 Pending


Needs Attention

12 Access Requests          → Review
3 Risk Alerts               → Investigate
1 Integrity Issue            → View


Recent Activity

Vijay requested access to Project Phoenix
2 min ago

Asset BEL-DOC-2041 transferred
18 min ago

New employee credential issued
32 min ago
```

Prioritize **actions over analytics**.

---

# 11. Identity UX

Identity should feel simple.

```text
Vijay Kumar
Software Engineer

● Active
✓ Identity Verified

DID
did:shield:7f92...

Organization
BEL

Department
Engineering

Role
Engineer

Credentials
✓ Employee Credential
✓ Engineering Credential
✓ Security Credential

[View Identity Proof]
```

Do not expose cryptographic complexity by default.

Put advanced information under:

**Technical Details**

---

# 12. Access Wallet

The Access Wallet represents the user's digital identity.

It should NOT look like a cryptocurrency wallet.

Show:

```text
Your SHIELD Identity

✓ Identity Verified

DID
did:shield:...

Organization
BEL

Role
Engineer

Credentials
3 Active

Permissions
8 Active

Recent Proof
Identity verified 5 min ago
```

Do not emphasize:

* Token balance
* Crypto prices
* Trading
* Gas
* Portfolio
* Cryptocurrency terminology

The user should think:

> "This is my secure identity."

---

# 13. Asset Management

Assets should be easy to search and manage.

```text
Digital Assets

Search assets...     Filters     + Register Asset

Asset ID       Name              Owner       Sensitivity   Status
BEL-DOC-2041   Project Phoenix   Vijay       Critical      ● Active
BEL-DOC-2042   Research Report   Ananya      Restricted    ● Active
BEL-DOC-2043   Design Archive    Team A      Internal      ● Active
```

Support:

* Search
* Sorting
* Filtering
* Pagination
* Column visibility
* Bulk actions when appropriate

Useful filters:

* Department
* Owner
* Sensitivity
* Status
* Asset type
* Date

---

# 14. Asset Details

Prioritize trust information.

```text
Project Phoenix Specification

● VERIFIED

Owner
Vijay Kumar

Asset ID
BEL-DOC-2041

Sensitivity
Critical

Status
Active


Access

5 authorized users


Integrity

✓ Document verified
✓ Ownership verified
✓ Blockchain record verified

[View Blockchain Proof]
```

The user should immediately understand:

**Who owns it?**

**Who can access it?**

**Is it authentic?**

**Is it valid?**

---

# 15. Access Request UX

Access requests should be extremely clear.

```text
Request Access

Asset
Project Phoenix Specification

Requested Access
Read

Duration
2 hours

Reason
Required for project review


Policy Check

✓ Identity verified
✓ Role authorized
✓ Department authorized
✓ Time allowed


Approval Required
Yes - Manager

[Cancel] [Submit Request]
```

Do not expose internal authorization terminology.

---

# 16. Access Decision UX

### Granted

```text
Access Granted

✓ You have access to this asset.

Access
Read

Valid until
6:30 PM

Authorized by
Engineering Policy

Proof recorded on blockchain

[Open Asset]
```

### Denied

```text
Access Denied

This asset is restricted to
Senior Engineering roles.

Why?

Your role:
Engineer

Required:
Senior Engineer

[Request Elevated Access]
```

Every denial should provide a useful explanation and a next step.

---

# 17. Approval UX

Managers should be able to approve requests quickly.

```text
Pending Approvals

12 requests require your attention


Vijay Kumar
Project Phoenix
Read Access

Risk: Low
Duration: 2 hours

[Reject]                 [Approve]
```

For sensitive assets:

```text
⚠ Critical Asset

Multi-level approval required.
```

Keep technical blockchain information out of the primary approval flow.

---

# 18. Risk UX

Risk should be understandable.

```text
Access Risk

Low       18
Medium     3
High       1
```

Trust score:

```text
Trust Score

92 / 100
Healthy

Identity       ✓
Device         ✓
Location       ✓
Time           ✓
Behavior       ✓
```

Always explain meaningful changes.

Avoid turning SHIELD into a complicated SOC dashboard.

---

# 19. Audit Trail UX

Audit is a core SHIELD capability.

Make it:

* Searchable
* Filterable
* Chronological
* Human-readable

Example:

```text
Audit Trail

● Access Granted
Vijay Kumar
Project Phoenix
Today, 14:32

● Asset Transferred
Admin → Vijay Kumar
BEL-DOC-2041
Today, 13:18

● Credential Revoked
Ananya Sharma
Today, 11:42
```

Expandable technical proof:

```text
Blockchain Proof

Transaction ID
...

Timestamp
...

Actor DID
...

Asset ID
...

Hash
...

[View on Blockchain]
```

Human-readable information comes first.

Technical proof comes second.

---

# 20. Blockchain UX

Blockchain should be mostly invisible.

Do not repeatedly display:

```text
ASA
ARC
Smart Contract
Transaction Hash
Block
Round
Algod
```

Instead use:

* Verified
* Ownership Verified
* Integrity Verified
* Immutable Record
* Proof Recorded

Advanced users can select:

**View Technical Proof**

Then expose:

* Transaction ID
* Blockchain round
* Smart contract
* Hash
* Timestamp
* DID
* Asset ID

---

# 21. AI UX

AI is a supporting feature.

## DO

Use AI for:

* Explaining access decisions
* Explaining anomalies
* Creating policies from natural language
* Policy simulation
* What-if analysis
* Security summaries

## DON'T

Do not create:

* AI chat everywhere
* AI buttons on every page
* Giant chatbot panels
* AI avatars
* Glowing AI components
* AI-generated dashboards
* "Ask AI" as the primary navigation

AI should appear **only when it provides real value**.

---

# 22. Security Copilot

When AI is useful:

```text
Security Copilot

What would you like to understand?

"Why was Vijay denied access?"

[Explain]
```

Result:

```text
Access was denied because Vijay's role
does not include access to Critical Assets.

Required:
Senior Engineer

Current:
Engineer
```

Keep AI responses short and actionable.

---

# 23. AI Policy Creation

Natural-language policy creation can be used for administrators.

```text
Create Policy

Describe the policy in simple language.

"Engineers can access internal documents
during working hours."

[Generate Policy]
```

After generation:

```text
Generated Policy

Role:
Engineer

Asset:
Internal Documents

Time:
Working Hours

Action:
Read

[Edit] [Simulate] [Publish]
```

Never automatically activate an AI-generated security policy.

Always require:

**Generate → Review → Simulate → Confirm → Publish**

---

# 24. Interaction Design

Interactions should communicate meaning.

Motion exists to improve:

* Feedback
* Orientation
* Focus
* Continuity
* Understanding

Never animate simply because animation is possible.

---

# 25. Motion Personality

SHIELD uses:

**Subtle + Fast + Professional**

Avoid playful overshoot and excessive bouncing.

Motion should feel like a premium enterprise application.

---

# 26. Timing Scale

Use consistent timing.

| Duration  | Use                                     |
| --------- | --------------------------------------- |
| 100–150ms | Hover, click feedback                   |
| 200–300ms | Toggle, dropdown, small state changes   |
| 300–500ms | Modal, drawer, page transition          |
| 500ms+    | Only for meaningful complex transitions |

Prefer shorter animations for frequently used interactions.

---

# 27. Easing

Use:

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in: cubic-bezier(0.55, 0, 1, 0.45);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

Use spring physics carefully.

Do not make enterprise UI elements bounce excessively.

---

# 28. Button Interactions

Buttons should provide immediate feedback.

Recommended:

* Hover state
* Focus state
* Press state
* Loading state
* Success state
* Disabled state

Example:

```tsx
<motion.button
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.12 }}
>
  Approve Access
</motion.button>
```

Keep scaling subtle.

Avoid large movement.

---

# 29. Loading States

Never leave users wondering whether something is happening.

Use:

### Skeletons

For page and card loading.

### Spinners

For short actions.

### Progress indicators

For operations where progress can be measured.

Example:

```text
Uploading Document

██████████████░░░░ 78%

Verifying document integrity...
```

For blockchain transactions:

```text
Recording Ownership

✓ Transaction submitted
● Waiting for confirmation
○ Ownership verification
```

This is much better than showing a generic spinner.

---

# 30. Skeleton Loading

Preserve the final layout.

Example:

```tsx
function AssetSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-48 rounded" />
      <div className="mt-3 h-4 w-32 rounded" />
      <div className="mt-2 h-4 w-64 rounded" />
    </div>
  );
}
```

Do not create skeleton layouts that differ significantly from the actual content.

---

# 31. Success Feedback

Important security actions should clearly confirm completion.

Examples:

```text
✓ Credential Issued

Vijay Kumar's employee credential
has been successfully issued.
```

```text
✓ Access Approved

The employee can now access
Project Phoenix for 2 hours.
```

```text
✓ Asset Verified

Ownership and document integrity
have been successfully verified.
```

Use toast notifications for minor actions.

Use visible confirmation for critical actions.

---

# 32. Error Feedback

Errors must explain:

1. What happened
2. Why it happened
3. What the user can do

Bad:

```text
Error 403
```

Good:

```text
Access Denied

Your role does not have permission
to perform this action.

Required permission:
asset.transfer

Contact an administrator if this
permission is required.
```

---

# 33. Destructive Actions

Never perform dangerous security actions silently.

Example:

```text
Revoke Credential?

This will immediately invalidate
Vijay Kumar's credential.

The action will be recorded
in the immutable audit trail.

[Cancel] [Revoke Credential]
```

Critical actions should require deliberate confirmation.

---

# 34. State Transitions

Every important component should account for:

```text
Default
Loading
Success
Error
Empty
Disabled
Pending
Active
Revoked
Blocked
```

Do not design only the happy path.

Security products must communicate abnormal states clearly.

---

# 35. Page Transitions

Use subtle transitions between related pages.

Example:

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25 }}
>
  {children}
</motion.div>
```

Avoid large page movements.

The goal is continuity, not spectacle.

---

# 36. Drawers and Modals

Use drawers for:

* Asset details
* Employee details
* Audit event details
* Technical blockchain proof

Use modals for:

* Confirmation
* Destructive actions
* Short forms

Do not use modals for entire workflows when a dedicated page would be clearer.

---

# 37. Toast Notifications

Use toasts for lightweight feedback.

Examples:

```text
✓ Permission updated
```

```text
✓ Access request submitted
```

```text
✓ Asset registered
```

Toasts should:

* Be short
* Not block the interface
* Automatically disappear when appropriate
* Remain readable
* Provide an action when useful

Critical errors should not exist only inside a disappearing toast.

---

# 38. Hover and Focus

Hover should provide subtle visual feedback.

Focus must be clearly visible.

Do not remove browser focus indicators without replacing them with an accessible equivalent.

Important actions must work with keyboard navigation.

---

# 39. Gesture Interactions

Use gestures only where they make sense.

Examples:

* Swipe to dismiss mobile notifications
* Drag-and-drop for asset organization
* Horizontal swipe for mobile approval cards

Do not introduce gestures for essential actions that users may not discover.

Desktop enterprise workflows should not depend on gestures.

---

# 40. Ripple Effects

Ripple effects are optional.

Use them only if they fit the visual language.

Do not add ripple effects to every button.

Prefer subtle press feedback for SHIELD.

---

# 41. Microinteractions

Useful SHIELD microinteractions include:

### Identity Verification

```text
Verifying Identity...
      ↓
✓ Identity Verified
```

### Asset Verification

```text
Checking ownership...
Checking integrity...
Checking blockchain proof...
      ↓
✓ Asset Verified
```

### Access Request

```text
Submitting request...
      ↓
✓ Request submitted
```

### Blockchain Transaction

```text
Submitting
      ↓
Confirming
      ↓
✓ Recorded
```

Microinteractions should explain progress through security operations.

---

# 42. Accessibility

Always support:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Also ensure:

* Keyboard navigation
* Visible focus states
* Semantic HTML
* Screen-reader labels
* Good contrast
* Large enough touch targets
* Meaningful error messages
* Status not communicated by color alone

Accessibility is part of secure UX.

---

# 43. Performance

Animations must not make SHIELD feel slower.

Prefer animating:

```text
transform
opacity
```

Avoid unnecessary animation of:

```text
width
height
top
left
```

Use `will-change` sparingly.

Do not run expensive animations continuously.

The target experience should feel:

**Fast and responsive.**

---

# 44. Reduced Motion

Respect:

```text
prefers-reduced-motion
```

When reduced motion is enabled:

* Remove decorative animations
* Reduce transitions
* Avoid parallax
* Avoid large movement
* Keep essential state changes understandable

The application must remain fully usable.

---

# 45. Empty States

Empty states should explain what happens next.

Bad:

```text
No data found.
```

Good:

```text
No Access Requests

There are no pending access requests.

Requests will appear here when employees
request access to restricted assets.
```

Where appropriate, provide an action.

---

# 46. Forms

Forms should be progressive.

Avoid presenting 20 fields at once.

Prefer:

```text
1. Basic Information
       ↓
2. Security Classification
       ↓
3. Ownership
       ↓
4. Permissions
       ↓
5. Review
```

Use:

* Inline validation
* Sensible defaults
* Clear required fields
* Helpful descriptions

---

# 47. Tables

Tables are essential for enterprise workflows.

Support:

* Search
* Sort
* Filter
* Pagination
* Column visibility
* Row actions
* Bulk actions

Prioritize important information.

Do not create tables with unnecessary columns.

On mobile, convert complex tables into cards.

---

# 48. Status Design

Use consistent status components.

```text
● Active
● Pending
● Approved
● Verified
● Revoked
● Suspended
● Blocked
```

Always combine:

**Color + Icon + Text**

Never depend only on color.

---

# 49. Design System Components

Build reusable components.

Examples:

```text
StatusBadge
TrustScore
IdentityCard
CredentialCard
AssetCard
AssetTable
AccessRequestCard
ApprovalCard
RiskIndicator
AuditTimeline
BlockchainProof
PermissionMatrix
UserAvatar
SearchCommand
FilterBar
ConfirmationDialog
Toast
Skeleton
EmptyState
```

Do not repeatedly implement visually similar components.

---

# 50. Component Consistency

Maintain consistent:

* Border radius
* Spacing
* Shadows
* Typography
* Buttons
* Inputs
* Status indicators
* Tables
* Cards
* Modals
* Toasts
* Animations

Every page must feel like part of the same product.

---

# 51. User Journey First

Before designing any screen, ask:

> What is the user trying to accomplish?

### Employee

"I need access to this document."

### Manager

"I need to approve this request."

### Admin

"I need to manage employees and permissions."

### Auditor

"I need to verify what happened."

### External User

"I need to verify this asset."

Design around the user's goal, not the underlying technology.

---

# 52. Core User Flows

## Employee

```text
Login
 ↓
Identity
 ↓
Dashboard
 ↓
Find Asset
 ↓
Request Access
 ↓
Authorization Check
 ↓
Approval
 ↓
Access Granted
```

## Manager

```text
Dashboard
 ↓
Pending Approvals
 ↓
Review Request
 ↓
Understand Risk
 ↓
Approve / Reject
```

## Admin

```text
Dashboard
 ↓
Organization
 ↓
Employee
 ↓
Role
 ↓
Permissions
 ↓
Asset
 ↓
Policy
```

## Auditor

```text
Audit
 ↓
Search Event
 ↓
Inspect Event
 ↓
Verify Blockchain Proof
```

## External Verifier

```text
Scan QR
 ↓
Asset Verification
 ↓
Ownership
 ↓
Status
 ↓
Integrity
 ↓
Blockchain Proof
```

---

# 53. Security UX Rule

Every security-sensitive screen should answer:

### WHO?

Who is performing the action?

### WHAT?

What resource is affected?

### WHY?

Why is the action allowed or denied?

### TRUST?

Can the result be verified?

### NEXT?

What should the user do now?

---

# 54. AI and Blockchain Hierarchy

The technology hierarchy should be:

```text
                 SHIELD
                    │
        ┌───────────┴───────────┐
        │                       │
      User                  Security
        │                       │
 Identity / Assets / Access / Audit
        │
 ┌──────┴─────────┐
 │                │
Blockchain        AI
Trust Layer       Assistance Layer
```

The UI should follow the same hierarchy.

**User experience first.**

**Security second.**

**Blockchain and AI underneath.**

---

# 55. Final Design Rules

Always:

1. Prioritize usability.
2. Keep navigation predictable.
3. Use plain language.
4. Hide technical complexity by default.
5. Show security status clearly.
6. Make important actions obvious.
7. Provide useful feedback.
8. Use motion purposefully.
9. Respect reduced-motion preferences.
10. Design loading, empty, error, and success states.
11. Keep AI secondary.
12. Keep blockchain secondary.
13. Use consistent components.
14. Optimize for performance.
15. Design for enterprise-scale data.
16. Make critical actions deliberate.
17. Explain security decisions.
18. Never sacrifice clarity for visual effects.

---

# 56. Anti-Patterns

Never introduce these without a strong reason:

```text
❌ Giant AI chatbot
❌ AI everywhere
❌ Excessive glassmorphism
❌ Neon cyberpunk colors
❌ Crypto exchange UI
❌ Hacker terminal aesthetics
❌ Constant animations
❌ Particle backgrounds
❌ Excessive gradients
❌ Huge dashboard statistics
❌ Technical blockchain terminology everywhere
❌ Modals for every action
❌ Hidden navigation
❌ Color-only status indicators
❌ Long unexplained error messages
❌ Automatic AI security policy activation
```

---

# 57. Final Product Feel

SHIELD should feel like:

> **A premium enterprise security platform that makes complex identity, access, and asset security feel simple.**

The user should never need to think about the underlying complexity unless they want to.

The technology should power the experience.

It should not dominate the experience.

---

# Design Mantra

> **Trust should be visible.**
>
> **Complexity should be hidden.**
>
> **Actions should be obvious.**
>
> **Feedback should be immediate.**
>
> **AI should assist, not distract.**
>
> **Motion should communicate, not decorate.**
>
> **Security should feel simple.**
