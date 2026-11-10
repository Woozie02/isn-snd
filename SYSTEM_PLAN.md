# ISN Sports Nutrition Day 2026 — System Plan & Implementation Blueprint

## 1. Executive Summary & Review
This system plan aligns the event brand assets (`ISN-poster-logo-extraction/`), the reference front-end prototype (`isn-snd26-antigravity-handoff/`), and operational requirements for **ISN Sports Nutrition Day 2026**.

### Fulfillment Status & Gap Analysis
- **Brand Assets & Visual Identity**: Fully fulfilled. Extracted raster marks (transparent cutouts and source crops) in `ISN-poster-logo-extraction/` provide high-fidelity brand assets (PERFORM SND lockup, ISN organiser mark, social links).
- **Core Event Modules (Overview, Attendance, Feedback)**: Defined and matched against `INTERACTION_SPEC.md` and `mockup-reference/`.
- **Pre-event Team Assignment (4 Teams)**: Proposed in the initial plan; detailed specifications for data modeling, UI surfaces, and assignment workflows are defined in Section 5 below.
- **E-Certificate Workflow**: Outlined in the initial plan; clarified architecture, triggers, and mock certificate preview / simulation in Section 6 below.
- **Architectural Scope Boundary**: Strictly client-side prototype persisting via browser `localStorage`. Clear sample labels ("SAMPLE DATA · LOCAL ONLY") ensure no mock data is misrepresented as production data.

---

## 2. Event Facts (Source of Truth)
- **Event**: ISN Sports Nutrition Day 2026
- **Date**: 11 Nov 2026
- **Session Title**: "Hydration and Performance Nutrition: Strategies and Practices"
- **Organiser**: ISN (Institut Sukan Negara) / Pemakanan Sukan
- **Brand Markers**: ISN, PERFORM SND, RegisterHere
- **Master Attendees**: 157 participants imported from `MASTER Participants List (For ICT) - MASTER.csv`
  - VIP: 30 participants
  - Sponsors: 16 participants
  - Paid Participants: 111 participants
- **Teams**: Balanced into 4 distinct color-coded teams:
  - Team Pink (`#EC4899`, 40 participants)
  - Team Purple (`#8B5CF6`, 39 participants)
  - Team Orange (`#F97316`, 39 participants)
  - Team Grey (`#64748B`, 39 participants)
- **Workshop Feedback Questions (from `feedback questions.md`)**:
  1. Overall workshop experience (1–5 scale: Very Poor to Excellent)
  2. Extent workshop improved understanding of hydration assessment & planning (1–5 scale: Not at all to To a great extent)
  3. Rating of station learning activities including demonstrations, case studies, practical tasks (1–5 scale: Very Poor to Excellent)
  4. What was most valuable or enjoyable about the workshop (Text feedback)
  5. Suggestions for improving future workshops (Text feedback)
- **Security & Portals**:
  - Admin Portal (`index.php`): Authenticated via `login.php` (`admin` / `SND2026!`).
  - Participant Self Check-In: `checkin.html` (format-insensitive phone search, persistent state on refresh, counter collection directions).
  - Participant Feedback & E-Cert: `feedback.html` (5 workshop questions, live attendee autocomplete, instant automated certificate dispatch via MyGovUC SMTP).

---

## 3. Implemented Architecture: Option A + XAMPP MySQL Backend

The system has been implemented using **Option A** with **XAMPP MySQL** and Apache:
- **Web Server**: Apache running under XAMPP (`http://localhost/snd26/`).
- **Database**: MySQL running under XAMPP (`127.0.0.1:3306`, database `snd26`).
- **Backend API**: PHP 5.6+ PDO REST APIs in `/api/`:
  - `api/db.php`: Central PDO MySQL connection (`utf8mb4`).
  - `api/stats.php`: Real-time aggregated statistics (registrations, arrivals, feedback, rating averages).
  - `api/attendees.php`: Full CRUD & filters (by team, status, search) for participant registrations.
  - `api/checkin.php`: Instant check-in and undo check-in action endpoints.
  - `api/teams.php`: Team roster breakdown, individual team reassignment, and auto-balancing across all 4 teams.
  - `api/feedback.php`: Attendee evaluation collection and automatic E-Certificate validation.
- **Frontend Core**: Vanilla HTML5, CSS3, modern ES6+ JavaScript (`app.js`, `styles.css`, `index.html`).
- **Brand Assets**: Extracted transparent PNG assets (`assets/brand/`) integrated into navigation, hero section, and certificate layouts.
- **Certificate Engine**: Official personalized E-Certificate generated immediately upon feedback submission with a print / save PDF action.

---

## 4. Core Portal Modules

### Module 1: Overview
- **Header & Hero**: Event identity banner, session title, date badge (11 Nov 2026), poster asset preview, registration status badge ("Registration Open").
- **Key Metrics Cards**:
  1. Total Registrations (with progress bar towards target capacity)
  2. Checked-in Attendees (live count & check-in percentage rate)
  3. Feedback Received (response volume & completion percentage)
  4. Average Sentiment / Rating (out of 5.0 with star rating breakdown)
  5. *New*: Team Distribution Summary Card (balanced headcount across the 4 teams)
