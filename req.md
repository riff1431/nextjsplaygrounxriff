🔴 GLOBAL HARD RULES (NON-NEGOTIABLE)

UI must be 100% identical to client-provided UI

No redesign

No styling changes

No layout interpretation

No “close enough”

Client-provided code is the ONLY UI source

Use their HTML/CSS/JS exactly

Only refactor structure, not visuals

Backend logic is OUT OF SCOPE

No API calls

No DB

No auth

No real-time logic

UI-only interactions allowed

Static / mocked interactions only

Only if visible in client UI

🧱 TASK 1: PROJECT INITIALIZATION (FROM SCRATCH)

Prompt Task:

Initialize a fresh Next.js project (latest stable version) using App Router.
Configure the project strictly for frontend UI rendering only.

Requirements:

Use Next.js App Router

Clean project (no demo content)

Global CSS enabled

Assets folder ready for images/icons

No backend or API routes

🧱 TASK 2: GLOBAL LAYOUT SETUP

Prompt Task:

Create a global layout that supports multiple independent “room” pages without enforcing shared UI styles.

Requirements:

Neutral root layout

No global UI assumptions

No forced typography overrides

Client UI styles must control appearance

🧱 TASK 3: CLIENT UI CODE INGESTION RULE

Prompt Task:

When client-provided code includes homepage + room UI together, extract ONLY the room-related UI and ignore homepage elements.

Requirements:

Remove homepage headers, footers, navs (unless room-specific)

Preserve all room DOM structure

Preserve class names, inline styles, IDs

🧱 TASK 4: ROOM ARCHITECTURE SETUP

Prompt Task:

Create a dedicated route and component for each room shown in client UI references.

Room Routing Example:

/rooms/confessions

/rooms/bar-lounge

/rooms/x-chat

/rooms/suga-4-u

/rooms/truth-or-dare

/rooms/flashdrop

Requirements:

Each room isolated

No shared UI assumptions

Each room renders independently

🧱 TASK 5: ROOM UI IMPLEMENTATION (CRITICAL TASK)

Prompt Task:

Implement each room’s UI by copying the client-provided code and rendering it EXACTLY as-is inside Next.js components.

Hard Rules:

Do NOT modify:

Spacing

Colors

Fonts

Layout

Element order

Preserve:

Class names

IDs

Inline styles

DOM hierarchy

🧱 TASK 6: VISUAL PARITY VALIDATION (MANDATORY)

Prompt Task:

Validate each room visually against the client’s video/screenshots to ensure pixel-perfect accuracy.

Checklist per Room:

All UI elements present

No missing cards

No missing buttons

No broken icons

No layout shifts

No clipped content

🧱 TASK 7: KNOWN PROBLEM ROOMS (HIGH PRIORITY)

Prompt Task:

Rebuild the following rooms strictly from client UI references as they were previously incorrect.

Rooms:

Confessions

Bar Lounge

X Chat

Suga 4 U

Truth or Dare

Requirement:

Must look exactly like client reference

No assumptions

No placeholders

🧱 TASK 8: TRUTH OR DARE – UI INTERACTION ONLY

Prompt Task:

Implement minimum UI-level interaction for Truth or Dare, matching what is visually shown in the client UI.

Allowed Interactions:

Button click → UI change

Modal open

Card flip

Text change

Restrictions:

No backend logic

No randomization unless shown in UI

No feature extension

🧱 TASK 9: UI CONSISTENCY ENFORCEMENT

Prompt Task:

Ensure UI consistency across all rooms without altering individual room designs.

Consistency Areas:

Font rendering

Button behavior

Hover effects (if shown)

Animation timing (if shown)

🧱 TASK 10: ERROR & CLEANUP PASS

Prompt Task:

Perform a final UI-only cleanup pass.

Requirements:

No console-breaking UI errors

No broken imports

No missing assets

CSS loads correctly

Images render correctly

🧱 TASK 11: FINAL UI DELIVERY CHECK

Prompt Task:

Prepare the frontend so the client can visually verify all rooms without explanation.

Acceptance Condition:
✔ Client can say:
“All UI now matches what I sent.”

🚫 EXPLICITLY DO NOT DO

Do NOT add features

Do NOT improve UX

Do NOT refactor styles

Do NOT redesign anything

Do NOT implement backend logic

Do NOT guess functionality

🟢 FINAL EXECUTION GOAL

A clean Next.js frontend where every room UI is an exact visual clone of the client-provided design, ready for backend wiring in the next phase.





ARCHITECTURAL INTENT (IMPORTANT)

Structure the frontend in a way that it can later support a full-stack architecture without UI refactoring.

Future roles (DO NOT implement logic now):

Admin

Creator

Fan

Guest (very important)

⚠️ These roles are conceptual placeholders only in this phase.

🔹 CURRENT PHASE RULES (STRICT)

Frontend ONLY

No database

No API routes

No auth

No role logic

UI must match client reference exactly

Use client-provided code

Preserve DOM structure

Preserve classes, IDs, inline styles

Do NOT block future full-stack work

Use clean routing

Modular components

Role-ready folder structure

🔹 ROUTING & STRUCTURE REQUIREMENTS

Set up routing and folders assuming future role-based access, but do NOT enforce it now.

Example intent (not logic):

/admin/*

/creator/*

/fan/*

/guest/*

👉 All routes currently render static frontend UI only.

🔹 ROLE VISIBILITY (UI ONLY)

Guest UI must exist (very important)

Admin / Creator / Fan UIs may exist as layouts or pages

No permission checks

No redirects

No protected routes

🔹 ROOM-BASED UI IMPLEMENTATION

Each room UI must be implemented exactly as sent by the client.

Confessions

Bar Lounge

X Chat

Suga 4 U

Truth or Dare

Flashdrop

⚠️ If client code includes homepage + room together:

Ignore homepage

Extract room UI only

🔹 INTERACTIONS

UI-level interactions only

Fake/static behavior allowed

No backend dependency

🔹 FINAL ACCEPTANCE CONDITION

The frontend phase is complete ONLY when the client can say:
“All UI is exactly the same as what I sent.”



