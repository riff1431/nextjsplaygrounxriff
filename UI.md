MASTER VIBE PROMPT — FRONTEND UI PHASE (FUTURE FULL-STACK READY)
PROJECT INTENT (READ CAREFULLY)

Build this project as a future-ready full-stack web application, but DO NOT implement backend, database, authentication, or business logic now.

This project WILL LATER include:

Database

Backend logic

Authentication

Role-based permissions

Fully functional features

👉 NOT NOW
👉 NOW = FRONTEND UI ONLY

The ONLY goal of this phase is to build the full frontend UI, making it 100% visually identical to the client-provided design.

🔴 GLOBAL NON-NEGOTIABLE RULES

UI must be 100% identical to client-provided UI

No redesign

No improvements

No assumptions

No “close enough”

Client-provided code is the ONLY UI source

Use their HTML/CSS/JS

Preserve DOM structure

Preserve class names, IDs, inline styles

Only refactor for Next.js structure, NOT visuals

Frontend ONLY

No database

No APIs

No authentication

No real logic

No role enforcement

Prepare for future full-stack

Clean architecture

Modular components

No UI refactor needed later

🧱 TECH STACK & SETUP

Use Next.js (latest stable) with App Router

Clean project (no demo content)

Global CSS enabled

Assets folder for images/icons

No API routes

No backend services

🧱 GLOBAL LAYOUT REQUIREMENTS

Neutral root layout

Do NOT enforce shared UI styling

Client UI controls appearance

Do NOT override fonts, spacing, or colors globally

🧱 ROLE AWARENESS (UI PLACEHOLDERS ONLY)

This platform will later support minimum 4 roles:

Admin

Creator

Fan

Guest (VERY IMPORTANT)

⚠️ In this phase:

Roles are conceptual only

No permission checks

No auth

No redirects

No protected routes

👉 Folder and routing structure must be role-ready, but logic comes later.

🧱 ROUTING STRUCTURE (FUTURE-READY, UI-ONLY)

Set up routing assuming future role-based access:

/admin/*

/creator/*

/fan/*

/guest/*

👉 All routes currently render static frontend UI only.

🧱 ROOM-BASED ARCHITECTURE (CRITICAL)

This is a multi-room platform.

Each room must:

Be isolated

Render independently

Match client UI exactly

Rooms to implement (minimum):

Confessions

Bar Lounge

X Chat

Suga 4 U

Truth or Dare

Flashdrop

⚠️ These rooms were explicitly reported as incorrect before and must be rebuilt accurately.

🧱 CLIENT CODE INGESTION RULE (VERY IMPORTANT)

If client-provided code contains:

Homepage + Room UI together

Then:

❌ Ignore homepage UI

✅ Extract ONLY room-related UI

✅ Preserve exact structure of room code

🧱 ROOM UI IMPLEMENTATION RULES

For EACH room:

Copy client-provided UI code

Render it EXACTLY as-is

Do NOT:

Change spacing

Change colors

Change fonts

Change layout

Reorder elements

UI Completeness Checklist:

All cards visible

All buttons present

All icons render

All images load

No missing elements

No placeholders (unless shown in reference)

🧱 INTERACTIONS (UI-ONLY)

Static / fake interactions allowed

Only if visible in client UI

No backend dependency

Special Case — Truth or Dare:

Button click must cause visible UI change

Modal

Card change

Text update

No logic

No randomization unless shown in UI

🧱 CONSISTENCY REQUIREMENTS

Maintain consistency across rooms WITHOUT altering designs:

Typography rendering

Button behavior

Hover effects (if shown)

Animation timing (if shown)

🧱 FINAL CLEANUP & VALIDATION

Before considering this phase complete:

No broken CSS

No missing assets

No UI-related console errors

All rooms visually verifiable

No explanation required to understand UI

✅ FINAL ACCEPTANCE CONDITION

This phase is COMPLETE ONLY WHEN:

The client can say:
“All UI is exactly the same as what I sent.”

🚫 ABSOLUTELY DO NOT

Do NOT implement backend logic

Do NOT connect database

Do NOT add features

Do NOT redesign anything

Do NOT improve UX

Do NOT guess functionality

🎯 FINAL EXECUTION GOAL

Deliver a clean, scalable Next.js frontend where:

Every room is a pixel-perfect clone of client UI

Architecture is ready for backend, roles, and logic

No UI changes will be needed in future phases