- **Panels & Quick Actions**:
  - Recent check-in stream & attendance status quick link
  - Feedback sentiment highlights & latest comments
  - Quick action CTA buttons: "Open Check-In Desk", "Register Attendee", "Team Rosters", "Preview Feedback Form", "Export All Data (CSV)"

### Module 2: Attendance & On-Site Check-in Desk
- **Directory Table**: Full Name, Email, Reg ID (`ISN-26XX`), Category (Sports Dietitian, Athlete, Team Coach, Sports Scientist, Media, Volunteer, Student), Team Badge (Team 1–4), Registration Date, Status Badge (`Checked in` vs `Awaiting arrival`), Actions.
- **Search & Filtering**: Real-time filtering by Name, Email, Reg ID, Category, Attendance Status, and Assigned Team.
- **Check-in Engine & Desk Dialog**:
  - One-click Check-in / Undo action per record with instant toast notification.
  - Check-in Desk Quick Lookup modal: Scan / search by Reg ID or Email, instant match confirmation, audio-visual feedback cue, and recent arrivals reel.
- **Add Attendee Dialog**: Fields for Name, Email, Category, Ticket Type, and Pre-assigned Team.
- **Export**: Generates valid sample CSV (`isn-snd26-attendance-sample.csv`).

### Module 3: Feedback & Sentiment Intelligence
- **Metrics & Distribution**: Total responses, response conversion rate (% of checked-in), 5-star rating breakdown for Overall Event and Session ("Hydration & Performance Nutrition Strategies").
- **Directory & Filtering**: Searchable feedback comments, filtered by rating level, recommendation status (Yes / Maybe / No), and Team affiliation.
- **Detail View Modal**: Complete response inspection including attendee info, timestamp, category, team, ratings, and commentary.
- **Attendee Feedback Submission Form**:
  - Select attendee registration
  - Rating 1: Overall Event experience (1–5 stars)
  - Rating 2: Usefulness of Hydration & Performance Nutrition strategies (1–5 stars)
  - Recommendation select: Yes / Maybe / No
  - Qualitative comments textarea (max 500 characters)
  - Submission updates local storage state immediately and triggers E-Certificate simulation.
- **Export**: Generates sample feedback CSV (`isn-snd26-feedback-sample.csv`).

---

## 5. Team Assignment Specification (4 Pre-Event Teams)

To support team-based workshops and competitive nutrition activities on event day, participants are divided into 4 balanced teams.

### Team Definitions & Colors
The 4 pre-event teams are assigned specific theme colors matching the event operations palette (Pink, Purple, Orange, Grey):

| Team ID | Team Name | Theme / Color Token | Accent Hex | Background Tint | Composition / Role Focus |
|---|---|---|---|---|---|
| `TEAM-1` | **Team Pink** | Electric Pink | `#EC4899` | `#FDF2F8` | Sports Dietitians & Nutritionists |
| `TEAM-2` | **Team Purple** | Royal Purple | `#8B5CF6` | `#F5F3FF` | Coaches & Performance Scientists |
| `TEAM-3` | **Team Orange** | Energetic Orange | `#F97316` | `#FFF7ED` | Athletes & Sports Enthusiasts |
| `TEAM-4` | **Team Grey** | Slate Grey | `#64748B` | `#F8FAFC` | Volunteers, Media & Students |

### Data Model Extension
```javascript
// Attendee Schema Extension
{
  id: "ISN-2601",
  name: "Aina Danial",
  email: "aina.danial@example.com",
  category: "Sports dietitian",
  ticket: "Professional",
  team: "TEAM-1",          // TEAM-1 (Pink), TEAM-2 (Purple), TEAM-3 (Orange), TEAM-4 (Grey)
  teamName: "Team Pink",
  checkedIn: true,
  checkedAt: "9:14 AM"
}
```

### UI & Workflow Integration Points
1. **Navigation**: Dedicated "Teams" tab in primary sidebar or sub-navigation view.
2. **Overview Dashboard**: Team distribution widget showing roster size and check-in rate per team.
3. **Attendance Directory**: Team pill badge column with quick filter by Team (All, Team 1, Team 2, Team 3, Team 4).
4. **Team Assignment Manager**:
   - Reassign participant to a different team via dropdown.
   - Auto-balance utility button to evenly distribute unassigned or newly registered participants across the 4 teams.
5. **CSV Integration**: Both attendee and feedback CSV exports include the assigned Team ID and Team Name.

---

## 6. E-Certificate Specification (Feedback-Triggered)

### Workflow & Trigger Architecture
1. **Trigger Condition**: Successful submission of the attendee feedback form.
2. **Prototype Behavior (Mockup-Grade)**:
   - Upon feedback submission, display an inline success dialog / toast with an **"E-Certificate Issued"** notification.
   - Provide a **"Preview Certificate"** button opening an SVG/Canvas modal displaying the generated personalized certificate:
     - Attendee Name
     - Reg ID
     - Certificate Title: *Certificate of Participation — ISN Sports Nutrition Day 2026*
     - Session: *"Hydration and Performance Nutrition: Strategies and Practices"*
     - Organiser Signature: Institut Sukan Negara (ISN) & PEMAKANAN SUKAN lockups
     - Date: 11 November 2026
     - Action: "Download Certificate (PDF/PNG simulation)"
