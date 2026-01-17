# Profile Page Overhaul Plan

## 1. Database & Schema
- [ ] **Check/Add `location` field** to `profiles` table (for "Los Angeles, CA").
- [ ] **Define "Unlocks" metric**: Determine source (e.g., count of purchased entries/drops).

## 2. UI Layout & Styling (Match Screenshot)
- [ ] **Cover Area**:
    - Implement purple/hex-grid gradient background.
    - Add "Camera" icon button for cover image update.
- [ ] **Profile Header**:
    - **Avatar**: Circular with pink "Camera" edit button.
    - **Name & Badge**: Bold Name + Gold "VIP" pill badge.
    - **Meta Info**: Handle (`@alex_vibes`), Join Date ("Joined March 2025").
    - **Details**: "Map Pin" Location, "Link" Website.
- [ ] **Action Buttons**:
    - **Edit Profile**: Dark outline style.
    - **Share**: Blue filled style (copies profile link).
- [ ] **Stats Row**:
    - Following (Count).
    - Followers (Count).
    - **Unlocks** (Count) - replacing "Likes" in the main key stats if "Unlocks" is preferred.
- [ ] **Tabs Navigation**:
    - [Collection] [Likes] [About]
    - Pink underline for active tab.

## 3. Dynamic Functionality
- [ ] **Fetch Data**:
    - Pull `location` and `joined_at` date.
    - Calculate "Unlocks" count.
- [ ] **Tab Switching**:
    - Implement Client-side state for switching tabs.
    - **Collection Tab**: Grid of unlocked items (placeholder).
    - **Likes Tab**: Grid of liked content (placeholder).
    - **About Tab**: Bio text (moved from top).
- [ ] **Share Action**: Implement `navigator.clipboard.writeText`.

## 4. Verification
- [ ] Verify Mobile responsiveness.
- [ ] Verify "Edit" mode vs "View" mode (Owner vs Visitor).
