/**
 * Default Markdown content for each Important Page and Legal Policy.
 * These are used to pre-populate the admin editors when no content
 * has been saved to the database yet — so admin users can see and
 * edit the existing static page content directly.
 */

export const PAGE_DEFAULTS: Record<string, string> = {

  /* ────────────────────────────────────────────
   *  Terms & Conditions (PolicyEditor key)
   * ──────────────────────────────────────────── */
  terms_and_conditions: `## Operator Information

This terms and conditions is issued by **PlayGroundX Digital Ltd** (operating as PlayGroundX), a company registered in Canada.

\`\`\`
PlayGroundX Digital Ltd
161 Westney Rd S, Ajax,
ON, Canada, L0B1A0.
\`\`\`

---

## 1. Introduction

By accessing or using PlayGroundX Digital Ltd ("PlayGroundX", "Platform", "we", "us", "our"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Platform.

PlayGroundX is an interactive entertainment platform where Users pay for access to live digital experiences, including Rooms, content, and interactions.

*We may update these Terms at any time. Continued use constitutes acceptance.*

---

## 2. Definitions

| Term | Meaning |
|------|---------|
| **User** | Any person using PlayGroundX |
| **Creator** | A User who hosts Rooms or uploads content |
| **Fan** | A User who purchases access or interacts |
| **Room** | Live or interactive experience hosted by a Creator |
| **Fan Payment** | Any payment made by a Fan |
| **Wallet** | Prepaid balance used for transactions |
| **Creator Earnings** | Amount payable to Creator after fees |

---

## 3. Eligibility

### General Requirements:
- Be 18+
- Be legally able to enter contracts
- Comply with applicable laws

### Creators must:
- Complete identity verification (KYC)
- Provide valid payout details
- Provide consent documentation for all participants

---

## 4. Platform Nature

PlayGroundX provides the infrastructure for interactive experiences. We are not a party to Fan–Creator transactions and do not guarantee content, outcomes, or earnings.

---

## 5. Monetization & Fees

### 5.1 Currency & Wallet

All transactions are processed in **Euros (€)**. Users must pre-fund a Wallet with a minimum of **€25** before making purchases. Wallet funds are non-refundable, except where required by law.

### Public Rooms

| Revenue Type | Split |
|-------------|-------|
| Entry Fee | 100% Platform |
| Per-Minute Billing | 100% Platform |
| Tips | 85% Creator / 15% Platform |
| Gifts | Up to 100% Creator |

### Private Rooms

| Revenue Type | Split |
|-------------|-------|
| Entry Fee | 60% Platform / 40% Creator |
| Per-Minute Billing | 60% Platform / 40% Creator |
| Tips | 85% Creator / 15% Platform |
| Gifts | Up to 100% Creator |

### 5.5 Per-Minute Billing Rules

- Billing begins immediately upon Room entry and is charged per full minute.
- Once a minute starts, it is considered a full billable minute (no per-second billing).
- **Disconnections:** Billing resumes upon re-entry within the same session/day.
- **Creator Early Exit:** Billing stops at the last completed minute. Creators are not required to stay for any minimum duration.

### 5.7 Payout Terms

- Payout delay: 7–21 days minimum
- Minimum payout threshold applies
- We may hold funds for fraud review or compliance reasons

---

## 6. Refund & Chargeback Policy

**6.1 No Refunds:** All sales are final once access is granted.

Users agree not to initiate unjustified chargebacks. If a chargeback occurs, accounts may be suspended, wallet access revoked, and funds recovered from Creator Earnings.

---

## 8. Acceptable Use

Users may NOT:
- Use or feature minors (under 18)
- Upload illegal or non-consensual content
- Promote violence, abuse, or exploitation
- Harass, doxx, or defame others
- Share prohibited content (extreme acts, bodily waste, etc.)
- Attempt to bypass payments or platform systems
- Arrange in-person meetings

---

## 11. Liability & 12. Governing Law

PlayGroundX is not responsible for Creator behavior, content accuracy, earnings outcomes, or technical interruptions.

These Terms are governed by the laws of the **Province of Ontario, Canada**. Disputes may be resolved in Ontario courts or as required by Canadian law. In the event of conflict, these Terms of Service prevail.

---

*PlayGroundX Digital Ltd — 161 Westney Rd S, Ajax, ON, Canada, L0B1A0*`,

  /* ────────────────────────────────────────────
   *  Privacy Policy (PolicyEditor key)
   * ──────────────────────────────────────────── */
  privacy_policy: `## 1A. Data Controller

The data controller responsible for your personal data is:

\`\`\`
PlayGroundX Digital Ltd
Operating as: PlayGroundX
161 Westney Rd S, Ajax,
ON, Canada, L0B1A0.
\`\`\`

📧 **Privacy Contact:** privacy@playgroundx.vip

---

## 1. Introduction

This Privacy Policy explains how PlayGroundX Digital Ltd ("PlayGroundX", "we", "us", "our") collects, uses, and protects personal data in accordance with the **Personal Information Protection and Electronic Documents Act (PIPEDA)** and applicable Canadian privacy laws.

By using PlayGroundX, you acknowledge this Policy.

---

## 2. Data We Collect

### 2.1 Account Data
- Name & Email address
- Username & Date of birth

### 2.2 Financial Data
- Wallet activity & history
- Payment references

> ⚠️ **Note:** Card data is not stored.

### 2.3 Identity Verification (Creators)

To comply with legal obligations, we collect:
- Government-issued photo ID
- Selfie / liveness verification
- Facial image comparison data
- Consent/release documentation

*Processed by trusted third-party verification providers solely for identity and fraud prevention.*

---

## 3. Purposes & 4. Legal Basis

### Processing Purpose
- Platform Operation
- Identity & Age Verification
- Fraud Prevention
- Legal Compliance

### GDPR Basis
- Contractual Necessity
- Legal Obligations
- Legitimate Interests
- Explicit Consent (Biometric)

---

## 6. International Transfers & 7. Retention

Data may be transferred outside the EEA under **Standard Contractual Clauses (SCCs)**.

| Data Type | Retention |
|-----------|-----------|
| Account Data | Active + 5Y |
| Financial Data | 5–10Y |
| Identity Data | Up to 5Y post-closure |
| Usage Logs | 12 Months |

---

## 8. Your Rights (GDPR)

You have the right to:
- Access & Copy your data
- Correct inaccurate details
- Request deletion (Erasure)
- Restrict or object to processing
- Data Portability
- Withdraw consent at any time

---

*You have the right to lodge a complaint with the **Office of the Privacy Commissioner of Canada (OPC)** at priv.gc.ca.*

🛡️ GDPR Compliant — 🌐 Ontario, Canada`,

  /* ────────────────────────────────────────────
   *  Important Pages (ImportantPagesManager keys)
   * ──────────────────────────────────────────── */

  page_privacy_policy: `## 1A. Data Controller

The data controller responsible for your personal data is:

\`\`\`
PlayGroundX Digital Ltd
Operating as: PlayGroundX
161 Westney Rd S, Ajax,
ON, Canada, L0B1A0.
\`\`\`

📧 **Privacy Contact:** privacy@playgroundx.vip

---

## 1. Introduction

This Privacy Policy explains how PlayGroundX Digital Ltd ("PlayGroundX", "we", "us", "our") collects, uses, and protects personal data in accordance with the **Personal Information Protection and Electronic Documents Act (PIPEDA)** and applicable Canadian privacy laws.

By using PlayGroundX, you acknowledge this Policy.

---

## 2. Data We Collect

### 2.1 Account Data
- Name & Email address
- Username & Date of birth

### 2.2 Financial Data
- Wallet activity & history
- Payment references

> ⚠️ **Note:** Card data is not stored.

### 2.3 Identity Verification (Creators)

To comply with legal obligations, we collect:
- Government-issued photo ID
- Selfie / liveness verification
- Facial image comparison data
- Consent/release documentation

*Processed by trusted third-party verification providers solely for identity and fraud prevention.*

---

## 3. Purposes & 4. Legal Basis

### Processing Purpose
- Platform Operation
- Identity & Age Verification
- Fraud Prevention
- Legal Compliance

### GDPR Basis
- Contractual Necessity
- Legal Obligations
- Legitimate Interests
- Explicit Consent (Biometric)

---

## 6. International Transfers & 7. Retention

Data may be transferred outside the EEA under **Standard Contractual Clauses (SCCs)**.

| Data Type | Retention |
|-----------|-----------|
| Account Data | Active + 5Y |
| Financial Data | 5–10Y |
| Identity Data | Up to 5Y post-closure |
| Usage Logs | 12 Months |

---

## 8. Your Rights (GDPR)

You have the right to:
- Access & Copy your data
- Correct inaccurate details
- Request deletion (Erasure)
- Restrict or object to processing
- Data Portability
- Withdraw consent at any time

---

*You have the right to lodge a complaint with the **Office of the Privacy Commissioner of Canada (OPC)** at priv.gc.ca.*

🛡️ GDPR Compliant — 🌐 Ontario, Canada`,

  page_terms_of_service: `## Operator Information

This terms and conditions is issued by **PlayGroundX Digital Ltd** (operating as PlayGroundX), a company registered in Canada.

\`\`\`
PlayGroundX Digital Ltd
161 Westney Rd S, Ajax,
ON, Canada, L0B1A0.
\`\`\`

---

## 1. Introduction

By accessing or using PlayGroundX Digital Ltd ("PlayGroundX", "Platform", "we", "us", "our"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Platform.

PlayGroundX is an interactive entertainment platform where Users pay for access to live digital experiences, including Rooms, content, and interactions.

*We may update these Terms at any time. Continued use constitutes acceptance.*

---

## 2. Definitions

| Term | Meaning |
|------|---------|
| **User** | Any person using PlayGroundX |
| **Creator** | A User who hosts Rooms or uploads content |
| **Fan** | A User who purchases access or interacts |
| **Room** | Live or interactive experience hosted by a Creator |
| **Fan Payment** | Any payment made by a Fan |
| **Wallet** | Prepaid balance used for transactions |
| **Creator Earnings** | Amount payable to Creator after fees |

---

## 3. Eligibility

### General Requirements:
- Be 18+
- Be legally able to enter contracts
- Comply with applicable laws

### Creators must:
- Complete identity verification (KYC)
- Provide valid payout details
- Provide consent documentation for all participants

---

## 4. Platform Nature

PlayGroundX provides the infrastructure for interactive experiences. We are not a party to Fan–Creator transactions and do not guarantee content, outcomes, or earnings.

---

## 5. Monetization & Fees

### 5.1 Currency & Wallet

All transactions are processed in **Euros (€)**. Users must pre-fund a Wallet with a minimum of **€25** before making purchases. Wallet funds are non-refundable, except where required by law.

### Public Rooms

| Revenue Type | Split |
|-------------|-------|
| Entry Fee | 100% Platform |
| Per-Minute Billing | 100% Platform |
| Tips | 85% Creator / 15% Platform |
| Gifts | Up to 100% Creator |

### Private Rooms

| Revenue Type | Split |
|-------------|-------|
| Entry Fee | 60% Platform / 40% Creator |
| Per-Minute Billing | 60% Platform / 40% Creator |
| Tips | 85% Creator / 15% Platform |
| Gifts | Up to 100% Creator |

### 5.5 Per-Minute Billing Rules

- Billing begins immediately upon Room entry and is charged per full minute.
- Once a minute starts, it is considered a full billable minute (no per-second billing).
- **Disconnections:** Billing resumes upon re-entry within the same session/day.
- **Creator Early Exit:** Billing stops at the last completed minute. Creators are not required to stay for any minimum duration.

### 5.7 Payout Terms

- Payout delay: 7–21 days minimum
- Minimum payout threshold applies
- We may hold funds for fraud review or compliance reasons

---

## 6. Refund & Chargeback Policy

**6.1 No Refunds:** All sales are final once access is granted.

Users agree not to initiate unjustified chargebacks. If a chargeback occurs, accounts may be suspended, wallet access revoked, and funds recovered from Creator Earnings.

---

## 8. Acceptable Use

Users may NOT:
- Use or feature minors (under 18)
- Upload illegal or non-consensual content
- Promote violence, abuse, or exploitation
- Harass, doxx, or defame others
- Share prohibited content (extreme acts, bodily waste, etc.)
- Attempt to bypass payments or platform systems
- Arrange in-person meetings

---

## 11. Liability & 12. Governing Law

PlayGroundX is not responsible for Creator behavior, content accuracy, earnings outcomes, or technical interruptions.

These Terms are governed by the laws of the **Province of Ontario, Canada**. Disputes may be resolved in Ontario courts or as required by Canadian law. In the event of conflict, these Terms of Service prevail.

---

*PlayGroundX Digital Ltd — 161 Westney Rd S, Ajax, ON, Canada, L0B1A0*`,

  page_refund_policy: `## 1. General Refund Policy

All purchases on PlayGroundX are digital, immediately consumed, and non-reversible. No refunds are provided once access is granted.

\`\`\`
PlayGroundX Digital Ltd, 161 Westney Rd S, Ajax, ON, Canada, L0B1A0.
\`\`\`

---

## 2. Wallet System

- Users fund an internal wallet before spending.
- Minimum funding is €25.
- Spend is deducted first from the wallet balance.
- Used wallet funds are strictly non-refundable.

---

## 3. Live Room Purchases

- Entry fees and per-minute billing apply upon room entry.
- Minutes are charged in full increments.
- Leaving a room does not reverse charges.
- Tips and gifts are non-reversible.

---

## ⛔ Chargebacks are Prohibited

**Zero Tolerance Policy for Payment Disputes**

Chargebacks are strictly prohibited and considered a violation of our Terms. If a chargeback is initiated:

- ❌ Account permanently terminated
- ❌ All earnings reversed
- ❌ Wallet access revoked
- ❌ Permanent Platform ban

---

## 4. Creator Performance

If a Creator fails to deliver as described, PlayGroundX may (at its sole discretion) issue partial or full refunds. Repeated performance issues result in penalties for Creators.

---

## Fraud Monitoring

PlayGroundX actively monitors for suspicious transactions and abnormal usage. We may block transactions, freeze accounts, or apply payout holds to protect the platform.

---

*Payment & Refund Compliance — PlayGroundX Digital Ltd | Ajax, ON, Canada*`,

  page_cookies_policy: `## 1. Introduction

This Cookies Policy explains how PlayGroundX ("we", "us", "our") uses cookies and similar technologies when you use our Platform. This Policy should be read alongside our Privacy Policy.

\`\`\`
PlayGroundX Digital Ltd, 161 Westney Rd S, Ajax, ON, Canada, L0B1A0.
\`\`\`

---

## What are Cookies?

Cookies are small text files placed on your device. They help us operate the Platform, improve performance, remember your preferences, and ensure account security.

---

## Types of Cookies We Use

### Strictly Necessary

Essential for the Platform to function. Used for login authentication, account security, fraud prevention, and session management. Cannot be disabled.

### Performance & Functional

Used for tracking usage behavior, language settings, and UI preferences. Helps us diagnose errors and improve features.

---

## Marketing & Tracking

We may use technologies like the **Meta Pixel** or **TikTok Pixel** to measure campaign performance and for ad targeting. These are only activated with your explicit consent.

---

## Example Cookie Table

| Name | Type | Purpose | Duration |
|------|------|---------|----------|
| auth_token | Necessary | Authentication | Session |
| _ga | Analytics | Behavior Tracking | 2 Years |
| _fbp | Marketing | Meta Tracking | 90 Days |

---

## Cookie Control

You can manage your preferences through our consent banner or your browser settings. Under GDPR, you have the right to withdraw consent at any time.

---

*Privacy Compliance — PlayGroundX Digital Ltd | Ajax, ON, Canada*`,

  page_creator_guidelines: `## 1. Role of Creators

Creators are independent users who host Rooms, create and upload content, and interact with Fans. They are fully responsible for their content and conduct under PlayGroundX and applicable laws.

\`\`\`
PlayGroundX Digital Ltd, 161 Westney Rd S, Ajax, ON, Canada, L0B1A0.
\`\`\`

---

## 2. Performance Expectations

### Room Behavior
Behave professionally, maintain engagement, and avoid misleading promises. Creators must not abandon rooms immediately after entry or use deceptive session behavior.

### Consent & Verification
All content must involve only individuals 18+ who have provided written consent. Features with unverified individuals are strictly prohibited.

---

## 3. Monetization Structure

### Public Rooms

| Revenue Type | Split |
|-------------|-------|
| Entry Fees | 100% PLATFORM |
| Per-Minute Billing | 100% PLATFORM |
| Tips | 85% CREATOR |
| Gifts | UP TO 100% CREATOR |

### Private Rooms

| Revenue Type | Split |
|-------------|-------|
| Entry Fees | 40% Creator / 60% Platform |
| Per-Minute Billing | 40% Creator / 60% Platform |
| Tips | 85% CREATOR |
| Gifts | UP TO 100% CREATOR |

*PlayGroundX Digital Ltd reserves full discretion over pricing and revenue distribution.*

---

## Prohibited Behavior

- ❌ Requesting payments or moving communication off-platform.
- ❌ Promising specific actions during sessions and not delivering.
- ❌ Using AI or synthetic content without clear labeling or consent.

---

## Compliance Enforcement

Violations result in warnings, content removal, or permanent bans. Earnings may be forfeited due to refunds, chargebacks, or fraud.

### Payout Reviews:
- Delayed payouts (7–21 days)
- Holds for fraud monitoring
- Identity verification checks

---

*Creator Ecosystem Policy — PlayGroundX Digital Ltd | Ajax, ON, Canada*`,

  page_payout_terms: `## Introduction

These Creator Payout Terms form part of the PlayGroundX Terms of Service and apply to all Creators earning on the platform. In the event of conflict, the Terms of Service shall prevail.

\`\`\`
PlayGroundX Digital Ltd, 161 Westney Rd S, Ajax, ON, Canada, L0B1A0.
\`\`\`

---

## 1. Revenue Model & Splits

| Revenue Stream | Creator Share |
|---------------|--------------|
| Tips | **85%** Creator |
| Gifts | **Up to 100%** Creator |
| Private Room (Entry/Billing) | **40%** Creator |
| Public Room (Entry/Billing) | **0%** Creator (Platform Only) |

*Public room entry and per-minute billing is 100% platform revenue. Tips and Gifts are shared within individual session contexts.*

---

## 2. Timing & Processing

- ⏱ Payouts typically processed after **7–21 days**.
- ⚖️ Subject to extensive fraud and chargeback review.
- 💰 Minimum payout threshold must be met before withdrawal.

---

## 3. Holds & Deductions

- ❌ Revenue may be reversed for fraud or chargebacks.
- ⚠️ Earnings are recovered in cases of content non-delivery.
- 🔒 Holds apply if identity or tax info is inaccurate.

---

## Legal Notice

PlayGroundX Digital Ltd reserves the right to modify revenue splits, monetization mechanics, and pricing structures at any time. Continual use of the platform constitutes agreement to the current terms.

---

*Creator Payment & Revenue Policy — PlayGroundX Digital Ltd | Ajax, ON, Canada*`,

  page_about: `## Our Vision

*"We didn't just build a platform. We built a neon escape—a place where creators and fans connect in the most stylish, secure, and interactive way possible."*

PlayGroundX is born from the intersection of nightlife culture and the creator economy. We believe that digital interaction shouldn't feel clinical; it should feel alive, vibrant, and exclusive.

---

## The Interactive Spectrum

### 👑 Suga 4 U
Exclusive, personalized interactions with top-tier creators in a private, high-fidelity environment.

### ⚡ Flash Drops
Time-limited content drops and live events that keep you on the edge of your seat.

### 🔒 Confessions
Share secrets, unveil hidden stories, and connect on a deeper, more vulnerable level.

### 💬 X Chat
Real-time interactive group chats with a focus on speed, style, and community.

---

## Secure, Private, Exclusive

Every room in the PlayGroundX universe is built with privacy at its core. We use advanced encryption and consent-forward designs to ensure that every interaction—whether public or private—is safe and respected.

### Join the Evolution 🏆

Ready to step into the neon?

---

*PlayGroundX is a product of Riff Networks. Designed in the digital darkroom.*`,
};