3. **Future Production Architecture**:
   - Webhook / Serverless API endpoint (`/api/feedback/submit`).
   - Server-side PDF generation (e.g. via Puppeteer / PDFKit / React-PDF) using official vector templates.
   - Transactional email dispatch (e.g., SendGrid / AWS SES / Mailgun) sending personalized certificate attachment to `attendee.email`.

---

## 7. Asset Integration Plan
1. **Sidebar Brand Lockup**: Incorporate `ISN-poster-logo-extraction/transparent-png/isn-wordmark.png` and `perform-snd-lockup.png`.
2. **Hero Section**: Embed `isn-organiser-lockup.png` and `pemakanan-sukan-wordmark.png` alongside the existing poster thumbnail.
3. **Footer**: Use `footer-isn-malaysia-wordmark.png` and social vector/PNG cutouts (`footer-facebook.png`, `footer-instagram.png`, `footer-tiktok.png`, `footer-web.png`, etc.).
4. **Registration Callout**: Position `registerhere-wordmark.png` in the check-in and registration modals.

---

## 8. Quality Assurance & Delivery Checklist
- [x] Verified event facts against handoff (Date: 11 Nov 2026, Session title, ISN / PERFORM SND).
- [x] Verified token consistency with `design-tokens.json`.
- [x] Sample data safeguards maintained: visible "SAMPLE DATA · LOCAL ONLY" badge.
- [x] Team assignment specifications defined (4 balanced teams, badge colors, filters, auto-balance).
- [x] E-Certificate workflow specified (feedback trigger, preview dialog, production backend roadmap).
- [x] Responsive layout targets (Desktop 1540px, Tablet 980px, Mobile 360px).
## 10. Access Control & Autonomous Feedback Portal Updates
1. **Public Participant Feedback Portal (`feedback.html`)**:
   - Independent participant page accessible directly at `/snd26/feedback.html` without requiring admin credentials or dashboard access.
   - Built specifically for mobile QR code scanning on event day.
   - Features real-time name autocomplete against MySQL, star ratings, and instantaneous issuance of personalized E-Certificates.
2. **Admin Authentication & Access Control (`login.php` & `auth.php`)**:
   - The primary admin dashboard (`/snd26/` and `/snd26/index.php`) is strictly protected via PHP session authentication.
   - **Credentials**:
     - **Username**: `admin`
     - **Password**: `SND2026!`
   - Unauthenticated visitors are automatically redirected to `login.php`.
   - Includes logout action (`login.php?logout=1`).
## 11. Environment Configuration & SMTP Mailer
1. **Unified Environment Configuration (`config.php`)**:
   - **Local Environment (XAMPP)**:
     - `DB_HOST`: `127.0.0.1:3306`
     - `DB_NAME`: `snd26`
     - `DB_USER`: `root`
     - `DB_PASS`: `ICTasset123!`
   - **Production Environment (Webmin/Linux `124.13.212.211`)**:
     - `DB_HOST`: `127.0.0.1:3306`
     - `DB_NAME`: `snd`
     - `DB_USER`: `snd`
     - `DB_PASS`: `kHWGCU8Tv3g3yBr`
     - Automatic detection via host IP / environment detection.
## 12. Check-In Verification & Self Check-In QR Portal Updates
1. **Admin Check-In Verification Flow**:
   - Enhanced Check-In Desk search to support format/case-insensitive queries by **Full Name**, **Phone Number** (with or without dashes/spaces/country code), **Reg ID**, and **Email**.
   - Upon clicking "Check In" for any participant, the system displays a verification modal showing:
     - **Full Name** (in uppercase)
     - **Category / Role**
     - **Team Badge** (Color-coded: Pink, Purple, Orange, Grey)
     - **Phone Number**
     - **Email Address**
     - **Arrival Timestamp**
     - Instructions to issue **Name Tag** and **Team Wristband**.
   - Admins must explicitly click `Close (X)` or `Close & Proceed` to finish verification before checking in the next participant.
2. **Participant Self Check-In Portal (`checkin.html`)**:
   - Independent mobile page for attendees scanning the arrival QR code.
   - Allows attendees to type their mobile phone number (format/case-insensitive) or name.
   - Shows matching attendee autocomplete suggestions.
   - On clicking "Confirm My Check-In", immediately records check-in status in MySQL.
   - Displays confirmed status with:
     - Full Name
     - Category / Role
     - Assigned Team badge
     - Mobile Phone & Email
     - Prominent callout notification instructing them to proceed to the counter to collect their **Name Tag**, **Team Wristband**, and **Official Receipt**.
   - State is preserved in browser storage so refreshing or navigating back keeps their verification card displayed.
3. **Event QR Signage Switcher**:
   - The topbar "Event QR Codes" modal allows admins to toggle between **Self Check-In QR** (`checkin.html`) and **Feedback QR** (`feedback.html`) with print options.
