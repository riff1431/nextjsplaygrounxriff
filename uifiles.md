UI FILE INGESTION + ROLE-BASED UI MAPPING (FRONTEND ONLY)
INPUT CONTEXT

I have added all UI files as .txt files.
Each file contains client-provided UI code.

Use the file names to understand:

Which page / room the UI belongs to

Which user type (role) the UI is intended for

🔴 CRITICAL RULES (REPEAT & ENFORCE)

Frontend ONLY

No backend

No database

No authentication

No role logic enforcement

UI must be 100% identical

Use UI exactly as written in .txt files

Preserve DOM structure

Preserve classes, IDs, inline styles

No redesign, no cleanup, no optimization

Future full-stack ready

Structure code so roles and logic can be added later

Do NOT hard-code assumptions that block backend integration

🧱 UI FILE INTERPRETATION RULE

Read each .txt file and infer the following ONLY from the file name:

Page / Room name

Intended user type (role)

Do NOT guess from UI content — file name is the authority.

🧱 ROLE-BASED UI MAPPING (UI ONLY)

The system will later support these roles:

Admin

Creator

Fan

Guest

⚠️ In this phase:

Roles are UI-only placeholders

No permission logic

No authentication

No redirects

🔹 Fan UI Rules

If a .txt file represents Fan UI:

Implement it under fan-specific routes/components

Example:

/fan/rooms/confessions

/fan/rooms/truth-or-dare

Fan users must see Fan version UI only

🔹 Creator UI Rules

If a .txt file represents Creator UI:

Implement it under creator-specific routes/components

Example:

/creator/rooms/confessions

/creator/dashboard

Creator users must see Creator version UI only

🔹 Guest UI Rules (Very Important)

Guest UI must exist if provided

Guest routes must not assume login

Example:

/guest/rooms/*

🔹 Admin UI (If Provided)

Admin UI files should be placed under:

/admin/*

No admin logic required

🧱 ROOM IMPLEMENTATION RULE (VERY IMPORTANT)

If a .txt file contains:

Homepage + Room UI together

Then:

❌ Ignore homepage UI

✅ Extract ONLY the room UI

✅ Implement room UI exactly as provided

🧱 UI IMPLEMENTATION PROCESS (MANDATORY)

For EACH .txt file:

Read the filename

Identify:

Role (fan / creator / guest / admin)

Page or room name

Create correct route and component

Paste UI code EXACTLY as provided

Ensure all UI elements render

🧱 INTERACTIONS

UI-level interactions only

Static / fake interactions allowed

No backend dependency

🧱 CONSISTENCY RULE

Do NOT merge fan and creator UI

Each role keeps its own UI version

No shared assumptions between roles

🧱 FINAL VALIDATION

Before marking this task complete:

All .txt UI files are implemented

All routes load correctly

Fan sees fan UI

Creator sees creator UI

Guest sees guest UI

No missing elements

No broken UI

✅ ACCEPTANCE CONDITION

The task is complete ONLY when:
Every .txt UI file is rendered exactly as-is in the correct role-based route.

🚫 ABSOLUTELY DO NOT

Do NOT modify UI code

Do NOT merge role UIs

Do NOT implement backend

Do NOT add auth

Do NOT redesign anything

🎯 FINAL GOAL

A fully structured Next.js frontend where:

Client UI files are rendered exactly

Role-based UI separation exists

Backend and logic can be added later without UI refactor