# Room Session System Skill

## Purpose

This skill defines how the AI agent should design, implement, and maintain the **Room Session System**, which powers all real-time interactive rooms on the platform.

The room system enables creators to host live sessions where fans can interact through:

- Live video streaming
- Real-time chat
- Paid reactions
- Tips
- Paid custom requests
- Session entry payments

The system must be **modular**, **real-time**, **scalable**, and **fully dynamic through the admin panel**.

All rooms share the **same core engine**, and duplication of logic across rooms must be avoided.

---

# System Overview

The platform supports multiple **user roles** and **room types**, but all rooms follow the same architecture.

The UI for rooms already exists.  
The AI agent must **not redesign the UI**.

Instead, the agent must connect existing UI to a **fully functional backend system**.

Core technologies involved:

- PHP backend
- Wallet system
- Real-time event system
- Agora.io live streaming
- Admin panel management
- Database driven configuration

---

# User Roles

## Fan User

Fans participate in creator sessions.

Fans can:

- Browse rooms
- View active sessions
- Join public sessions
- Request to join private sessions
- Watch live streams
- Send chat messages
- Send paid reactions
- Send tips
- Send paid custom requests

All paid actions deduct money from the **fan wallet**.

---

## Creator User

Creators host sessions.

Creators can:

- Start sessions
- Choose session type
- Set price for private sessions
- Broadcast live streaming
- Accept or reject join requests
- Receive payments from fans

Creators operate through the **Creator Dashboard**.

---

## Admin User

Admins control platform configuration.

Admins manage:

- Room settings
- Entry prices
- Reaction pricing
- Session monitoring
- Payment tracking
- Creator earnings

All configuration must be **dynamic and database-driven**.

---

## Guest User

Guests can browse rooms but cannot join sessions.

Guests must log in before participating.

---

# Rooms

Current rooms include:

- Truth and Dare
- Sugar 4 U
- Bar Lounge
- XChat
- Flash Drops
- Confessions
- Competitions

Each room is simply a **configuration layer** that uses the same underlying system.

Rooms must not have separate logic implementations.

---

# Core Functional Modules

The room system must be built using reusable modules.

Modules include:

### Room Configuration

Defines room properties controlled by admin.

Example settings:

- room name
- public session price
- minimum private session price
- available reactions
- reaction prices

---

### Session Engine

Handles:

- session creation
- session activation
- session status
- session participants

---

### Streaming Engine

Handles:

- creator live broadcast
- fan video viewing
- stream start and stop
- Agora integration

---

### Chat Engine

Handles:

- real-time messages
- session scoped messaging
- participant authorization

---

### Join Request System

Handles private session access.

Includes:

- fan join request
- creator approval or rejection
- real-time notifications

---

### Wallet Transaction System

Handles:

- session entry payments
- reaction purchases
- tips
- custom request payments

All wallet operations must use **safe database transactions**.

---

### Reaction System

Fans send paid reactions during sessions.

Examples:

- ❤️ Love
- 🔥 Fire
- 👏 Clap

Reaction prices are controlled by admin.

---

### Tip System

Fans can tip creators.

Tips immediately increase creator earnings.

---

### Custom Request System

Fans can send paid requests.

Example requests:

- ask a question
- request a challenge
- request a specific action

---

### Notification System

Handles real-time notifications for:

- join requests
- session acceptance
- tips
- reactions
- custom requests

---

# Creator Session Flow

## Creator Dashboard

Creators log into dashboard and see available rooms.

Example menu:

- Truth and Dare
- Sugar 4 U
- Bar Lounge
- XChat
- Flash Drops
- Confessions
- Competitions

Clicking a room opens the **Start Session Page**.

---

# Start Session Page

Creator inputs:

- session title
- session description
- session type

Session types:


Public
Private


---

# Public Session Rules

Public session entry fee is defined by admin.

Creator **does not see the price**.

Creator only selects public session and starts.

---

# Private Session Rules

Private sessions allow creator to set price.

Rules:

- minimum entry fee = 20
- creator can increase price
- validation required

---

# Session Start

When creator starts a session:

1. session record created
2. session becomes active
3. creator redirected to session interface
4. streaming begins

---

# Creator Session Features

## Live Streaming

Agora is already integrated.

Creator can:

- start camera
- stop camera
- mute microphone
- unmute microphone

Creator is the **only broadcaster**.

Fans are viewers.

---

## Live Chat

Session chat must support:

- instant messaging
- sender identity
- timestamps
- participant-only access

---

## Tips

Fan sends tip.

System must:

1. deduct wallet balance
2. credit creator earnings
3. trigger real-time notification

---

## Paid Reactions

Fan sends reaction.

System must:

1. deduct wallet
2. credit creator
3. broadcast animation

---

## Custom Requests

Fan submits request.

Request may include payment.

System must:

1. deduct wallet
2. credit creator
3. display request to creator

---

# Join Request Flow

Private sessions require approval.

Fan sends join request.

Creator receives real-time popup.

Creator chooses:


Accept
Reject


If accepted:

fan pays entry fee.

If rejected:

fan cannot enter.

---

# Fan Room Flow

## Room Menu

Fan clicks room from navigation.

Fan sees **Active Sessions Page**.

---

# Active Sessions Page

Displays:

- creator
- session title
- session type
- viewer count
- entry price

---

# Joining Public Session

Fan pays entry fee.

Fan enters session.

---

# Joining Private Session

Fan sends join request.

Creator approves or rejects.

If approved:

fan pays and joins.

---

# Fan Session Features

Fans inside session can:

- watch live stream
- send chat messages
- send reactions
- send tips
- send custom requests

---

# Wallet System Rules

All payments must:

1. validate wallet balance
2. deduct balance
3. credit creator earnings
4. store transaction logs

Payment types:

- entry fee
- reactions
- tips
- requests

---

# Admin Panel Controls

Admin must control system dynamically.

---

# Room Settings

Admin can set:

- room name
- room status
- public session price
- private session minimum price

---

# Reaction Management

Admin manages reactions.

Each reaction includes:

- name
- icon
- price

---

# Session Monitoring

Admin can:

- view active sessions
- force close sessions
- monitor viewers
- monitor revenue

---

# Payment Monitoring

Admin can see:

- entry payments
- tip payments
- reaction payments
- request payments

---

# Database Tables

Recommended schema:


rooms
room_settings
room_sessions
room_session_participants
room_join_requests
room_messages
room_reactions
room_tips
room_custom_requests
room_transactions
creator_earnings
room_notifications


---

# Session Fields

Sessions must include:

- room_id
- creator_id
- title
- description
- session_type
- entry_fee
- session_status
- stream_status
- start_time
- end_time

---

# Transaction Fields

Transactions include:

- payer_id
- receiver_id
- session_id
- room_id
- transaction_type
- amount
- status
- timestamp

---

# Real-Time Event System

Events must include:

- new message
- new reaction
- tip received
- join request
- join request response
- custom request
- stream started
- stream ended

All events must be session-scoped.

---

# Security Rules

### Creator Rules

- only creators start sessions
- creators manage only their sessions

---

### Fan Rules

- fans must have wallet balance
- fans cannot bypass payment
- fans cannot join private sessions without approval

---

### Streaming Rules

- creator publishes stream
- fans watch only
- only session members access stream

---

# UI Rules

The UI already exists.

The agent must:

- not change layouts
- not redesign pages
- connect backend logic to UI

If new UI is required:

- create modal components
- follow existing style

---

# Implementation Strategy

The AI agent must follow this order:

1. analyze existing code
2. design database schema
3. implement backend APIs
4. implement admin configuration
5. implement creator session flow
6. implement fan session flow
7. implement realtime system
8. connect Agora streaming
9. connect wallet system
10. run full test scenarios

---

# Development Principles

The AI agent must ensure:

- modular architecture
- reusable services
- scalable design
- real-time performance
- clean code
- no duplicated room logic